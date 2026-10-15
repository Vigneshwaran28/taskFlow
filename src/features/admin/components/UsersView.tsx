"use client";
import { useState } from "react";
import { Search, UserPlus, Users } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/cn";
import { useTenantOverview } from "../hooks/useAdmin";
import { AddUserDialog } from "./AddUserDialog";
import { UserManageDialog } from "./UserManageDialog";
import { UsersTable } from "./UsersTable";

const PAGE_SIZE = 20;
const STATUS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Deactivated" },
] as const;
type Status = (typeof STATUS)[number]["id"];

export interface UsersViewProps {
  tenantId: number;
  onViewUserData: (userId: number) => void;
}

/** Feature component: one tenant's users with search, status filter, paging, add, and manage. */
export function UsersView({ tenantId, onViewUserData }: UsersViewProps) {
  const { data, isPending, error, refetch } = useTenantOverview(tenantId);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [page, setPage] = useState(1);
  const [managedUserId, setManagedUserId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  if (isPending) return <LoadingState label="Loading users…" />;
  if (error || !data) return <ErrorState message="Unable to load this tenant's users." onRetry={() => void refetch()} />;

  const { tenant } = data;
  const term = query.trim().toLowerCase();
  const filtered = data.users.filter(
    user =>
      (status === "all" || (status === "active") === user.isActive) &&
      (!term || user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term) || String(user.id) === term || user.roles.some(role => role.name.toLowerCase().includes(term)))
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  // Looked up on every render so the dialog shows fresh values after changes.
  const managedUser = data.users.find(user => user.id === managedUserId) ?? null;
  const full = tenant.maxUsers != null && tenant.users.active >= tenant.maxUsers;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="relative block w-full sm:w-72">
            <span className="mb-1.5 block text-sm font-medium">Search</span>
            <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              placeholder="Name, email, role, or id"
              onChange={event => {
                setQuery(event.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <div role="group" aria-label="Status" className="flex h-10 shrink-0 rounded-lg border bg-card p-1">
            {STATUS.map(item => (
              <button
                key={item.id}
                type="button"
                aria-pressed={status === item.id}
                onClick={() => {
                  setStatus(item.id);
                  setPage(1);
                }}
                className={cn(
                  "rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  status === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium tabular-nums text-foreground">{tenant.users.active}</span> active
            {tenant.maxUsers != null ? ` of ${tenant.maxUsers} allowed` : ""}
          </p>
          <Button onClick={() => setAdding(true)} disabled={full} title={full ? "The tenant's user limit is reached" : undefined}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {full ? "User limit reached" : "Add user"}
          </Button>
        </div>
      </div>

      {!data.users.length ? (
        <EmptyState title="No users yet" message="Add the first user, or let the tenant's owner invite their team." icon={Users} />
      ) : !filtered.length ? (
        <EmptyState title="No users match" message={term ? `Nobody matches "${query.trim()}".` : "Nobody has this status."} icon={Search} />
      ) : (
        <>
          <UsersTable users={shown} onViewUser={onViewUserData} onManageUser={setManagedUserId} />
          <Pagination page={current} totalPages={totalPages} total={filtered.length} onPageChange={setPage} />
        </>
      )}

      {managedUser && <UserManageDialog key={managedUser.id} tenantId={tenantId} seatsFull={full} user={managedUser} onClose={() => setManagedUserId(null)} />}
      {adding && <AddUserDialog tenantId={tenantId} tenantName={tenant.name} onClose={() => setAdding(false)} />}
    </div>
  );
}
