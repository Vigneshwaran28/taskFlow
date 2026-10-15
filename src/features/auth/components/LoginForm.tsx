"use client";
import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "@/components/navigation/Link";
import { FormAlert } from "@/components/shared/States";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError, fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import type { SessionUser } from "@/types/session";
import { useLogin } from "../hooks/useAuth";
import { rememberWorkspace, workspaceLoginPath } from "../utils/rememberedWorkspace";
import { ForgotPasswordDialog } from "./ForgotPasswordDialog";

const EMAIL = /^\S+@\S+\.\S+$/;

/** A workspace offered when one email and password fit accounts in several workspaces. */
export interface WorkspaceChoice {
  slug: string;
  siteTitle: string;
}

/**
 * The workspaces of a 409 CHOOSE_WORKSPACE sign-in answer (sent only after the password checked out), or null.
 */
export function workspaceChoicesOf(error: unknown): WorkspaceChoice[] | null {
  if (!(error instanceof ApiError) || error.code !== "CHOOSE_WORKSPACE") return null;
  const list = (error.data as { workspaces?: unknown } | null)?.workspaces;
  if (!Array.isArray(list)) return null;
  return list.filter((item): item is WorkspaceChoice => Boolean(item) && typeof item.slug === "string" && typeof item.siteTitle === "string");
}

function ChooseWorkspace({ choices, pending, from, onPick }: { choices: WorkspaceChoice[]; pending: string | null; from?: string | null; onPick: (slug: string) => void }) {
  return (
    <div role="alert" data-tf="choose-workspace" className="flex flex-col gap-3 rounded-xl border bg-accent/40 p-4">
      <p className="text-sm font-medium text-foreground">This email is in more than one workspace — pick one</p>
      <ul className="flex flex-col gap-2">
        {choices.map(choice => (
          <li key={choice.slug} className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="min-w-0 flex-1 justify-start" loading={pending === choice.slug} disabled={Boolean(pending)} onClick={() => onPick(choice.slug)} data-workspace={choice.slug}>
              <span className="truncate">Sign in to {choice.siteTitle}</span>
            </Button>
            <Link
              href={`${workspaceLoginPath(choice.slug)}${from ? `?from=${encodeURIComponent(from)}` : ""}`}
              className="shrink-0 rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              /{choice.slug}/login
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface LoginFormProps {
  onSuccess: (user: SessionUser | null) => void;
  /** Workspace slug when signing in on that workspace's own page: accounts of other workspaces are refused. */
  workspace?: string;
  /** The page to return to (passed along on links to a workspace's own sign-in page). */
  from?: string | null;
}

export function LoginForm({ onSuccess, workspace, from }: LoginFormProps) {
  const login = useLogin();
  const [values, setValues] = useState({ email: "", password: "" });
  const [clientErrors, setClientErrors] = useState<{ email?: string; password?: string }>({});
  const [forgotOpen, setForgotOpen] = useState(false);
  // Several workspaces accepted this email and password: kept until the person edits the form again.
  const [choices, setChoices] = useState<WorkspaceChoice[] | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const errors = { ...fieldErrorsOf(login.error), ...clientErrors };
  const formError = workspaceChoicesOf(login.error) ? null : formErrorOf(login.error);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues(current => ({ ...current, [name]: value }));
    setClientErrors(current => ({ ...current, [name]: undefined }));
    setChoices(null);
    if (login.error) login.reset();
  }

  function signIn(email: string, slug: string | undefined) {
    login.mutate(
      { email, password: values.password, ...(slug ? { workspace: slug } : {}) },
      {
        onSuccess: user => {
          setPicking(null);
          // Sign-out and expired sessions come back to this workspace's own page.
          rememberWorkspace(slug ?? user?.tenant?.slug);
          onSuccess(user);
        },
        onError: error => {
          setPicking(null);
          const offered = workspaceChoicesOf(error);
          if (offered) setChoices(offered);
        },
      }
    );
  }

  function pickWorkspace(slug: string) {
    if (login.isPending) return;
    setPicking(slug);
    signIn(values.email.trim(), slug);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (login.isPending) return;
    const email = values.email.trim();
    const nextErrors: { email?: string; password?: string } = {};
    if (!email) nextErrors.email = "Email is required.";
    else if (!EMAIL.test(email)) nextErrors.email = "Enter a valid email address.";
    if (!values.password) nextErrors.password = "Password is required.";
    setClientErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setChoices(null);
    signIn(email, workspace);
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formError} />
        {choices && !workspace && <ChooseWorkspace choices={choices} pending={picking} from={from} onPick={pickWorkspace} />}
        <TextField label="Email" name="email" type="email" autoComplete="email" autoFocus value={values.email} error={errors.email} onChange={handleChange} />
        <div className="flex flex-col gap-1.5">
          <TextField label="Password" name="password" type="password" autoComplete="current-password" value={values.password} error={errors.password} onChange={handleChange} />
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="self-end rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Forgot password?
          </button>
        </div>
        <Button type="submit" size="lg" loading={login.isPending} className="mt-1 w-full">
          Sign in
        </Button>
      </form>
      <ForgotPasswordDialog open={forgotOpen} onClose={() => setForgotOpen(false)} workspace={workspace} />
    </>
  );
}
