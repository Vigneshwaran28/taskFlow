"use client";
import { useState, type FormEvent } from "react";
import { Check, Copy, KeyRound, Link2, Power, ShieldCheck, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/lib/apiClient";
import { useChangeRole, useCreateAdminResetLink, useDeleteRow, useResetPassword, useSetUserActive } from "../hooks/useAdmin";
import type { ConsoleRole, ResetLink, UserSummary } from "../services/adminService";

const ROLE_OPTIONS: { value: ConsoleRole; label: string }[] = [
  { value: "member", label: "Member (raises tickets, manages own tasks)" },
  { value: "agent", label: "Agent (works the help desk queue)" },
  { value: "admin", label: "Admin (help desk, manages teams and settings)" },
];
const CONSOLE_ROLES: readonly string[] = ["admin", "agent", "member"];
const isConsoleRole = (value: string | null | undefined): value is ConsoleRole => CONSOLE_ROLES.includes(value ?? "");
const roleWord = (role: ConsoleRole) => (role === "admin" ? "an admin" : role === "agent" ? "an agent" : "a member");

export interface UserManageDialogProps {
  tenantId: number;
  user: UserSummary;
  /** The tenant's user limit is reached: reactivating is refused */
  seatsFull?: boolean;
  onClose: () => void;
}

/** Feature component: change a user's role, set a new password, deactivate / reactivate, or delete the account. */
export function UserManageDialog({ tenantId, user, seatsFull = false, onClose }: UserManageDialogProps) {
  const toast = useToast();
  const changeRole = useChangeRole();
  const resetPassword = useResetPassword();
  const setActive = useSetUserActive();
  const deleteUser = useDeleteRow();
  const createResetLink = useCreateAdminResetLink();
  // The console sets one built-in role (an Owner role, if any, is kept); custom roles are managed in the workspace.
  const currentRole: ConsoleRole | null = user.roles.map(item => item.key).find(isConsoleRole) ?? null;
  const isOwner = user.roles.some(item => item.key === "owner");
  const [role, setRole] = useState<ConsoleRole>(currentRole ?? "member");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirming, setConfirming] = useState<"delete" | "deactivate" | null>(null);
  const [resetLink, setResetLink] = useState<ResetLink | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  function handleCreateResetLink() {
    createResetLink.mutate(
      { id: user.id, tenantId, expiresInHours: 24 },
      {
        onSuccess: link => {
          setResetLink(link);
          toast.success("Reset link created", `One-time link generated for ${user.name}.`);
        },
        onError: err => toast.error("Couldn't create reset link", err.message),
      }
    );
  }

  function handleCopyResetLink() {
    if (!resetLink) return;
    const full = typeof window !== "undefined" ? `${window.location.origin}${resetLink.url}` : resetLink.url;
    navigator.clipboard.writeText(full);
    setCopiedLink(true);
    toast.success("Link copied", "One-time link copied to clipboard.");
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function handleRole(event: FormEvent) {
    event.preventDefault();
    if (changeRole.isPending || role === currentRole) return;
    changeRole.mutate(
      { id: user.id, tenantId, role },
      {
        onSuccess: () => toast.success("Role updated", `${user.name} is now ${roleWord(role)}.`),
        onError: error => toast.error("Role not changed", error.message),
      }
    );
  }

  function handlePassword(event: FormEvent) {
    event.preventDefault();
    if (resetPassword.isPending) return;
    if (password.length < 8) {
      setPasswordError("Use at least 8 characters.");
      return;
    }
    resetPassword.mutate(
      { id: user.id, tenantId, password },
      {
        onSuccess: () => {
          setPassword("");
          toast.success("Password reset", `Give ${user.name} the new password so they can sign in.`);
        },
        onError: error => setPasswordError(error instanceof ApiError ? (error.fieldErrors.password ?? error.message) : "Password not changed."),
      }
    );
  }

  function handleActive(isActive: boolean) {
    setActive.mutate(
      { id: user.id, tenantId, isActive },
      {
        onSuccess: () => {
          setConfirming(null);
          toast.success(isActive ? `${user.name} reactivated` : `${user.name} deactivated`, isActive ? "They can sign in again." : "They're signed out and can't sign in.");
        },
        onError: error => {
          setConfirming(null);
          toast.error("Couldn't change access", error.message);
        },
      }
    );
  }

  function handleDelete() {
    deleteUser.mutate(
      { table: "users", id: user.id, tenantId },
      {
        onSuccess: () => {
          toast.success("User deleted", `${user.name} and all of their data were removed.`);
          setConfirming(null);
          onClose();
        },
        onError: error => toast.error("Delete failed", error.message),
      }
    );
  }

  return (
    <>
      <Dialog open={!confirming} onClose={onClose} title={`Manage ${user.name}`} description={user.email}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={user.isActive ? "success" : "danger"}>{user.isActive ? "Active" : "Deactivated"}</Badge>
            {user.roles.map(item => (
              <Badge key={item.name}>{item.name}</Badge>
            ))}
          </div>

          <form onSubmit={handleRole} className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Role
            </h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <SelectField
                label="Built-in role"
                id="admin-user-role"
                className="min-w-0 flex-1"
                value={role}
                options={ROLE_OPTIONS}
                onChange={event => {
                  if (isConsoleRole(event.target.value)) setRole(event.target.value);
                }}
              />
              <Button type="submit" variant="secondary" loading={changeRole.isPending} disabled={role === currentRole}>
                Save role
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isOwner ? "The Owner role is kept. " : ""}Custom roles are replaced; the tenant&apos;s admins manage those in their workspace.
            </p>
          </form>

          <form onSubmit={handlePassword} noValidate className="flex flex-col gap-3 border-t pt-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Reset password
            </h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <TextField
                label="New password"
                id="admin-user-password"
                type="password"
                autoComplete="new-password"
                hint="At least 8 characters. The user's current password stops working."
                className="min-w-0 flex-1"
                value={password}
                error={passwordError}
                onChange={event => {
                  setPassword(event.target.value);
                  setPasswordError("");
                }}
              />
              <Button type="submit" variant="secondary" loading={resetPassword.isPending} className="sm:mt-6.5">
                Set password
              </Button>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Or send them a one-time link:</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  loading={createResetLink.isPending}
                  onClick={handleCreateResetLink}
                >
                  <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {resetLink ? "Generate another link" : "Create one-time reset link"}
                </Button>
              </div>
              {resetLink && (
                <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== "undefined" ? `${window.location.origin}${resetLink.url}` : resetLink.url}
                    className="flex-1 bg-transparent font-mono text-xs text-foreground focus:outline-none"
                    onFocus={e => e.currentTarget.select()}
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={handleCopyResetLink}>
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedLink ? "Copied" : "Copy"}
                  </Button>
                </div>
              )}
            </div>
          </form>

          <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Power className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {user.isActive ? "Deactivate" : "Reactivate"}
              </p>
              <p className="text-sm text-muted-foreground">
                {user.isActive
                  ? "Signs them out everywhere and blocks sign-in. Their data is kept."
                  : seatsFull
                    ? "The tenant's user limit is reached. Deactivate someone else or raise the limit first."
                    : "Lets them sign in again (uses one of the tenant's seats)."}
              </p>
            </div>
            {user.isActive ? (
              <Button variant="secondary" onClick={() => setConfirming("deactivate")}>
                Deactivate
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => handleActive(true)} loading={setActive.isPending} disabled={seatsFull}>
                Reactivate
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-destructive">Delete user</p>
              <p className="text-sm text-muted-foreground">
                Removes the account with its {user.lists} lists, {user.tasks} tasks, {user.notifications} notifications, and every ticket they raised.
              </p>
            </div>
            <Button variant="danger" onClick={() => setConfirming("delete")}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
      <ConfirmDialog
        open={confirming === "deactivate"}
        title={`Deactivate ${user.name}?`}
        message="They're signed out at once and can't sign in until you reactivate them. Their data is kept."
        confirmLabel="Deactivate"
        pending={setActive.isPending}
        onConfirm={() => handleActive(false)}
        onCancel={() => setConfirming(null)}
      />
      <ConfirmDialog
        open={confirming === "delete"}
        title={`Delete ${user.name}?`}
        message={`This permanently deletes ${user.email} and all of their data. It can't be undone.`}
        confirmLabel="Delete user"
        pending={deleteUser.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(null)}
      />
    </>
  );
}
