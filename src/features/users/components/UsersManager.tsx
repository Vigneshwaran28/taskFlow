"use client";
import { useMemo, useState } from "react";
import { Download, FileUp, KeyRound, LogOut, Pencil, Search, UserCheck, UserPlus, UserX, Users } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { roleTone, useCurrentUser } from "@/features/auth";
import { cn } from "@/lib/cn";
import { downloadCsv } from "@/lib/csv";
import { formatDateTime, formatTimeAgo } from "@/lib/dates";
import { useDebounce } from "@/hooks/useDebounce";
import { useManagedUsers, useSignOutEverywhere, useUpdateUser } from "../hooks/useUsers";
import type { ManagedUser } from "../services/userService";
import { usersToCsv } from "../utils/userCsv";
import { ImportUsersDialog } from "./ImportUsersDialog";
import { PasswordRequestsPanel } from "./PasswordRequestsPanel";
import { PasswordResetDialog, type PasswordResetDialogProps, type PasswordResetMode } from "./PasswordResetDialog";
import { UserFormDialog } from "./UserFormDialog";

type StatusFilter = "all" | "active" | "temporary" | "never" | "deactivated";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "active", label: "Active" },
  { value: "temporary", label: "Temporary password" },
  { value: "never", label: "Never signed in" },
  { value: "deactivated", label: "Deactivated" },
];

const matchesStatus = (user: ManagedUser, status: StatusFilter) =>
  status === "all" ||
  (status === "active" && user.isActive) ||
  (status === "temporary" && user.isActive && user.mustChangePassword) ||
  (status === "never" && user.isActive && !user.lastLoginAt) ||
  (status === "deactivated" && !user.isActive);

/** "Signed in 2 hours ago" / "Never signed in", for the list. */
const lastSignIn = (user: ManagedUser) => (user.lastLoginAt ? `Signed in ${formatTimeAgo(user.lastLoginAt)}` : "Never signed in");

/** Feature component: every account in the workspace, with seats, search and filters, add, import, edit, and deactivate. */
export function UsersManager() {
  const toast = useToast();
  const { data: me } = useCurrentUser();
  const { data, isPending, error, refetch } = useManagedUsers();
  const updateUser = useUpdateUser();
  const signOutEverywhere = useSignOutEverywhere();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [roleId, setRoleId] = useState("");
  const [importing, setImporting] = useState(false);
  const [signingOut, setSigningOut] = useState<ManagedUser | null>(null);
  const query = useDebounce(search.trim().toLowerCase(), 150);

  const allUsers = data?.users;
  const roleOptions = useMemo(() => {
    const byId = new Map<number, string>();
    for (const user of allUsers ?? []) for (const role of user.roles) byId.set(role.id, role.name);
    return [{ value: "", label: "Any role" }, ...[...byId].map(([id, name]) => ({ value: String(id), label: name }))];
  }, [allUsers]);
  const visible = useMemo(
    () =>
      (allUsers ?? []).filter(
        user =>
          matchesStatus(user, status) &&
          (!roleId || user.roles.some(role => String(role.id) === roleId)) &&
          (!query || user.name.toLowerCase().includes(query) || user.email.includes(query) || (user.jobTitle ?? "").toLowerCase().includes(query))
      ),
    [allUsers, status, roleId, query]
  );
  const [dialog, setDialog] = useState<{ key: number; user: ManagedUser | null } | null>(null);
  const [resetDialog, setResetDialog] = useState<{ key: number; user: PasswordResetDialogProps["user"]; mode: PasswordResetMode } | null>(null);
  const openReset = (user: PasswordResetDialogProps["user"], mode: PasswordResetMode) => setResetDialog({ key: Date.now(), user, mode });

  if (isPending) return <LoadingState label="Loading users…" />;
  if (error) return <ErrorState message="Unable to load users." onRetry={() => void refetch()} />;

  const { users, seats } = data;
  const full = seats.limit != null && seats.used >= seats.limit;
  const filtered = visible.length !== users.length;

  function confirmSignOut() {
    if (!signingOut) return;
    const user = signingOut;
    signOutEverywhere.mutate(user.id, {
      onSuccess: () => {
        setSigningOut(null);
        toast.success(`${user.name} was signed out`, "On every device. They can sign in again with their password.");
      },
      onError: err => toast.error("Couldn't sign them out", err.message),
    });
  }

  function toggleActive(user: ManagedUser) {
    updateUser.mutate(
      { id: user.id, changes: { isActive: !user.isActive } },
      {
        onSuccess: () => toast.success(user.isActive ? `${user.name} deactivated` : `${user.name} reactivated`, user.isActive ? "They can no longer sign in." : "They can sign in again."),
        onError: err => toast.error("Couldn't change access", err.message),
      }
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PasswordRequestsPanel onReset={openReset} />

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">
            <span className="tabular-nums">{seats.used}</span>
            {seats.limit != null ? ` of ${seats.limit}` : ""} active {seats.used === 1 ? "user" : "users"}
          </p>
          <p className="text-xs text-muted-foreground">
            {full ? "Your plan's user limit is reached. Deactivate someone or ask your provider for more seats." : "Deactivated users keep their history but can't sign in, and don't use a seat."}
          </p>
          {seats.limit != null && (
            <div className="mt-2 h-1.5 w-56 max-w-full rounded-full bg-muted" aria-hidden="true">
              <div className={cn("h-full rounded-full", full ? "bg-destructive" : "bg-primary")} style={{ width: `${Math.min(100, (seats.used / seats.limit) * 100)}%` }} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setImporting(true)} disabled={full}>
            <FileUp className="h-4 w-4" aria-hidden="true" />
            Import
          </Button>
          <Button onClick={() => setDialog({ key: Date.now(), user: null })} disabled={full}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Add user
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-input bg-card px-3 shadow-sm focus-within:ring-2 focus-within:ring-ring">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Search users</span>
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search by name, email, or job title"
            className="h-9 min-w-0 flex-1 bg-transparent text-sm focus-visible:outline-none"
          />
        </label>
        <SelectField aria-label="Status" className="sm:w-48" options={STATUS_OPTIONS} value={status} onChange={event => setStatus(event.target.value as StatusFilter)} />
        <SelectField aria-label="Role" className="sm:w-44" options={roleOptions} value={roleId} onChange={event => setRoleId(event.target.value)} />
        <Button
          variant="ghost"
          onClick={() => downloadCsv(`users-${new Date().toISOString().slice(0, 10)}.csv`, usersToCsv(visible))}
          disabled={!visible.length}
          title="Download the people shown as CSV"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export
        </Button>
      </div>
      {filtered && (
        <p className="text-sm text-muted-foreground" role="status">
          Showing {visible.length} of {users.length}
        </p>
      )}

      {visible.length ? (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {visible.map(user => {
            const isMe = user.id === me?.id;
            return (
              <li key={user.id} className={cn("flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center", !user.isActive && "bg-muted/40")}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={user.name} className={cn(!user.isActive && "opacity-50")} />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{user.name}</span>
                      {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                      {user.roles.map(role => (
                        <Badge key={role.id} tone={roleTone(role)}>
                          {role.name}
                        </Badge>
                      ))}
                      {!user.isActive && <Badge tone="danger">Deactivated</Badge>}
                      {user.isActive && user.mustChangePassword && <Badge tone="warning">Temporary password</Badge>}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {user.email}
                      {user.jobTitle ? ` · ${user.jobTitle}` : ""}
                      {user.age != null ? ` · Age ${user.age}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground" title={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : undefined}>
                      {lastSignIn(user)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {!isMe && user.isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openReset(user, "choose")}
                      disabled={!me?.isOwner && user.roles.some(role => role.key === "owner")}
                      title={!me?.isOwner && user.roles.some(role => role.key === "owner") ? "Only an owner can reset an owner's password." : undefined}
                      aria-label={`Reset ${user.name}'s password`}
                    >
                      <KeyRound className="h-4 w-4" aria-hidden="true" />
                      Reset password
                    </Button>
                  )}
                  {!isMe && user.isActive && user.lastLoginAt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSigningOut(user)}
                      disabled={!me?.isOwner && user.roles.some(role => role.key === "owner")}
                      title={!me?.isOwner && user.roles.some(role => role.key === "owner") ? "Only an owner can sign out an owner." : "End their sessions on every device"}
                      aria-label={`Sign ${user.name} out everywhere`}
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Sign out
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => setDialog({ key: Date.now(), user })} aria-label={`Edit ${user.name}`}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit
                  </Button>
                  {!isMe && (
                    <Button variant={user.isActive ? "ghost" : "secondary"} size="sm" onClick={() => toggleActive(user)} disabled={updateUser.isPending}>
                      {user.isActive ? <UserX className="h-4 w-4" aria-hidden="true" /> : <UserCheck className="h-4 w-4" aria-hidden="true" />}
                      {user.isActive ? "Deactivate" : "Reactivate"}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : users.length ? (
        <EmptyState title="No one matches" message="Try another search or filter." icon={Search} />
      ) : (
        <EmptyState title="No users yet" message="Add the people in your company so they can sign in." icon={Users} />
      )}

      {importing && <ImportUsersDialog onClose={() => setImporting(false)} />}
      <ConfirmDialog
        open={Boolean(signingOut)}
        title={`Sign ${signingOut?.name ?? "them"} out everywhere?`}
        message="Their sessions end on every device right away. Their password stays the same, so they can sign in again."
        confirmLabel="Sign out everywhere"
        pending={signOutEverywhere.isPending}
        onConfirm={confirmSignOut}
        onCancel={() => setSigningOut(null)}
      />

      {dialog && <UserFormDialog key={dialog.key} user={dialog.user} currentUserId={me?.id} onClose={() => setDialog(null)} />}
      {resetDialog && <PasswordResetDialog key={resetDialog.key} user={resetDialog.user} mode={resetDialog.mode} onClose={() => setResetDialog(null)} />}
    </div>
  );
}
