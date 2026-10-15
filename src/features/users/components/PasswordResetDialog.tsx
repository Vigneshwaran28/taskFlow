"use client";
import { useState, type FormEvent } from "react";
import { ChevronRight, KeyRound, Link2, TriangleAlert } from "lucide-react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { CopyButton, usePasswordRule } from "@/features/auth";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/dates";
import { useCreateResetLink, useResetUserPassword } from "../hooks/useUsers";

export type PasswordResetMode = "choose" | "link" | "temporary";

export interface PasswordResetDialogProps {
  user: { id: number; name: string; email: string };
  /** "choose" offers both options; the others open one directly */
  mode?: PasswordResetMode;
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { value: "1", label: "1 hour" },
  { value: "24", label: "24 hours" },
  { value: "72", label: "72 hours" },
];

/** Feature component: reset someone's password with a one-time link or a temporary password. Mount with a `key` to reset. */
export function PasswordResetDialog({ user, mode = "choose", onClose }: PasswordResetDialogProps) {
  const [step, setStep] = useState<PasswordResetMode>(mode);
  if (step === "link") return <ResetLinkStep user={user} onClose={onClose} />;
  if (step === "temporary") return <TemporaryPasswordStep user={user} onClose={onClose} />;

  const options = [
    { step: "link" as const, icon: Link2, title: "Create a reset link", text: "A one-time link they open to choose their own password. You share it with them." },
    { step: "temporary" as const, icon: KeyRound, title: "Set a temporary password", text: "You pick a password and tell them; they choose their own at next sign-in." },
  ];
  return (
    <Dialog open onClose={onClose} size="sm" title={`Reset ${user.name}'s password`} description={user.email}>
      <ul className="flex flex-col gap-2">
        {options.map(({ step: next, icon: Icon, title, text }) => (
          <li key={next}>
            <button
              type="button"
              onClick={() => setStep(next)}
              className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="rounded-lg bg-primary/10 p-2 text-primary">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{title}</span>
                <span className="block text-xs text-muted-foreground">{text}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

function ResetLinkStep({ user, onClose }: Omit<PasswordResetDialogProps, "mode">) {
  const createLink = useCreateResetLink();
  const [hours, setHours] = useState("24");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (createLink.isPending) return;
    createLink.mutate({ id: user.id, expiresInHours: Number(hours) });
  }

  const link = createLink.data;
  if (link) {
    const fullUrl = `${window.location.origin}${link.url}`;
    return (
      <Dialog open onClose={onClose} title="Reset link ready" description={`Send this to ${user.name} (${user.email}).`} footer={<Button onClick={onClose}>Done</Button>}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <TextField label="Reset link" id="reset-link-url" readOnly value={fullUrl} className="flex-1" onFocus={event => event.currentTarget.select()} />
            <CopyButton text={fullUrl} label={`Copy reset link for ${user.name}`} size="md" />
          </div>
          <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <p>
              It can be used <strong>once</strong> and expires {formatDateTime(link.expiresAt)}. It&apos;s shown only now: copy it before closing. Any earlier link for {user.name} no longer works.
            </p>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title="Create a reset link"
      description={`${user.name} opens it to choose a new password. Their current password keeps working until then.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="reset-link-form" loading={createLink.isPending}>
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Create link
          </Button>
        </>
      }
    >
      <form id="reset-link-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formErrorOf(createLink.error)} />
        <SelectField
          label="Link expires after"
          id="reset-link-expiry"
          options={EXPIRY_OPTIONS}
          value={hours}
          error={fieldErrorsOf(createLink.error).expiresInHours}
          onChange={event => {
            setHours(event.target.value);
            if (createLink.error) createLink.reset();
          }}
        />
      </form>
    </Dialog>
  );
}

function TemporaryPasswordStep({ user, onClose }: Omit<PasswordResetDialogProps, "mode">) {
  const toast = useToast();
  const resetPassword = useResetUserPassword();
  const passwordRule = usePasswordRule();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (resetPassword.isPending) return;
    const problem = passwordRule.problem(password);
    if (problem) {
      setError(problem);
      return;
    }
    resetPassword.mutate(
      { id: user.id, password },
      {
        onSuccess: () => {
          toast.success("Temporary password set", `${user.name} must choose a new one at next sign-in.`);
          onClose();
        },
        onError: err => setError(fieldErrorsOf(err).password ?? err.message),
      }
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title="Set a temporary password"
      description={`${user.name} (${user.email})`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="temporary-password-form" loading={resetPassword.isPending}>
            Set password
          </Button>
        </>
      }
    >
      <form id="temporary-password-form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Temporary password"
          id="temporary-password"
          type="text"
          autoComplete="new-password"
          autoFocus
          value={password}
          error={error}
          hint="Their current password stops working; they choose a new one at next sign-in."
          onChange={event => {
            setPassword(event.target.value);
            setError("");
          }}
        />
      </form>
    </Dialog>
  );
}
