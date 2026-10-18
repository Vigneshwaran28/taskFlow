"use client";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Link from "@/components/navigation/Link";
import { useParams } from "next/navigation";
import { CircleCheck, KeyRound, LinkIcon } from "lucide-react";
import { FormAlert, LoadingState } from "@/components/shared/States";
import { Button, buttonClass } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError, fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { AuthLayout } from "../components/AuthLayout";
import { WorkspaceAuthShell } from "../components/WorkspaceAuthShell";
import { useResetLink, useResetPassword } from "../hooks/usePasswordReset";
import type { PasswordRule } from "../services/passwordResetService";
import { workspaceLoginPath } from "../utils/rememberedWorkspace";

const EMPTY = { newPassword: "", confirm: "" };
type Values = typeof EMPTY;

const STRENGTH = [
  { label: "Too short", className: "bg-destructive", text: "text-destructive" },
  { label: "Weak", className: "bg-destructive", text: "text-destructive" },
  { label: "Fair", className: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  { label: "Good", className: "bg-primary", text: "text-primary" },
  { label: "Strong", className: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
] as const;

const DEFAULT_RULE: PasswordRule = { minLength: 8, requireMixed: false };

/** 0 (too short) to 4 (strong): length plus a mix of letter cases, digits, and symbols. */
function passwordStrength(password: string, minLength: number) {
  if (password.length < minLength) return 0;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(pattern => pattern.test(password)).length;
  const score = (password.length >= Math.max(12, minLength + 4) ? 2 : 1) + (variety >= 3 ? 2 : variety === 2 ? 1 : 0);
  return Math.min(4, score);
}

/** What the workspace requires, in words. */
const ruleText = (rule: PasswordRule) => `At least ${rule.minLength} characters${rule.requireMixed ? ", with letters and numbers" : ""}.`;

/** The workspace's rule, checked here the same way the server checks it. */
function ruleProblem(password: string, rule: PasswordRule) {
  if (password.length < rule.minLength) return `Use at least ${rule.minLength} characters.`;
  if (password.length > 128) return "Keep it under 128 characters.";
  if (rule.requireMixed && !(/[A-Za-z]/.test(password) && /\d/.test(password))) return "Use both letters and numbers.";
  return null;
}

function StrengthMeter({ password, rule }: { password: string; rule: PasswordRule }) {
  if (!password) return <span>{ruleText(rule)} Longer, with a mix of letters, numbers and symbols, is stronger.</span>;
  const score = passwordStrength(password, rule.minLength);
  const meta = STRENGTH[score];
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map(step => (
          <span key={step} className={cn("h-1.5 w-6 rounded-full", step <= Math.max(score, 1) ? meta.className : "bg-muted")} />
        ))}
      </span>
      <span className={meta.text}>{meta.label}</span>
      {score === 0 && <span>· {ruleText(rule)}</span>}
      {score > 0 && score < 3 && <span>· try a longer password or add numbers and symbols</span>}
    </span>
  );
}

/** A password field with a show / hide button. */
function PasswordField({ label, name, value, error, hint, autoFocus, onChange }: { label: string; name: keyof Values; value: string; error?: string; hint?: ReactNode; autoFocus?: boolean; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <TextField
      label={label}
      name={name}
      type="password"
      autoComplete="new-password"
      autoFocus={autoFocus}
      maxLength={128}
      hint={hint}
      value={value}
      error={error}
      onChange={onChange}
    />
  );
}

/** Public page for a one-time reset link an admin sent: /reset-password/<token>. */
export function ResetPasswordPage() {
  const { token = "" } = useParams<{ token: string }>();
  const link = useResetLink(token);
  const reset = useResetPassword();
  const [values, setValues] = useState(EMPTY);
  const [clientErrors, setClientErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const errors = { ...fieldErrorsOf(reset.error), ...clientErrors };

  if (link.isPending) {
    return (
      <AuthLayout title="Reset your password">
        <LoadingState label="Checking your link…" className="py-10" />
      </AuthLayout>
    );
  }

  // The link went bad while the form was open (used in another tab, or expired): same message as on load.
  const linkGone = reset.error instanceof ApiError && reset.error.status === 404;
  if (link.error || linkGone) {
    const notFound = linkGone || (link.error instanceof ApiError && link.error.status === 404);
    const slug = link.data?.workspace?.slug ?? null;
    return (
      <WorkspaceAuthShell slug={slug} headline="Reset your password" message="Reset links work once and expire after a few hours, so finish here before closing this page." title="This link can't be used" subtitle={notFound ? "This reset link is invalid or has expired." : "We couldn't check this link right now."}>
        <div className="flex flex-col gap-4">
          <div className="flex gap-3 rounded-xl border bg-card p-4 text-sm">
            <LinkIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-muted-foreground">
              {notFound
                ? "Reset links work once and expire after a few hours. Ask your workspace administrator for a new one, or use “Forgot password?” on the sign-in page to ask again."
                : "Check your connection and try again. If it keeps failing, ask your workspace administrator for a new link."}
            </p>
          </div>
          {!notFound && (
            <Button variant="secondary" onClick={() => void link.refetch()}>
              Try again
            </Button>
          )}
          <Link href={slug ? workspaceLoginPath(slug) : "/login"} className={buttonClass("primary", "lg", "w-full")}>
            Go to sign in
          </Link>
        </div>
      </WorkspaceAuthShell>
    );
  }

  const info = link.data;
  const slug = info.workspace?.slug ?? null;
  const rule = info.passwordRule ?? DEFAULT_RULE;
  const signInHref = slug ? workspaceLoginPath(slug) : "/login";

  if (reset.isSuccess) {
    return (
      <WorkspaceAuthShell slug={slug} headline="Reset your password" message="Reset links work once and expire after a few hours, so finish here before closing this page." title="Password changed" subtitle={`You can now sign in to ${info.workspace?.siteTitle ?? "your workspace"} with your new password.`}>
        <div className="flex flex-col gap-4" role="status">
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4 text-sm">
            <CircleCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <p>All set, {info.name}. This link has now been used and won&apos;t work again.</p>
          </div>
          <Link href={signInHref} className={buttonClass("primary", "lg", "w-full")}>
            Sign in
          </Link>
        </div>
      </WorkspaceAuthShell>
    );
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues(current => ({ ...current, [name]: value }));
    setClientErrors(current => ({ ...current, [name]: undefined }));
    if (reset.error) reset.reset();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (reset.isPending) return;
    const next: Partial<Record<keyof Values, string>> = {};
    const problem = ruleProblem(values.newPassword, rule);
    if (problem) next.newPassword = problem;
    if (values.confirm !== values.newPassword) next.confirm = "The passwords don't match.";
    setClientErrors(next);
    if (Object.keys(next).length) return;
    reset.mutate({ token, newPassword: values.newPassword });
  }

  return (
    <WorkspaceAuthShell slug={slug} headline="Reset your password" message="Reset links work once and expire after a few hours, so finish here before closing this page." title="Choose a new password" subtitle={`Hi ${info.name}, choose a new password for ${info.email}.`}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formErrorOf(reset.error)} />
        <PasswordField label="New password" name="newPassword" autoFocus hint={<StrengthMeter password={values.newPassword} rule={rule} />} value={values.newPassword} error={errors.newPassword} onChange={handleChange} />
        <PasswordField label="Confirm new password" name="confirm" value={values.confirm} error={errors.confirm} onChange={handleChange} />
        <Button type="submit" size="lg" loading={reset.isPending} className="mt-2 w-full">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          Save new password
        </Button>
        <p className="text-center text-xs text-muted-foreground">This link works once. Signing in afterwards uses your new password.</p>
        <Link href={signInHref} className="text-center text-sm font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </form>
    </WorkspaceAuthShell>
  );
}
