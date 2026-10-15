"use client";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { FormAlert } from "@/components/shared/States";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { useChangePassword, useCurrentUser, useLogout, usePasswordRule } from "../hooks/useAuth";
import { WorkspaceAuthShell } from "./WorkspaceAuthShell";

const EMPTY = { currentPassword: "", newPassword: "", confirm: "" };
type Values = typeof EMPTY;

/** Feature component: shown instead of the app until someone with a temporary password picks their own. */
export function ForcePasswordChange() {
  const { data: user } = useCurrentUser();
  const changePassword = useChangePassword();
  const passwordRule = usePasswordRule();
  const logout = useLogout();
  const [values, setValues] = useState(EMPTY);
  const [clientErrors, setClientErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const errors = { ...fieldErrorsOf(changePassword.error), ...clientErrors };

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues(current => ({ ...current, [name]: value }));
    setClientErrors(current => ({ ...current, [name]: undefined }));
    if (changePassword.error) changePassword.reset();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (changePassword.isPending) return;
    const next: Partial<Record<keyof Values, string>> = {};
    if (!values.currentPassword) next.currentPassword = "Enter the temporary password you signed in with.";
    const problem = passwordRule.problem(values.newPassword);
    if (problem) next.newPassword = problem;
    else if (values.newPassword === values.currentPassword) next.newPassword = "Choose a password different from the temporary one.";
    if (values.confirm !== values.newPassword) next.confirm = "The passwords don't match.";
    setClientErrors(next);
    if (Object.keys(next).length) return;
    changePassword.mutate({ currentPassword: values.currentPassword, newPassword: values.newPassword });
  }

  return (
    <WorkspaceAuthShell slug={user?.tenant?.slug} title="Choose your password" subtitle={`Welcome${user?.name ? `, ${user.name.split(" ")[0]}` : ""}. You signed in with a temporary password; pick your own to continue.`}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formErrorOf(changePassword.error)} />
        <TextField label="Temporary password" name="currentPassword" type="password" autoComplete="current-password" autoFocus value={values.currentPassword} error={errors.currentPassword} onChange={handleChange} />
        <TextField label="New password" name="newPassword" type="password" autoComplete="new-password" hint={passwordRule.hint} value={values.newPassword} error={errors.newPassword} onChange={handleChange} />
        <TextField label="Confirm new password" name="confirm" type="password" autoComplete="new-password" value={values.confirm} error={errors.confirm} onChange={handleChange} />
        <Button type="submit" size="lg" loading={changePassword.isPending} className="mt-2 w-full">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          Save and continue
        </Button>
        <Button variant="ghost" onClick={() => logout.mutate(undefined)} disabled={logout.isPending}>
          Sign out
        </Button>
      </form>
    </WorkspaceAuthShell>
  );
}
