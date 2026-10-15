"use client";
import { useState, type ReactNode } from "react";
import { ScrollText, Search } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import { useAuditLog } from "../hooks/useAccess";
import type { AuditEntry } from "../services/accessService";

export const AUDIT_ACTIONS: Record<string, { label: string; tone: Tone }> = {
  "user.create": { label: "Added a user", tone: "success" },
  "user.roles": { label: "Changed roles", tone: "warning" },
  "user.activate": { label: "Reactivated a user", tone: "success" },
  "user.deactivate": { label: "Deactivated a user", tone: "danger" },
  "user.rename": { label: "Renamed a user", tone: "neutral" },
  "user.password_reset": { label: "Reset a password", tone: "warning" },
  "user.password_reset_request": { label: "Asked for a password reset", tone: "info" },
  "user.reset_link": { label: "Created a reset link", tone: "warning" },
  "user.password_reset_complete": { label: "Reset their password by link", tone: "success" },
  "user.password_reset_dismiss": { label: "Dismissed a reset request", tone: "neutral" },
  "user.sign_out": { label: "Signed someone out everywhere", tone: "warning" },
  "user.import": { label: "Imported users", tone: "success" },
  "role.create": { label: "Created a role", tone: "success" },
  "role.permissions": { label: "Changed permissions", tone: "warning" },
  "role.update": { label: "Edited a role", tone: "neutral" },
  "role.delete": { label: "Deleted a role", tone: "danger" },
  "access_rule.create": { label: "Created an access rule", tone: "success" },
  "access_rule.update": { label: "Edited an access rule", tone: "warning" },
  "access_rule.people": { label: "Changed who a rule applies to", tone: "warning" },
  "access_rule.delete": { label: "Deleted an access rule", tone: "danger" },
  "settings.update": { label: "Changed settings", tone: "info" },
  "leave.approve": { label: "Approved leave", tone: "success" },
  "leave.reject": { label: "Rejected leave", tone: "danger" },
  "expense.approve": { label: "Approved an expense", tone: "success" },
  "expense.reject": { label: "Rejected an expense", tone: "danger" },
  "expense.pay": { label: "Paid an expense", tone: "info" },
};

const FILTERS = [
  { value: "", label: "Everything" },
  { value: "user", label: "Users" },
  { value: "role", label: "Roles & permissions" },
  { value: "settings", label: "Settings" },
  { value: "leave", label: "Leave approvals" },
  { value: "expense", label: "Expense approvals" },
];

const describe = (details: AuditEntry["details"]) =>
  details
    ? Object.entries(details)
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
        .join(" · ")
    : "";

/** Feature component: who changed access, settings, and approvals in this workspace. */
export function AuditLog() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search.trim(), 300);
  const { data, isPending, isFetching, isPlaceholderData, error, refetch } = useAuditLog({ page, action: action || undefined, search: debounced || undefined });

  let body: ReactNode;
  if (isPending) body = <LoadingState label="Loading audit log…" />;
  else if (error) body = <ErrorState message="Unable to load the audit log." onRetry={() => void refetch()} />;
  else if (!data.entries.length) body = <EmptyState title="Nothing recorded" message="Changes to users, roles, settings, and approvals appear here." icon={ScrollText} />;
  else {
    body = (
      <div className="flex flex-col gap-2" aria-busy={isFetching}>
        <ul className={cn("divide-y overflow-hidden rounded-xl border bg-card", isPlaceholderData && "opacity-60")}>
          {data.entries.map(entry => {
            const meta = AUDIT_ACTIONS[entry.action] ?? { label: entry.action, tone: "neutral" };
            return (
              <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
                <Avatar name={entry.actor?.name ?? "?"} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{entry.actor?.name ?? "Former colleague"}</span>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    {entry.target && <span className="font-medium">{entry.target}</span>}
                  </p>
                  {entry.details && <p className="mt-0.5 break-words text-xs text-muted-foreground">{describe(entry.details)}</p>}
                </div>
                <time dateTime={entry.createdAt} className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatDateTime(entry.createdAt)}
                </time>
              </li>
            );
          })}
        </ul>
        <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} disabled={isFetching} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="audit-search" className="sr-only">
            Search the audit log
          </label>
          <input
            id="audit-search"
            type="search"
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by person or target"
            className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <label htmlFor="audit-action" className="sr-only">
          Kind of change
        </label>
        <select
          id="audit-action"
          value={action}
          onChange={event => {
            setAction(event.target.value);
            setPage(1);
          }}
          className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {FILTERS.map(filter => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>
      {body}
    </div>
  );
}
