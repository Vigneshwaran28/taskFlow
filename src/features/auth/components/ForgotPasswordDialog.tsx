"use client";
// Asks for an email and tells the workspace admins; they send a one-time reset link. The answer is the same
// whether or not the account exists, so this form can't be used to find accounts.
import { useState, type FormEvent } from "react";
import { MailCheck, Send } from "lucide-react";
import { FormAlert } from "@/components/shared/States";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { useForgotPassword } from "../hooks/usePasswordReset";

export interface ForgotPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  /** The workspace slug when opened from a workspace's own sign-in page */
  workspace?: string;
}

export function ForgotPasswordDialog({ open, onClose, workspace }: ForgotPasswordDialogProps) {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const error = emailError || fieldErrorsOf(forgot.error).email;

  function handleClose() {
    setEmail("");
    setEmailError("");
    forgot.reset();
    onClose();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (forgot.isPending) return;
    const value = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    forgot.mutate({ email: value, ...(workspace ? { workspace } : {}) });
  }

  if (forgot.isSuccess) {
    return (
      <Dialog
        open={open}
        onClose={handleClose}
        title="Check with your administrator"
        size="sm"
        footer={
          <Button onClick={handleClose} autoFocus>
            Back to sign in
          </Button>
        }
      >
        <div className="flex gap-3" role="status">
          <span className="h-fit rounded-full bg-primary/10 p-2 text-primary">
            <MailCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-medium">We&apos;ve asked your administrator to reset your password.</p>
            <p className="text-muted-foreground">{forgot.data?.message ?? "If that account exists, your administrator has been asked to reset it."}</p>
            <p className="text-muted-foreground">They&apos;ll send you a one-time link to choose a new password. It works once and expires after a while, so use it soon.</p>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Forgot your password?"
      description="Enter your work email. We'll ask your workspace administrator to send you a reset link."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="forgot-password-form" loading={forgot.isPending}>
            <Send className="h-4 w-4" aria-hidden="true" />
            Ask for a reset
          </Button>
        </>
      }
    >
      <form id="forgot-password-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formErrorOf(forgot.error)} />
        <TextField
          label="Work email"
          id="forgot-email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          error={error}
          onChange={event => {
            setEmail(event.target.value);
            setEmailError("");
            if (forgot.error) forgot.reset();
          }}
        />
      </form>
    </Dialog>
  );
}
