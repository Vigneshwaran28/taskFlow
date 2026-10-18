"use client";
import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { FormAlert, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { TemporaryPasswordField } from "@/components/shared/TemporaryPasswordField";
import { useRoles, type Role } from "@/features/access";
import { useAllowedEmailDomains, usePasswordRule } from "@/features/auth";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { yearsSince } from "@/lib/dates";
import { localDay } from "@/lib/format";
import { useCreateUser, useResetUserPassword, useUpdateUser } from "../hooks/useUsers";
import type { ManagedUser } from "../services/userService";
import { RolePicker } from "./RolePicker";

interface Values {
  name: string;
  email: string;
  jobTitle: string;
  dateOfBirth: string;
  joinedOn: string;
  password: string;
}
type ErrorKey = keyof Values | "roleIds";

export interface UserFormDialogProps {
  user?: ManagedUser | null;
  currentUserId?: number;
  onClose: () => void;
}

/** Feature component: create a user, or edit one, change their roles, and set a new password. Mount with a `key` to reset. */
export function UserFormDialog({ user = null, currentUserId, onClose }: UserFormDialogProps) {
  const isEdit = Boolean(user);
  const toast = useToast();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const resetPassword = useResetUserPassword();
  const { data: access, isPending: loadingRoles } = useRoles();
  const mutation = isEdit ? updateUser : createUser;
  const passwordRule = usePasswordRule();
  const domains = useAllowedEmailDomains();

  const [values, setValues] = useState<Values>({
    name: user?.name ?? "",
    email: user?.email ?? "",
    jobTitle: user?.jobTitle ?? "",
    dateOfBirth: user?.dateOfBirth ?? "",
    joinedOn: user?.joinedOn ?? "",
    password: "",
  });
  // null = default (Member) until roles load
  const [roleIds, setRoleIds] = useState<number[] | null>(user?.roles.map(role => role.id) ?? null);
  const [clientErrors, setClientErrors] = useState<Partial<Record<ErrorKey, string>>>({});
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const roles = access?.roles ?? [];
  const memberRole = roles.find(role => role.key === "member");
  const selected = roleIds ?? (memberRole ? [memberRole.id] : []);
  const targetIsOwner = Boolean(user?.roles.some(role => role.key === "owner"));
  const age = yearsSince(values.dateOfBirth);

  const errors: Partial<Record<string, string>> = { ...fieldErrorsOf(mutation.error), ...clientErrors };

  /** Mirrors the server: owners grant anything; others only roles within their own access. */
  function blockedReason(role: Role) {
    if (!access) return null;
    if (access.isOwner) return null;
    if (role.key === "owner") return "Only an owner can make someone an owner.";
    if (isEdit && targetIsOwner) return "Only an owner can change an owner's roles.";
    // Only licensed permissions (the catalog) count, like the server's check.
    const missing = role.permissions.filter(key => access.catalog.some(permission => permission.key === key) && !access.mine.includes(key));
    return missing.length ? `Includes ${missing.length} permission${missing.length === 1 ? "" : "s"} you don't have.` : null;
  }

  function set(name: keyof Values, value: string) {
    setValues(current => ({ ...current, [name]: value }));
    setClientErrors(current => ({ ...current, [name]: undefined }));
    if (mutation.error) mutation.reset();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const next: Partial<Record<ErrorKey, string>> = {};
    if (!values.name.trim()) next.name = "Name is required.";
    if (!isEdit && !/^\S+@\S+\.\S+$/.test(values.email.trim())) next.email = "Enter a valid email address.";
    if (!isEdit && passwordRule.problem(values.password)) next.password = passwordRule.problem(values.password) ?? undefined;
    const domain = values.email.trim().toLowerCase().split("@")[1];
    if (!isEdit && !next.email && domains.length && !domains.includes(domain)) next.email = `Use an address at ${domains.map(item => `@${item}`).join(", ")}.`;
    if (!selected.length) next.roleIds = "Give at least one role.";
    if (values.dateOfBirth && (age === null || age < 14 || age > 100)) next.dateOfBirth = "Enter a date of birth for someone aged 14 to 100.";
    setClientErrors(next);
    if (Object.keys(next).length) return;

    const base = { name: values.name.trim(), jobTitle: values.jobTitle.trim() || null, dateOfBirth: values.dateOfBirth || null, joinedOn: values.joinedOn || null };
    if (user) {
      const rolesChanged =
        [...selected].sort((a, b) => a - b).join() !==
        user.roles
          .map(role => role.id)
          .sort((a, b) => a - b)
          .join();
      updateUser.mutate(
        { id: user.id, changes: rolesChanged ? { ...base, roleIds: selected } : base },
        {
          onSuccess: () => {
            toast.success("User updated", rolesChanged ? "New access applies immediately." : undefined);
            onClose();
          },
        }
      );
    } else {
      createUser.mutate(
        { ...base, email: values.email.trim(), password: values.password, roleIds: selected },
        {
          onSuccess: created => {
            toast.success(`${created.name} can now sign in`, "Share their email and temporary password; they'll choose their own at first sign-in.");
            onClose();
          },
        }
      );
    }
  }

  function handleResetPassword() {
    if (!user || resetPassword.isPending) return;
    const problem = passwordRule.problem(newPassword);
    if (problem) {
      setPasswordError(problem);
      return;
    }
    resetPassword.mutate(
      { id: user.id, password: newPassword },
      {
        onSuccess: () => {
          setNewPassword("");
          toast.success("Temporary password set", `${user.name} must choose a new one at next sign-in.`);
        },
        onError: error => setPasswordError(fieldErrorsOf(error).password ?? error.message),
      }
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={user ? `Edit ${user.name}` : "Add a user"}
      description={user ? user.email : "They sign in with this email and a temporary password, then choose their own."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" loading={mutation.isPending} disabled={loadingRoles}>
            {isEdit ? "Save changes" : "Create user"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <form id="user-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <FormAlert message={formErrorOf(mutation.error)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Full name" id="user-name" required autoFocus maxLength={120} value={values.name} error={errors.name} onChange={event => set("name", event.target.value)} />
            <TextField label="Job title" id="user-title" maxLength={120} placeholder="e.g. Store Manager" value={values.jobTitle} error={errors.jobTitle} onChange={event => set("jobTitle", event.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Date of birth"
              id="user-dob"
              type="date"
              max={localDay()}
              value={values.dateOfBirth}
              error={errors.dateOfBirth}
              hint={age !== null && age >= 0 ? `Age ${age}. Used for birthday greetings; colleagues never see the year.` : "Optional. Used for birthday greetings."}
              onChange={event => set("dateOfBirth", event.target.value)}
            />
            <TextField
              label="Joining date"
              id="user-joined"
              type="date"
              value={values.joinedOn}
              error={errors.joinedOn}
              hint="Optional. Used for work-anniversary greetings."
              onChange={event => set("joinedOn", event.target.value)}
            />
          </div>
          {!isEdit && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Work email"
                id="user-email"
                type="email"
                required
                autoComplete="off"
                hint={domains.length ? `Your workspace allows ${domains.map(item => `@${item}`).join(", ")} addresses.` : undefined}
                value={values.email}
                error={errors.email}
                onChange={event => set("email", event.target.value)}
              />
              <TemporaryPasswordField
                label="Temporary password"
                id="user-password"
                required
                hint={passwordRule.hint}
                value={values.password}
                error={errors.password}
                onChange={val => set("password", val)}
              />
            </div>
          )}
          {loadingRoles ? (
            <LoadingState label="Loading roles…" className="py-6" />
          ) : (
            <RolePicker
              roles={roles}
              value={selected}
              onChange={ids => {
                setRoleIds(ids);
                setClientErrors(current => ({ ...current, roleIds: undefined }));
              }}
              blockedReason={blockedReason}
              error={errors.roleIds}
            />
          )}
          {user && user.id === currentUserId && <p className="text-xs text-muted-foreground">Changing your own roles can remove your access to this page.</p>}
        </form>

        {user && (
          <section aria-labelledby="reset-password-heading" className="flex flex-col gap-3 border-t pt-5">
            <h3 id="reset-password-heading" className="flex items-center gap-2 text-sm font-semibold">
              <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Set a temporary password
            </h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <TemporaryPasswordField
                label="Temporary password"
                id="user-new-password"
                className="flex-1"
                value={newPassword}
                error={passwordError}
                hint="Their current password stops working; they choose a new one at next sign-in."
                onChange={val => {
                  setNewPassword(val);
                  setPasswordError("");
                }}
              />
              <Button variant="secondary" className="sm:mt-6.5" onClick={handleResetPassword} loading={resetPassword.isPending}>
                Set password
              </Button>
            </div>
          </section>
        )}
      </div>
    </Dialog>
  );
}
