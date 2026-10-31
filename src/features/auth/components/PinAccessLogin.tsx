"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, KeyRound, UserPlus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { FormAlert } from "@/components/shared/States";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import type { SessionUser } from "@/types/session";
import { useCodeLogin, useRegisterWithCode, useVerifyAccessCode } from "../hooks/useAuth";
import { rememberWorkspace } from "../utils/rememberedWorkspace";

export interface PinAccessLoginProps {
  onSuccess: (user: SessionUser | null) => void;
  from?: string | null;
}

type Mode = "verify" | "login" | "register";

export function PinAccessLogin({ onSuccess }: PinAccessLoginProps) {
  const verify = useVerifyAccessCode();
  const codeLogin = useCodeLogin();
  const registerWithCode = useRegisterWithCode();

  const [mode, setMode] = useState<Mode>("verify");
  const [code, setCode] = useState("");
  const [tenant, setTenant] = useState<{ id: number; name: string; slug: string } | null>(null);

  // Form fields for login & register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const [clientError, setClientError] = useState<string | null>(null);

  const activeMutation = mode === "verify" ? verify : mode === "login" ? codeLogin : registerWithCode;
  const formError = clientError || formErrorOf(activeMutation.error);
  const errors = fieldErrorsOf(activeMutation.error);

  function handleVerify(e: FormEvent) {
    e.preventDefault();
    setClientError(null);
    const cleanCode = code.trim();
    if (!cleanCode) {
      setClientError("Enter your workspace security PIN or personal login access code.");
      return;
    }

    verify.mutate(cleanCode, {
      onSuccess: data => {
        setTenant(data.tenant);
        rememberWorkspace(data.tenant.slug);
        if (data.type === "user" && data.user) {
          setEmail(data.user.email);
          // Directly log in user with their personal login access code
          codeLogin.mutate(
            { code: cleanCode },
            {
              onSuccess: user => {
                rememberWorkspace(data.tenant.slug ?? user?.tenant?.slug);
                onSuccess(user);
              },
              onError: () => {
                // If password is required by security policy, gracefully switch to password input
                setMode("login");
              },
            }
          );
        } else {
          setMode("login");
        }
      },
    });
  }

  function handleLogin(e: FormEvent) {
    e.preventDefault();
    setClientError(null);
    if (!email.trim()) {
      setClientError("Email is required.");
      return;
    }

    codeLogin.mutate(
      { code: code.trim(), email: email.trim(), password: password || undefined },
      {
        onSuccess: user => {
          rememberWorkspace(tenant?.slug ?? user?.tenant?.slug);
          onSuccess(user);
        },
      }
    );
  }

  function handleRegister(e: FormEvent) {
    e.preventDefault();
    setClientError(null);
    if (!name.trim()) {
      setClientError("Full name is required.");
      return;
    }
    if (!email.trim()) {
      setClientError("Email is required.");
      return;
    }
    if (!password || password.length < 8) {
      setClientError("Password must be at least 8 characters.");
      return;
    }

    registerWithCode.mutate(
      {
        code: code.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
        jobTitle: jobTitle.trim() || null,
      },
      {
        onSuccess: user => {
          rememberWorkspace(tenant?.slug ?? user?.tenant?.slug);
          onSuccess(user);
        },
      }
    );
  }

  function resetToVerify() {
    setMode("verify");
    setTenant(null);
    setClientError(null);
    verify.reset();
    codeLogin.reset();
    registerWithCode.reset();
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 border-b pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">Workspace PIN & Login Code Access</h2>
          <p className="text-xs text-muted-foreground truncate">
            {tenant ? `Connected to ${tenant.name}` : "Sign in directly with your login code or workspace PIN"}
          </p>
        </div>
      </div>

      <FormAlert message={formError} />

      {/* STEP 1: Enter & Verify Code */}
      {mode === "verify" && (
        <form onSubmit={handleVerify} noValidate className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="access-pin-input" className="text-xs font-medium text-foreground">
              Security PIN or Login Key Code
            </label>
            <input
              id="access-pin-input"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="e.g. TF-749210"
              value={code}
              onChange={e => {
                setCode(e.target.value.toUpperCase());
                setClientError(null);
                if (verify.error) verify.reset();
              }}
              className="h-10 rounded-lg border border-input bg-background px-3 font-mono text-base font-semibold tracking-wider text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Enter your personal TF-XXXXXX login key code or your workspace security PIN.
            </p>
          </div>

          <Button type="submit" size="md" loading={verify.isPending || codeLogin.isPending} className="mt-1 w-full">
            <span>Sign in with Code</span>
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
      )}

      {/* STEP 2: Tenant Found -> Login or Register */}
      {tenant && mode !== "verify" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <div className="truncate">
                <span className="font-semibold text-foreground">{tenant.name}</span>
                <span className="text-muted-foreground ml-1.5 font-mono">({code})</span>
              </div>
            </div>
            <button
              type="button"
              onClick={resetToVerify}
              className="shrink-0 text-xs font-medium text-primary hover:underline select-none touch-manipulation cursor-pointer p-1 active:scale-95 transition-all"
            >
              Change
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setClientError(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-md py-2 select-none touch-manipulation cursor-pointer transition-all active:scale-95 ${
                mode === "login"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Existing Member</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setClientError(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-md py-2 select-none touch-manipulation cursor-pointer transition-all active:scale-95 ${
                mode === "register"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Join / Register</span>
            </button>
          </div>

          {/* Subform: Login */}
          {mode === "login" && (
            <form onSubmit={handleLogin} noValidate className="flex flex-col gap-3">
              <TextField
                label="Account Email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                error={errors.email}
                onChange={e => {
                  setEmail(e.target.value);
                  setClientError(null);
                }}
              />
              <TextField
                label="Password (optional if authenticating via PIN)"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                error={errors.password}
                onChange={e => {
                  setPassword(e.target.value);
                  setClientError(null);
                }}
              />
              <Button type="submit" size="md" loading={codeLogin.isPending} className="mt-1 w-full">
                Sign in to {tenant.name}
              </Button>
            </form>
          )}

          {/* Subform: Register with PIN */}
          {mode === "register" && (
            <form onSubmit={handleRegister} noValidate className="flex flex-col gap-3">
              <TextField
                label="Full Name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                value={name}
                error={errors.name}
                onChange={e => {
                  setName(e.target.value);
                  setClientError(null);
                }}
              />
              <TextField
                label="Work Email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="jane@company.com"
                value={email}
                error={errors.email}
                onChange={e => {
                  setEmail(e.target.value);
                  setClientError(null);
                }}
              />
              <TextField
                label="Create Password (8+ characters)"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                error={errors.password}
                onChange={e => {
                  setPassword(e.target.value);
                  setClientError(null);
                }}
              />
              <TextField
                label="Job Title (optional)"
                name="jobTitle"
                type="text"
                placeholder="e.g. Product Designer"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
              />
              <Button type="submit" size="md" loading={registerWithCode.isPending} className="mt-1 w-full">
                Create Account in {tenant.name}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
