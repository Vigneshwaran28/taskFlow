"use client";
// "Sign-in page" settings: template, background, words, support contact, and the workspace's sign-in link.
// Used by the provider console (tenant dialog) and by workspace admins (Settings → Branding).
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Check, Copy, Plus, X } from "lucide-react";
import { MODULES } from "@/app-shell/modules";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/cn";
import type { FeatureKey } from "@/types/session";
import {
  LOGIN_BACKGROUND_KEYS,
  LOGIN_BACKGROUND_LABELS,
  LOGIN_BACKGROUNDS,
  LOGIN_LIMITS,
  LOGIN_TEMPLATES,
  LoginTemplateView,
  loginPreviewWorkspace,
  validateLoginBranding,
  type BrandingSettings,
  type LoginBrandingErrors,
} from "./login-templates";
import { workspaceLoginPath } from "../utils/rememberedWorkspace";

const subscribeNever = () => () => {};

/** This browser's origin ("" during server rendering). */
function useOrigin() {
  return useSyncExternalStore(
    subscribeNever,
    () => window.location.origin,
    () => ""
  );
}

/** The full sign-in URL of a workspace, for display and copying. */
export function useWorkspaceLoginUrl(slug: string) {
  return `${useOrigin()}${workspaceLoginPath(slug)}`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export interface CopyButtonProps {
  text: string;
  /** Accessible label, e.g. "Copy sign-in link for Acme" */
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/** Copies text to the clipboard and confirms with "Copied" for a moment. */
export function CopyButton({ text, label = "Copy link", variant = "secondary", size = "sm", className }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clear a pending reset when unmounting (timers are an external system).
  useEffect(() => () => clearTimeout(timer.current), []);

  async function handleClick() {
    const ok = await copyText(text);
    setState(ok ? "copied" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  }

  return (
    <Button variant={variant} size={size} onClick={() => void handleClick()} aria-label={state === "idle" ? label : undefined} className={className}>
      {state === "copied" ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      <span aria-live="polite">{state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy"}</span>
    </Button>
  );
}

/** A workspace's sign-in URL with a Copy button (tenant lists, settings). */
export function WorkspaceLoginLink({ slug, name, className }: { slug: string; name?: string; className?: string }) {
  const url = useWorkspaceLoginUrl(slug);
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <a href={url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground hover:text-foreground hover:underline" title={url}>
        {url}
      </a>
      <CopyButton text={url} label={`Copy sign-in link${name ? ` for ${name}` : ""}`} variant="ghost" size="sm" />
    </div>
  );
}

export interface LoginBrandingFieldsProps {
  value: BrandingSettings;
  onChange: (value: BrandingSettings) => void;
  /** The workspace address (may be empty while creating a tenant) */
  slug: string;
  /** True while the address isn't final (a new tenant): the link is shown as a preview */
  slugPending?: boolean;
  workspaceName: string;
  companyName?: string;
  /** Licensed modules: the default highlights */
  features: readonly FeatureKey[];
  /** Errors from submitting (merged over the live length checks) */
  errors?: LoginBrandingErrors;
  /** false when the caller shows the live preview itself (e.g. in a sticky side column) */
  showPreview?: boolean;
}

/** Presentational: the "Sign-in page" section of a workspace's branding. */
export function LoginBrandingFields({ value, onChange, slug, slugPending = false, workspaceName, companyName, features, errors, showPreview = true }: LoginBrandingFieldsProps) {
  const id = useId();
  const url = useWorkspaceLoginUrl(slug || "your-address");
  const set = <K extends keyof BrandingSettings>(key: K, next: BrandingSettings[K]) => onChange({ ...value, [key]: next });

  const live = validateLoginBranding(value);
  const shown: LoginBrandingErrors = { ...live, ...errors, highlightItems: { ...live.highlightItems, ...errors?.highlightItems } };
  const workspace = loginPreviewWorkspace({ branding: value, slug, name: workspaceName, companyName, features });
  const highlights = value.loginHighlights ?? [];
  const moduleLabels = features.map(key => MODULES[key]?.label).filter(Boolean);
  const background = value.loginBackground ?? "indigo";
  const template = value.loginTemplate ?? "split";

  return (
    <fieldset className="@container flex min-w-0 flex-col gap-5 rounded-xl border p-4">
      <legend className="px-1 text-sm font-medium">Sign-in page</legend>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-url`} className="text-sm font-medium">
          Sign-in link
        </label>
        <div className="flex gap-2">
          <input
            id={`${id}-url`}
            readOnly
            value={url}
            onFocus={event => event.currentTarget.select()}
            aria-describedby={`${id}-url-hint`}
            className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-muted/50 px-3 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <CopyButton text={url} label="Copy sign-in link" className="h-9" />
        </div>
        <p id={`${id}-url-hint`} className="text-xs text-muted-foreground">
          {slugPending
            ? "The final address is set when the tenant is created (made from the name if empty)."
            : "Share it with the team. Only this workspace's accounts can sign in there."}
        </p>
      </div>

      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-medium">Layout</legend>
        <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @2xl:grid-cols-3">
          {LOGIN_TEMPLATES.map(option => {
            const selected = template === option.key;
            return (
              <label
                key={option.key}
                className={cn(
                  "relative flex min-w-0 cursor-pointer flex-col gap-2 rounded-xl border p-2 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
                  selected ? "border-primary bg-accent/40" : "hover:bg-muted/60"
                )}
              >
                <input type="radio" name={`${id}-template`} value={option.key} checked={selected} onChange={() => set("loginTemplate", option.key)} className="sr-only" />
                <LoginTemplateView preview workspace={{ ...workspace, login: { ...workspace.login, template: option.key } }} />
                <span className="flex items-start justify-between gap-2 px-1">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{option.name}</span>
                    <span className="block text-xs text-muted-foreground">{option.description}</span>
                  </span>
                  {selected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Background</legend>
        <div className="flex flex-wrap gap-3">
          {LOGIN_BACKGROUND_KEYS.map(key => {
            const selected = background === key;
            return (
              <label key={key} title={LOGIN_BACKGROUND_LABELS[key]} className="relative flex w-14 cursor-pointer flex-col items-center gap-1">
                <input type="radio" name={`${id}-background`} value={key} checked={selected} onChange={() => set("loginBackground", key)} className="peer sr-only" />
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border ring-offset-2 ring-offset-card peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                    LOGIN_BACKGROUNDS[key],
                    selected && "ring-2 ring-foreground"
                  )}
                >
                  {selected && <Check className={cn("h-4 w-4", key === "plain" ? "text-foreground" : "text-white")} aria-hidden="true" />}
                </span>
                <span className={cn("text-[11px]", selected ? "font-medium text-foreground" : "text-muted-foreground")}>{LOGIN_BACKGROUND_LABELS[key]}</span>
              </label>
            );
          })}
        </div>
        {template === "minimal" && <p className="mt-2 text-xs text-muted-foreground">The minimal layout shows the background only as a thin line at the top.</p>}
      </fieldset>

      {showPreview && (
        <figure className="flex min-w-0 flex-col gap-1.5">
          <figcaption className="text-xs font-medium text-muted-foreground">Live preview</figcaption>
          <LoginTemplateView preview workspace={workspace} className="max-w-2xl shadow-sm" />
        </figure>
      )}

      <TextField
        label="Headline"
        id={`${id}-headline`}
        maxLength={LOGIN_LIMITS.headline}
        placeholder={`Sign in to ${workspace.siteTitle}`}
        hint={`Empty shows "Sign in to ${workspace.siteTitle}". ${(value.loginHeadline ?? "").length}/${LOGIN_LIMITS.headline}`}
        value={value.loginHeadline ?? ""}
        error={shown.loginHeadline}
        onChange={event => set("loginHeadline", event.target.value)}
      />
      <TextAreaField
        label="Message"
        id={`${id}-message`}
        rows={2}
        maxLength={LOGIN_LIMITS.message}
        placeholder="e.g. Welcome to the Acme staff portal."
        hint={`A short welcome under the headline. ${(value.loginMessage ?? "").length}/${LOGIN_LIMITS.message}`}
        value={value.loginMessage ?? ""}
        error={shown.loginMessage}
        onChange={event => set("loginMessage", event.target.value)}
      />

      <fieldset aria-describedby={`${id}-highlights-hint`}>
        <legend className="mb-1.5 text-sm font-medium">
          Highlights{" "}
          <span className="font-normal tabular-nums text-muted-foreground">
            ({highlights.length}/{LOGIN_LIMITS.highlights})
          </span>
        </legend>
        <p id={`${id}-highlights-hint`} className="mb-2 text-xs text-muted-foreground">
          Up to {LOGIN_LIMITS.highlights} short lines.{" "}
          {moduleLabels.length ? `Empty shows the workspace's modules (${moduleLabels.slice(0, 3).join(", ")}${moduleLabels.length > 3 ? "…" : ""}).` : "Empty shows the workspace's modules."}
        </p>
        {highlights.length > 0 && (
          <ul className="mb-2 flex flex-col gap-2">
            {highlights.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <TextField
                  aria-label={`Highlight ${index + 1}`}
                  id={`${id}-highlight-${index}`}
                  className="min-w-0 flex-1"
                  maxLength={LOGIN_LIMITS.highlight}
                  placeholder="e.g. Book rooms and equipment"
                  value={item}
                  error={shown.highlightItems?.[index]}
                  onChange={event => set("loginHighlights", highlights.map((current, at) => (at === index ? event.target.value : current)))}
                  autoFocus={index === highlights.length - 1 && !item}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-0.5"
                  aria-label={`Remove highlight ${index + 1}`}
                  onClick={() => set("loginHighlights", highlights.filter((_, at) => at !== index))}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button variant="secondary" size="sm" disabled={highlights.length >= LOGIN_LIMITS.highlights} onClick={() => set("loginHighlights", [...highlights, ""])}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {highlights.length >= LOGIN_LIMITS.highlights ? `Maximum of ${LOGIN_LIMITS.highlights} reached` : "Add highlight"}
        </Button>
        {shown.loginHighlights && <p className="mt-2 text-sm text-destructive">{shown.loginHighlights}</p>}
      </fieldset>

      <TextField
        label="Support contact"
        id={`${id}-support`}
        maxLength={LOGIN_LIMITS.supportContact}
        placeholder="e.g. it-help@acme.com or ext. 4321"
        hint="Shown under the form: who to ask for an account or a password reset. An email becomes a link."
        value={value.supportContact ?? ""}
        error={shown.supportContact}
        onChange={event => set("supportContact", event.target.value)}
      />
    </fieldset>
  );
}
