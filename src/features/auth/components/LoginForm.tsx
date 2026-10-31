"use client";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, KeyRound } from "lucide-react";
import Link from "@/components/navigation/Link";
import { FormAlert } from "@/components/shared/States";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError, fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import type { SessionUser } from "@/types/session";
import { useCodeLogin, useLogin } from "../hooks/useAuth";
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

export type LoginMethod = "email" | "code";

export interface LoginFormProps {
  onSuccess: (user: SessionUser | null) => void;
  /** Workspace slug when signing in on that workspace's own page: accounts of other workspaces are refused. */
  workspace?: string;
  /** The page to return to (passed along on links to a workspace's own sign-in page). */
  from?: string | null;
  /** Initial login method tab ("email" | "code") */
  initialMethod?: LoginMethod;
}

export function LoginForm({ onSuccess, workspace, from, initialMethod }: LoginFormProps) {
  const searchParams = useSearchParams();
  const codeParam = searchParams?.get("code") || "";
  const tabParam = searchParams?.get("tab");

  const login = useLogin();
  const codeLogin = useCodeLogin();

  const [method, setMethod] = useState<LoginMethod>(() => {
    if (codeParam || tabParam === "code") return "code";
    return initialMethod ?? "email";
  });

  // Separate form state for Email & Password
  const [emailValues, setEmailValues] = useState({ email: "", password: "" });
  const [emailErrors, setEmailErrors] = useState<{ email?: string; password?: string }>({});

  // Separate form state for CodeKey & Password
  const [codeValues, setCodeValues] = useState({ code: codeParam, password: "" });
  const [codeErrors, setCodeErrors] = useState<{ code?: string; password?: string }>({});

  const [forgotOpen, setForgotOpen] = useState(false);
  const [choices, setChoices] = useState<WorkspaceChoice[] | null>(null);
  const [picking, setPicking] = useState<string | null>(null);

  const emailApiErrors = fieldErrorsOf(login.error);
  const activeEmailErrors = { ...emailApiErrors, ...emailErrors };
  const emailFormError = workspaceChoicesOf(login.error) ? null : formErrorOf(login.error);

  const codeApiErrors = fieldErrorsOf(codeLogin.error);
  const activeCodeErrors = { ...codeApiErrors, ...codeErrors };
  const codeFormError = formErrorOf(codeLogin.error);

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    // Auto-switch to CodeKey tab if user enters a codeKey (e.g. TF-XXXXXX) in email input
    if (name === "email" && (value.trim().toUpperCase().startsWith("TF-") || /^\d{6}$/.test(value.trim()))) {
      setMethod("code");
      setCodeValues(curr => ({ ...curr, code: value.trim().toUpperCase() }));
      login.reset();
      return;
    }
    setEmailValues(current => ({ ...current, [name]: value }));
    setEmailErrors(current => ({ ...current, [name]: undefined }));
    setChoices(null);
    if (login.error) login.reset();
  }

  function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    const finalVal = name === "code" ? value.toUpperCase() : value;
    setCodeValues(current => ({ ...current, [name]: finalVal }));
    setCodeErrors(current => ({ ...current, [name]: undefined }));
    if (codeLogin.error) codeLogin.reset();
  }

  function signIn(email: string, slug: string | undefined) {
    login.mutate(
      { email, password: emailValues.password, ...(slug ? { workspace: slug } : {}) },
      {
        onSuccess: user => {
          setPicking(null);
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
    if (login.isPending || codeLogin.isPending) return;
    setPicking(slug);
    signIn(emailValues.email.trim(), slug);
  }

  function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    if (login.isPending) return;
    const inputVal = emailValues.email.trim();

    if (inputVal.toUpperCase().startsWith("TF-") || /^\d{6}$/.test(inputVal)) {
      setMethod("code");
      setCodeValues(curr => ({ ...curr, code: inputVal.toUpperCase() }));
      return;
    }

    const nextErrors: { email?: string; password?: string } = {};
    if (!inputVal) {
      nextErrors.email = "Email is required.";
    } else if (!EMAIL.test(inputVal)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!emailValues.password) {
      nextErrors.password = "Password is required.";
    }
    setEmailErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setChoices(null);
    signIn(inputVal, workspace);
  }

  function handleCodeSubmit(event: FormEvent) {
    event.preventDefault();
    if (codeLogin.isPending) return;
    const cleanCode = codeValues.code.trim().toUpperCase();
    if (!cleanCode) {
      setCodeErrors({ code: "Login key code is required." });
      return;
    }

    codeLogin.mutate(
      { code: cleanCode, password: codeValues.password || undefined },
      {
        onSuccess: user => {
          rememberWorkspace(workspace ?? user?.tenant?.slug);
          onSuccess(user);
        },
        onError: err => {
          const msg = formErrorOf(err) || err.message;
          if (msg.toLowerCase().includes("password")) {
            setCodeErrors({ password: msg });
          } else {
            setCodeErrors({ code: msg });
          }
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Separate Login Tabs */}
      <div
        role="tablist"
        aria-label="Login methods"
        className="grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 text-xs font-medium"
      >
        <button
          type="button"
          role="tab"
          id="tab-email-login"
          aria-selected={method === "email"}
          aria-controls="panel-email-login"
          tabIndex={method === "email" ? 0 : -1}
          onClick={() => {
            setMethod("email");
            if (codeLogin.error) codeLogin.reset();
          }}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all select-none touch-manipulation cursor-pointer",
            method === "email"
              ? "bg-background text-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-background/40"
          )}
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          <span>Email &amp; Password</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-code-login"
          aria-selected={method === "code"}
          aria-controls="panel-code-login"
          tabIndex={method === "code" ? 0 : -1}
          onClick={() => {
            setMethod("code");
            if (login.error) login.reset();
          }}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all select-none touch-manipulation cursor-pointer",
            method === "code"
              ? "bg-background text-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-background/40"
          )}
        >
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          <span>CodeKey &amp; Password</span>
        </button>
      </div>

      {/* Mode 1: Email & Password */}
      {method === "email" && (
        <form
          onSubmit={handleEmailSubmit}
          noValidate
          id="panel-email-login"
          role="tabpanel"
          aria-labelledby="tab-email-login"
          className="flex flex-col gap-4"
        >
          <FormAlert message={emailFormError} />
          {choices && !workspace && (
            <ChooseWorkspace choices={choices} pending={picking} from={from} onPick={pickWorkspace} />
          )}
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@company.com"
            value={emailValues.email}
            error={activeEmailErrors.email}
            onChange={handleEmailChange}
          />
          <div className="flex flex-col gap-1.5">
            <TextField
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={emailValues.password}
              error={activeEmailErrors.password}
              onChange={handleEmailChange}
            />
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="self-end rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
          <Button
            type="submit"
            size="lg"
            loading={login.isPending}
            className="mt-1 w-full"
            data-testid="email-signin-btn"
          >
            Sign in
          </Button>
        </form>
      )}

      {/* Mode 2: CodeKey & Password */}
      {method === "code" && (
        <form
          onSubmit={handleCodeSubmit}
          noValidate
          id="panel-code-login"
          role="tabpanel"
          aria-labelledby="tab-code-login"
          className="flex flex-col gap-4"
        >
          <FormAlert message={codeFormError} />
          <TextField
            label="CodeKey (Login Access Code)"
            name="code"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            autoFocus
            placeholder="e.g. TF-491297"
            value={codeValues.code}
            error={activeCodeErrors.code}
            onChange={handleCodeChange}
          />
          <div className="flex flex-col gap-1.5">
            <TextField
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Password (optional for first login)"
              hint="Optional if signing in with your access code for the first time"
              value={codeValues.password}
              error={activeCodeErrors.password}
              onChange={handleCodeChange}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            loading={codeLogin.isPending}
            className="mt-1 w-full"
            data-testid="code-signin-btn"
          >
            Sign in with CodeKey
          </Button>
        </form>
      )}

      <ForgotPasswordDialog open={forgotOpen} onClose={() => setForgotOpen(false)} workspace={workspace} />
    </div>
  );
}
