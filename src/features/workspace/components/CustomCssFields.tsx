"use client";
// Settings → Branding (and the provider console's tenant dialog): the workspace's own CSS for its sign-in page and for
// the signed-in app, and whether people may add their own. The same rules as the server (utils/customCss.ts) are checked
// as you type; the sign-in block is previewed live.
import { useId, useMemo } from "react";
import { Code2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoginTemplateView, loginPreviewWorkspace } from "@/features/auth";
import { cn } from "@/lib/cn";
import type { FeatureKey, WorkspaceSettings } from "@/types/session";
import { bracesBalanced, CSS_HOOKS, CUSTOM_CSS_MAX, CUSTOM_CSS_RULES, customCssProblem, EXAMPLE_APP_CSS, EXAMPLE_LOGIN_CSS, lineCount } from "../utils/customCss";

type CssBlock = "login" | "app";
type BrandingSettings = WorkspaceSettings["branding"];

const EMPTY = Object.freeze({ login: "", app: "" });

/** Problems with either block, by block (empty when both are fine). Used before saving. */
export function customCssErrors(branding: Partial<BrandingSettings>): Partial<Record<CssBlock, string>> {
  const css = branding.customCss ?? EMPTY;
  const errors: Partial<Record<CssBlock, string>> = {};
  const login = customCssProblem(css.login);
  const app = customCssProblem(css.app);
  if (login) errors.login = login;
  if (app) errors.app = app;
  return errors;
}

function CssTextarea({ id, label, hint, value, error, example, onChange }: { id: string; label: string; hint: string; value: string; error?: string; example: string; onChange: (next: string) => void }) {
  const lines = lineCount(value);
  const over = value.length > CUSTOM_CSS_MAX;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <Button variant="ghost" size="sm" onClick={() => onChange(value.trim() ? `${value.replace(/\s*$/, "")}\n\n${example}` : example)} data-css-example={id}>
          <Code2 className="h-4 w-4" aria-hidden="true" />
          Insert example
        </Button>
      </div>
      <textarea
        id={id}
        rows={10}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        wrap="off"
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-meta`}
        onChange={event => onChange(event.target.value)}
        className={cn(
          "min-h-40 w-full resize-y rounded-lg border border-input bg-card px-3 py-2 font-mono text-xs leading-5 shadow-sm [tab-size:2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          error && "border-destructive"
        )}
      />
      <div id={`${id}-meta`} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-xs">
        {error ? (
          <p className="text-destructive" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-muted-foreground">{hint}</p>
        )}
        <p className={cn("shrink-0 tabular-nums", over ? "text-destructive" : "text-muted-foreground")} data-css-count={id}>
          {lines} {lines === 1 ? "line" : "lines"} · {value.length.toLocaleString("en-US")} / {CUSTOM_CSS_MAX.toLocaleString("en-US")}
        </p>
      </div>
    </div>
  );
}

export interface CustomCssFieldsProps {
  value: BrandingSettings;
  onChange: (value: BrandingSettings) => void;
  /** The workspace's address (for the hints and preview); empty while a new tenant has none yet */
  slug?: string;
  workspaceName: string;
  companyName?: string;
  features?: readonly FeatureKey[];
  /** Server errors for each block (e.g. stored CSS that newer rules refuse); the live check wins */
  errors?: Partial<Record<CssBlock, string | undefined>>;
}

const NO_FEATURES: readonly FeatureKey[] = [];

export function CustomCssFields({ value, onChange, slug: slugProp, workspaceName, companyName, features = NO_FEATURES, errors: serverErrors = {} }: CustomCssFieldsProps) {
  const id = useId();
  const slug = slugProp || "your-workspace";
  const css = value.customCss ?? EMPTY;
  const enabled = Boolean(value.customCssEnabled);
  const live = customCssErrors(value);
  const errors: Partial<Record<CssBlock, string>> = { login: live.login ?? serverErrors.login, app: live.app ?? serverErrors.app };
  const setBlock = (block: CssBlock, next: string) => onChange({ ...value, customCss: { ...css, [block]: next } });

  const previewId = useMemo(() => id.replace(/[^a-zA-Z0-9_-]/g, ""), [id]);
  const previewable = Boolean(css.login.trim()) && !errors.login && bracesBalanced(css.login);
  const previewWorkspace = loginPreviewWorkspace({ branding: value, slug, name: workspaceName, companyName, features });

  return (
    <fieldset className="flex flex-col gap-4 rounded-xl border p-4" data-tf-editor="custom-css">
      <legend className="px-1 text-sm font-semibold">Custom CSS</legend>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={event => onChange({ ...value, customCssEnabled: event.target.checked, customCss: css })}
          className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
          data-css-toggle
        />
        <span>
          <span className="block text-sm font-medium">Use custom CSS</span>
          <span className="block text-xs text-muted-foreground">Applies the blocks below on your sign-in page and for everyone signed in. Off = nothing is added.</span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={value.allowUserCss !== false}
          onChange={event => onChange({ ...value, allowUserCss: event.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
          data-user-css-toggle
        />
        <span>
          <span className="block text-sm font-medium">Let people add their own CSS</span>
          <span className="block text-xs text-muted-foreground">
            Each person can restyle their own screen in Settings → Appearance (same rules, applied after yours). Off = personal CSS is ignored and can&apos;t be saved.
          </span>
        </span>
      </label>

      <div className="flex gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p>
            This CSS runs on every member&apos;s screen and on the page where people type their password, so some things aren&apos;t allowed: {CUSTOM_CSS_RULES.join("; ")}.
          </p>
          <p>
            <span className="font-medium text-foreground">Safe mode:</span> if your CSS breaks a page, open it with <code className="rounded bg-card px-1 font-mono">?nocss=1</code> (e.g.{" "}
            <code className="break-all rounded bg-card px-1 font-mono">/{slug}/settings?nocss=1</code>) to skip custom CSS in that browser tab, fix it here, then use{" "}
            <code className="rounded bg-card px-1 font-mono">?nocss=0</code> to turn it back on.
          </p>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium">Selectors you can target</p>
        <ul className="grid gap-1 text-xs sm:grid-cols-2" data-css-hooks>
          {CSS_HOOKS.map(hook => (
            <li key={hook.selector} className="flex min-w-0 flex-col rounded-md border px-2.5 py-1.5">
              <code className="truncate font-mono text-foreground">{hook.selector}</code>
              <span className="text-muted-foreground">
                {hook.where}: {hook.what}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <CssTextarea
        id={`${id}-login`}
        label="Sign-in page CSS"
        hint={`Applied on /${slug}/login.`}
        value={css.login}
        error={errors.login}
        example={EXAMPLE_LOGIN_CSS}
        onChange={next => setBlock("login", next)}
      />

      <figure className="flex flex-col gap-1.5">
        <figcaption className="text-xs font-medium text-muted-foreground">
          Sign-in page preview with your CSS{!enabled && css.login.trim() ? " (custom CSS is off, so the real page won't use it yet)" : ""}
        </figcaption>
        {/* The CSS is nested under this preview only, so it can't restyle the settings page. */}
        {previewable && <style data-tenant-css="preview">{`[data-tf-css-preview="${previewId}"] {\n${css.login}\n}`}</style>}
        <div data-tf-css-preview={previewId}>
          <LoginTemplateView workspace={previewWorkspace} preview />
        </div>
        {css.login.trim() && !previewable && !errors.login && <p className="text-xs text-warning">Preview paused: check that every {"{"} has a matching {"}"}.</p>}
      </figure>

      <CssTextarea
        id={`${id}-app`}
        label="App CSS"
        hint="Applied on every page inside the workspace, for everyone signed in."
        value={css.app}
        error={errors.app}
        example={EXAMPLE_APP_CSS}
        onChange={next => setBlock("app", next)}
      />
    </fieldset>
  );
}
