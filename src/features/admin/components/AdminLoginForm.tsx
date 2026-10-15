"use client";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { FormAlert } from "@/components/shared/States";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { useAdminLogin } from "../hooks/useAdmin";

type Errors = { username?: string; password?: string };

export function AdminLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const login = useAdminLogin();
  const [values, setValues] = useState({ username: "", password: "" });
  const [clientErrors, setClientErrors] = useState<Errors>({});
  const errors: Errors = { ...fieldErrorsOf(login.error), ...clientErrors };

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues(current => ({ ...current, [name]: value }));
    setClientErrors(current => ({ ...current, [name]: undefined }));
    if (login.error) login.reset();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (login.isPending) return;
    const nextErrors: Errors = {};
    if (!values.username.trim()) nextErrors.username = "Username is required.";
    if (!values.password) nextErrors.password = "Password is required.";
    setClientErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    login.mutate({ username: values.username.trim(), password: values.password }, { onSuccess });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormAlert message={formErrorOf(login.error)} />
      <TextField label="Admin username" name="username" autoComplete="username" autoFocus value={values.username} error={errors.username} onChange={handleChange} />
      <TextField label="Password" name="password" type="password" autoComplete="current-password" value={values.password} error={errors.password} onChange={handleChange} />
      <Button type="submit" size="lg" loading={login.isPending} className="mt-2 w-full">
        Sign in to admin console
      </Button>
    </form>
  );
}
