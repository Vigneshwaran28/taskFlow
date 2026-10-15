"use client";
import { ScrollText } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/cn";
import { useAdminAudit } from "../hooks/useAdmin";
import type { AuditEntry, AuditQuery } from "../services/adminService";
import { formatCell } from "../utils/formatCell";

const ACTIONS: Record<string, { label: string; tone: Tone }> = {
  login: { label: "Signed in", tone: "success" },
  login_failed: { label: "Failed sign-in", tone: "danger" },
  export: { label: "Exported CSV", tone: "info" },
  delete_row: { label: "Deleted row", tone: "danger" },
  change_role: { label: "Changed role", tone: "warning" },
  reset_password: { label: "Reset password", tone: "warning" },
  create_tenant: { label: "Created tenant", tone: "success" },
  maintenance_platform: { label: "Platform maintenance", tone: "warning" },
  maintenance_tenant: { label: "Tenant maintenance", tone: "warning" },
  update_tenant: { label: "Updated tenant", tone: "info" },
  create_user: { label: "Added user", tone: "success" },
  activate_user: { label: "Reactivated user", tone: "info" },
  deactivate_user: { label: "Deactivated user", tone: "warning" },
  run_job: { label: "Ran job", tone: "neutral" },
};

/** Tenant actions look like "role.update" or "user_deactivated": made readable, toned by their verb. */
function actionMeta(action: string): { label: string; tone: Tone } {
  const known = ACTIONS[action];
  if (known) return known;
  const words = action.replace(/[._]+/g, " ").trim();
  const tone: Tone = /delete|remove|deactivat|fail|reject/.test(action) ? "danger" : /create|add|approve|activat/.test(action) ? "success" : /update|change|reset|role/.test(action) ? "warning" : "neutral";
  return { label: words ? words[0].toUpperCase() + words.slice(1) : action, tone };
}

const describe = (details: AuditEntry["details"]) =>
  details
    ? Object.entries(details)
        .filter(([key, value]) => key !== "tenantId" && value !== null && value !== undefined && value !== "")
        .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
        .join(" · ")
    : "";

const SOURCES = [
  { id: "all", label: "Everything" },
  { id: "tenant", label: "Tenant's own log" },
  { id: "console", label: "Console actions" },
] as const;

export interface AuditLogViewProps {
  page: number;
  tenantId?: number;
  tenantName?: string;
  source: NonNullable<AuditQuery["source"]>;
  onPageChange: (page: number) => void;
  onSourceChange: (source: NonNullable<AuditQuery["source"]>) => void;
}

/** Feature component: the console's own log, or one tenant's audit log merged with console actions about it. */
export function AuditLogView({ page, tenantId, tenantName, source, onPageChange, onSourceChange }: AuditLogViewProps) {
  const { data, isPending, isFetching, isPlaceholderData, error, refetch } = useAdminAudit({ page, tenantId, source: tenantId ? source : "console" });

  const filter = tenantId ? (
    <div role="group" aria-label="Audit source" className="flex w-fit max-w-full flex-wrap gap-1 rounded-lg border bg-card p-1">
      {SOURCES.map(item => (
        <button
          key={item.id}
          type="button"
          aria-pressed={source === item.id}
          onClick={() => onSourceChange(item.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            source === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">The console&apos;s own activity. Choose a tenant to see its audit log too.</p>
  );

  let body;
  if (isPending) body = <LoadingState label="Loading audit log…" />;
  else if (error) body = <ErrorState message="Unable to load the audit log." onRetry={() => void refetch()} />;
  else if (!data.entries.length) {
    body = (
      <EmptyState
        title="Nothing recorded yet"
        message={tenantId ? `No ${source === "console" ? "console actions about" : "activity in"} ${tenantName ?? "this tenant"} yet.` : "Sign-ins, exports, and changes made in this console are recorded here."}
        icon={ScrollText}
      />
    );
  } else {
    body = (
      <div className="flex flex-col gap-2">
        <div className={cn("relative overflow-x-auto rounded-xl border bg-card transition-opacity", isPlaceholderData && "opacity-60")} aria-busy={isFetching}>
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{tenantName ? `${tenantName} audit log` : "Console audit log"}</caption>
            <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  When
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Action
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Target
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Details
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  By
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  IP
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.entries.map(entry => {
                const action = actionMeta(entry.action);
                const details = describe(entry.details);
                return (
                  <tr key={entry.key}>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">{formatCell("created_at", entry.createdAt)}</td>
                    <td className="px-3 py-2">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={action.tone}>{action.label}</Badge>
                        {tenantId && <span className="text-xs text-muted-foreground">{entry.source === "console" ? "Console" : "Tenant"}</span>}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{entry.target ?? "—"}</td>
                    <td className="max-w-80 px-3 py-2 text-muted-foreground">
                      <span className="block truncate" title={details}>
                        {details || "—"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{entry.actor}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">{entry.ip ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={onPageChange} disabled={isFetching} />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {filter}
      {body}
    </div>
  );
}
