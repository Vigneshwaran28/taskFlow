"use client";
// Settings → Appearance → My custom CSS: a person's own CSS, applied after the workspace's (so it wins) and only on
// their screen. The same rules as the server are checked as you type; valid CSS is applied live while editing and
// reverts on Cancel (or on leaving the tab without saving).
import { useEffect, useId, useState } from "react";
import { Code2, ShieldCheck } from "lucide-react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { useUpdatePreferences } from "@/features/auth";
import { bracesBalanced, CSS_HOOKS, CSS_VARIABLES, CUSTOM_CSS_RULES, lineCount, TOKEN_SELECTOR, USER_CSS_MAX, USER_CSS_SNIPPETS, userCssProblem } from "@/features/workspace";
import { useTheme } from "@/hooks/useTheme";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { SaveBar } from "./SaveBar";
import { useReportUnsaved } from "./UnsavedChanges";

const APP_HOOKS = CSS_HOOKS.filter(hook => hook.where === "App");

export interface UserCssEditorProps {
  /** The saved CSS and switch (the parent keys this editor by them, so it starts over after a save) */
  savedCss: string;
  savedEnabled: boolean;
  /** False when the workspace has switched personal CSS off */
  allowed: boolean;
  workspaceSlug?: string;
}

export function UserCssEditor({ savedCss, savedEnabled, allowed, workspaceSlug }: UserCssEditorProps) {
  const id = useId();
  const toast = useToast();
  const save = useUpdatePreferences();
  const { setCssPreview } = useTheme();
  const [draft, setDraft] = useState(savedCss);
  const [enabled, setEnabled] = useState(savedEnabled);
  const dirty = draft !== savedCss || enabled !== savedEnabled;
  const problem = userCssProblem(draft);
  const balanced = bracesBalanced(draft);
  const serverError = fieldErrorsOf(save.error).customCss;
  const error = problem ?? serverError;
  const over = draft.length > USER_CSS_MAX;
  const lines = lineCount(draft);
  useReportUnsaved("user-css", allowed && dirty);

  // Live preview: while there are unsaved changes, the draft (when it's valid and complete) replaces the saved CSS.
  // Invalid or half-typed CSS keeps the last good preview. Leaving the editor reverts to the saved CSS.
  useEffect(() => {
    if (!allowed || !dirty) setCssPreview(null);
    else if (!enabled) setCssPreview("");
    else if (!problem && balanced) setCssPreview(draft);
  }, [allowed, dirty, enabled, problem, balanced, draft, setCssPreview]);
  useEffect(() => () => setCssPreview(null), [setCssPreview]);

  if (!allowed) {
    return (
      <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground" data-user-css-disabled>
        Your workspace has switched personal CSS off{savedCss.trim() ? ", so the CSS you saved isn't applied" : ""}. Ask a workspace admin if you need it.
      </p>
    );
  }

  function insert(snippet: string) {
    setDraft(current => (current.trim() ? `${current.replace(/\s*$/, "")}\n\n${snippet}` : snippet));
    setEnabled(true);
  }

  function handleSave() {
    if (problem) return;
    save.mutate(
      { customCss: draft, customCssEnabled: enabled },
      {
        onSuccess: () => {
          setCssPreview(null);
          toast.success("Your CSS is saved");
        },
      }
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4" data-tf-editor="user-css">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-input accent-primary" data-user-css-enabled />
        <span>
          <span className="block text-sm font-medium">Use my CSS</span>
          <span className="block text-xs text-muted-foreground">Only changes how TaskFlow looks for you, on every device you sign in on. Off = nothing is added.</span>
        </span>
      </label>

      <div className="flex gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-1">
          <p>Not allowed: {CUSTOM_CSS_RULES.join("; ")}. Up to {USER_CSS_MAX.toLocaleString("en-US")} characters.</p>
          <p>
            <span className="font-medium text-foreground">Safe mode:</span> if your CSS makes a page unusable, add <code className="rounded bg-card px-1 font-mono">?nocss=1</code> to the address
            {workspaceSlug ? (
              <>
                {" "}
                (e.g. <code className="break-all rounded bg-card px-1 font-mono">/{workspaceSlug}/settings?tab=appearance&amp;nocss=1</code>)
              </>
            ) : null}{" "}
            to skip all custom CSS in that tab, then fix it here.
          </p>
        </div>
      </div>

      <details className="group rounded-lg border">
        <summary className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          What you can target: page parts and design tokens
        </summary>
        <div className="flex flex-col gap-3 border-t p-3 text-xs">
          <ul className="grid gap-1 sm:grid-cols-3" data-css-hooks>
            {APP_HOOKS.map(hook => (
              <li key={hook.selector} className="flex min-w-0 flex-col rounded-md border px-2.5 py-1.5">
                <code className="truncate font-mono text-foreground">{hook.selector}</code>
                <span className="text-muted-foreground">{hook.what}</span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            Beyond colours: set these variables on <code className="break-all rounded bg-muted px-1 font-mono text-foreground">{TOKEN_SELECTOR}</code> to change them everywhere (that selector wins over
            the styles and colours in both light and dark mode).
          </p>
          <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[auto_minmax(0,1fr)]" data-css-variables>
            {CSS_VARIABLES.map(variable => (
              <div key={variable.name} className="contents">
                <dt>
                  <code className="font-mono text-foreground">{variable.name}</code>
                </dt>
                <dd className="text-muted-foreground">{variable.what}</dd>
              </div>
            ))}
          </dl>
        </div>
      </details>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium">Starting points</p>
        <div className="flex flex-wrap gap-1.5">
          {USER_CSS_SNIPPETS.map(snippet => (
            <Button key={snippet.label} variant="secondary" size="sm" onClick={() => insert(snippet.css)} data-css-snippet={snippet.label}>
              <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
              {snippet.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-css`} className="text-sm font-medium">
          My CSS
        </label>
        <textarea
          id={`${id}-css`}
          rows={12}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          wrap="off"
          value={draft}
          placeholder={`${TOKEN_SELECTOR} {\n  --radius-xl: 1.25rem;\n}`}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-meta`}
          onChange={event => {
            setDraft(event.target.value);
            if (save.error) save.reset();
          }}
          className={cn(
            "min-h-48 w-full resize-y rounded-lg border border-input bg-card px-3 py-2 font-mono text-xs leading-5 shadow-sm [tab-size:2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            error && "border-destructive"
          )}
          data-user-css-input
        />
        <div id={`${id}-meta`} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-xs">
          {error ? (
            <p className="text-destructive" role="alert" data-user-css-error>
              {error}
            </p>
          ) : (
            <p className="text-muted-foreground">
              {dirty && enabled && !balanced ? `Preview paused: check that every { has a matching }.` : dirty ? "Previewing on this page. Save to keep it, or Cancel to undo." : "Applied after your workspace's CSS."}
            </p>
          )}
          <p className={cn("shrink-0 tabular-nums", over ? "text-destructive" : "text-muted-foreground")} data-user-css-count>
            {lines} {lines === 1 ? "line" : "lines"} · {draft.length.toLocaleString("en-US")} / {USER_CSS_MAX.toLocaleString("en-US")}
          </p>
        </div>
      </div>

      <FormAlert message={serverError ? null : formErrorOf(save.error)} />
      <SaveBar dirty={dirty}>
        <Button variant="ghost" onClick={() => setDraft("")} disabled={!draft || save.isPending}>
          Clear
        </Button>
        <Button
          variant="ghost"
          disabled={!dirty || save.isPending}
          onClick={() => {
            setDraft(savedCss);
            setEnabled(savedEnabled);
            save.reset();
          }}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} loading={save.isPending} disabled={!dirty || Boolean(problem)}>
          Save my CSS
        </Button>
      </SaveBar>
    </div>
  );
}
