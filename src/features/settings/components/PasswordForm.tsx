"use client";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useChangePassword, usePasswordRule } from "@/features/auth";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { useReportUnsaved } from "./UnsavedChanges";

const EMPTY = { currentPassword: "", newPassword: "", confirm: "" };
type Values = typeof EMPTY;

export function PasswordForm() {
  const toast = useToast();
  const changePassword = useChangePassword();
  const passwordRule = usePasswordRule();
  const [values, setValues] = useState<Values>(EMPTY);
  const [clientErrors, setClientErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const errors: Partial<Record<string, string>> = { ...fieldErrorsOf(changePassword.error), ...clientErrors };
  useReportUnsaved("password", Boolean(values.currentPassword || values.newPassword || values.confirm));

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues(current => ({ ...current, [name]: value }));
    setClientErrors(current => ({ ...current, [name]: undefined }));
    if (changePassword.error) changePassword.reset();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (changePassword.isPending) return;
    const nextErrors: Partial<Record<keyof Values, string>> = {};
    if (!values.currentPassword) nextErrors.currentPassword = "Current password is required.";
    const problem = passwordRule.problem(values.newPassword);
    if (problem) nextErrors.newPassword = problem;
    if (values.confirm !== values.newPassword) nextErrors.confirm = "Passwords don't match.";
    setClientErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    changePassword.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          setValues(EMPTY);
          toast.success("Password changed");
        },
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-md flex-col gap-4">
      <FormAlert message={formErrorOf(changePassword.error)} />
      <TextField label="Current password" name="currentPassword" type="password" autoComplete="current-password" value={values.currentPassword} error={errors.currentPassword} onChange={handleChange} />
      <TextField label="New password" name="newPassword" type="password" autoComplete="new-password" hint={passwordRule.hint} value={values.newPassword} error={errors.newPassword} onChange={handleChange} />
      <TextField label="Confirm new password" name="confirm" type="password" autoComplete="new-password" value={values.confirm} error={errors.confirm} onChange={handleChange} />
      <div>
        <Button type="submit" variant="secondary" loading={changePassword.isPending}>
          Change password
        </Button>
      </div>
    </form>
  );
}
