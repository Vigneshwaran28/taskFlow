"use client";
import { useState, type FormEvent } from "react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { TemporaryPasswordField } from "@/components/shared/TemporaryPasswordField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { useCreateTenantUser } from "../hooks/useAdmin";
import type { ConsoleRole } from "../services/adminService";

const ROLE_OPTIONS: { value: ConsoleRole; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "agent", label: "Agent" },
  { value: "admin", label: "Admin" },
];
const EMPTY = { name: "", email: "", role: "member" as ConsoleRole, password: "" };
type Values = typeof EMPTY;
type Errors = Partial<Record<"name" | "email" | "password", string>>;

/** Feature component: add an account to a tenant with a temporary password. */
export function AddUserDialog({ tenantId, tenantName, onClose }: { tenantId: number; tenantName: string; onClose: () => void }) {
  const toast = useToast();
  const createUser = useCreateTenantUser();
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const serverErrors = fieldErrorsOf(createUser.error);
  const shown: Errors = { name: errors.name ?? serverErrors.name, email: errors.email ?? serverErrors.email, password: errors.password ?? serverErrors.password };

  const set = <K extends keyof Values>(name: K, value: Values[K]) => {
    setValues(current => ({ ...current, [name]: value }));
    setErrors(current => ({ ...current, [name]: undefined }));
    if (createUser.error) createUser.reset();
  };

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (createUser.isPending) return;
    const next: Errors = {};
    if (!values.name.trim()) next.name = "Name is required.";
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) next.email = "Enter a valid email address.";
    if (values.password.length < 8) next.password = "Use at least 8 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;
    createUser.mutate(
      { tenantId, name: values.name.trim(), email: values.email.trim(), role: values.role, password: values.password },
      {
        onSuccess: () => {
          toast.success(`${values.name.trim()} added to ${tenantName}`, "They're asked to pick their own password at first sign-in.");
          onClose();
        },
      }
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Add a user to ${tenantName}`}
      description="The tenant's admins can manage their users too."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="admin-add-user" loading={createUser.isPending}>
            Add user
          </Button>
        </>
      }
    >
      <form id="admin-add-user" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formErrorOf(createUser.error)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Full name" id="au-name" required autoFocus maxLength={120} value={values.name} error={shown.name} onChange={event => set("name", event.target.value)} />
          <TextField label="Email" id="au-email" required type="email" autoComplete="off" value={values.email} error={shown.email} onChange={event => set("email", event.target.value)} />
          <SelectField
            label="Role"
            id="au-role"
            value={values.role}
            options={ROLE_OPTIONS}
            onChange={event => set("role", ROLE_OPTIONS.find(option => option.value === event.target.value)?.value ?? "member")}
          />
          <TemporaryPasswordField
            label="Temporary password"
            id="au-password"
            required
            hint="At least 8 characters."
            value={values.password}
            error={shown.password}
            onChange={val => set("password", val)}
          />
        </div>
      </form>
    </Dialog>
  );
}
