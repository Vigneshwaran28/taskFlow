"use client";
import { useState } from "react";
import { ArrowRight, Building2, CalendarClock, Database, Globe, Hourglass, PauseCircle, Search, Trash2, UserCheck, Users } from "lucide-react";
import { MODULES, type ModuleMeta } from "@/app-shell/modules";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { WorkspaceLoginLink } from "@/features/auth";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { useAdminOverview } from "../hooks/useAdmin";
import type { OverviewAll, OverviewTenant, TableModule, TableSummary, TenantCard } from "../services/adminService";
import { moduleMeta, TABLE_ICONS } from "../utils/tableMeta";
import { TenantStatusPill } from "./TenantStatusPill";
import { TenantAdminPasswordRequestsPanel } from "./TenantAdminPasswordRequestsPanel";
import type { TenantFilter } from "./TenantsView";

export interface AdminOverviewProps {
  tenantId?: number;
  onOpenTenant: (tenantId: number) => void;
  onOpenTable: (table: string) => void;
  onOpenUsers: () => void;
  /** Show the Tenants view with a filter (the recycle-bin card opens the bin) */
  onOpenTenants?: (filter: TenantFilter) => void;
}

/** Feature component: cross-tenant totals and tenant cards, or one tenant's records per module. */
export function AdminOverview({ tenantId, onOpenTenant, onOpenTable, onOpenUsers, onOpenTenants }: AdminOverviewProps) {
  const { data, isPending, error, refetch } = useAdminOverview(tenantId);

  if (isPending) return <LoadingState label="Loading overview…" />;
  if (error) return <ErrorState message={tenantId ? "Unable to load this tenant's overview." : "Unable to load the overview."} onRetry={() => void refetch()} />;
  if (data.scope === "tenant") return <TenantOverview data={data} onOpenTable={onOpenTable} onOpenUsers={onOpenUsers} />;
  return <AllTenantsOverview data={data} onOpenTenant={onOpenTenant} onOpenTenants={onOpenTenants} />;
}

function ModuleBadges({ features, max = 6 }: { features: TenantCard["features"]; max?: number }) {
  if (!features.length) return <p className="text-xs text-muted-foreground">No modules</p>;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Enabled modules">
      {features.slice(0, max).map(key => {
        const meta = MODULES[key] as ModuleMeta | undefined;
        const Icon = meta?.icon;
        return (
          <li key={key}>
            <Badge tone="primary">
              {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
              {meta?.label ?? key}
            </Badge>
          </li>
        );
      })}
      {features.length > max && (
        <li>
          <Badge>+{features.length - max} more</Badge>
        </li>
      )}
    </ul>
  );
}

type Attention = "ending" | "grace" | null;

function AllTenantsOverview({ data, onOpenTenant, onOpenTenants }: { data: OverviewAll; onOpenTenant: (id: number) => void; onOpenTenants?: (filter: TenantFilter) => void }) {
  const [attention, setAttention] = useState<Attention>(null);
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const tenants = data.tenants.filter(
    tenant =>
      (!term || tenant.name.toLowerCase().includes(term) || tenant.slug.includes(term) || tenant.siteTitle.toLowerCase().includes(term)) &&
      (!attention || (attention === "grace" ? tenant.subscription?.state === "grace" || tenant.subscription?.state === "expired" : tenant.subscription?.state === attention))
  );
  const toggle = (next: Attention) => setAttention(current => (current === next ? null : next));
  const cardButton = "rounded-xl text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>div]:h-full [&>div]:transition-colors [&>div:hover]:border-primary/40";
  const { totals } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tenants" value={totals.tenants} icon={Building2} />
        <StatCard label="Suspended tenants" value={totals.suspendedTenants} icon={PauseCircle} tone={totals.suspendedTenants ? "danger" : "primary"} hint={`${totals.activeTenants} active`} />
        <StatCard label="Users" value={totals.users} icon={Users} />
        <StatCard label="Active users" value={totals.activeUsers} icon={UserCheck} tone="success" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Subscriptions and recycle bin">
        <button type="button" className={cardButton} aria-pressed={attention === "ending"} onClick={() => toggle("ending")} title="Show only these tenants below">
          <StatCard label="Expiring in 30 days" value={totals.expiringSoon} icon={CalendarClock} tone={totals.expiringSoon ? "warning" : "primary"} hint={attention === "ending" ? "Showing these below" : "Subscriptions ending soon"} />
        </button>
        <button type="button" className={cardButton} aria-pressed={attention === "grace"} onClick={() => toggle("grace")} title="Show only these tenants below">
          <StatCard
            label="In grace period"
            value={totals.inGrace}
            icon={Hourglass}
            tone={totals.inGrace || totals.expired ? "danger" : "primary"}
            hint={attention === "grace" ? "Showing these below" : totals.expired ? `${totals.expired} expired (sign-in stopped)` : "Ended, access continues"}
          />
        </button>
        <button type="button" className={cardButton} onClick={() => onOpenTenants?.("deleted")} disabled={!onOpenTenants} title="Open the recycle bin">
          <StatCard label="In the recycle bin" value={totals.recycleBin} icon={Trash2} tone="primary" hint="Deleted, restorable" />
        </button>
      </div>

      <TenantAdminPasswordRequestsPanel />

      <section aria-labelledby="overview-tenants-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="overview-tenants-heading" className="text-lg font-semibold tracking-tight">
              Tenants
            </h2>
            <p className="text-sm text-muted-foreground">Open a tenant to see its users, roles, data, insights, and audit log. Nothing from inside a tenant is shown until you do.</p>
          </div>
          <label className="relative block w-full sm:w-64">
            <span className="sr-only">Filter tenants</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Filter tenants"
              className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>

        {!data.tenants.length ? (
          <EmptyState title="No tenants yet" message="Create a tenant in the Tenants view: its modules, branding, and owner account." icon={Building2} />
        ) : !tenants.length ? (
          <EmptyState
            title={term ? `No tenant matches "${query.trim()}"` : "No tenants here"}
            message={attention ? "Clear the subscription filter by clicking its card again." : "Try the name or the address."}
            icon={Search}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tenants.map(tenant => {
              const siteTitle = tenant.siteTitle.trim();
              return (
                <li key={tenant.id} className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold" title={tenant.name}>
                        {tenant.name}
                      </p>
                      <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                        <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="sr-only">Website title:</span>
                        <span className="truncate">{siteTitle || "No website title (uses the name)"}</span>
                      </p>
                    </div>
                    <TenantStatusPill status={tenant.status} subscription={tenant.subscription} className="shrink-0" />
                  </div>
                  <ModuleBadges features={tenant.features} />
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Users</dt>
                      <dd className="font-medium tabular-nums">
                        {tenant.users.active} active
                        <span className="font-normal text-muted-foreground"> / {tenant.users.total}</span>
                        {tenant.maxUsers != null && <span className="block text-xs font-normal text-muted-foreground">Limit {tenant.maxUsers}</span>}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Plan</dt>
                      <dd className="truncate font-medium">{tenant.subscription?.plan || "—"}</dd>
                      <dd className="truncate text-xs text-muted-foreground">{tenant.subscription?.endsOn ? `Ends ${formatDate(tenant.subscription.endsOn)}` : `Since ${formatDate(tenant.createdAt)}`}</dd>
                    </div>
                  </dl>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
                    <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">/{tenant.slug}</span>
                    <Button size="sm" variant="secondary" onClick={() => onOpenTenant(tenant.id)} aria-label={`Open ${tenant.name}`}>
                      Open
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

interface ModuleGroup {
  module: TableModule;
  tables: TableSummary[];
  total: number;
  licensed: boolean;
}

function groupByModule(data: OverviewTenant): ModuleGroup[] {
  const groups = new Map<TableModule, TableSummary[]>();
  for (const table of data.tables) groups.set(table.module, [...(groups.get(table.module) ?? []), table]);
  const features: readonly string[] = data.tenant.features;
  return [...groups.entries()]
    .map(([module, tables]) => ({ module, tables, total: tables.reduce((sum, table) => sum + table.count, 0), licensed: module === "workspace" || features.includes(module) }))
    .sort((a, b) => Number(b.module === "workspace") - Number(a.module === "workspace") || Number(b.licensed) - Number(a.licensed) || b.total - a.total);
}

function TenantOverview({ data, onOpenTable, onOpenUsers }: { data: OverviewTenant; onOpenTable: (table: string) => void; onOpenUsers: () => void }) {
  const { tenant } = data;
  const groups = groupByModule(data);
  const records = data.tables.reduce((sum, table) => sum + table.count, 0);

  return (
    <div className="flex flex-col gap-6">
      <TenantAdminPasswordRequestsPanel />
      <section aria-label={`${tenant.name} summary`} className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 truncate text-lg font-semibold">{tenant.name}</span>
              <TenantStatusPill status={tenant.status} subscription={tenant.subscription} />
            </p>
            <p className="text-sm text-muted-foreground">
              {tenant.siteTitle.trim() ? `Website title "${tenant.siteTitle.trim()}" · ` : ""}since {formatDate(tenant.createdAt)}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onOpenUsers}>
            <Users className="h-4 w-4" aria-hidden="true" />
            Users ({tenant.users.total})
          </Button>
        </div>
        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/50 pl-3">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Sign-in</span>
          <WorkspaceLoginLink slug={tenant.slug} name={tenant.name} className="min-w-0 flex-1" />
        </div>
        <ModuleBadges features={tenant.features} max={20} />
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active users" value={tenant.users.active} icon={UserCheck} tone="success" hint={tenant.maxUsers != null ? `of ${tenant.maxUsers} allowed` : "No user limit"} />
        <StatCard label="Modules" value={tenant.features.length} icon={Building2} />
        <StatCard label="Records" value={records} icon={Database} hint="Across every table" />
      </div>

      <section aria-labelledby="overview-modules-heading" className="flex flex-col gap-3">
        <h2 id="overview-modules-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Records per module
        </h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map(group => {
            const { label, icon: Icon } = moduleMeta(group.module);
            return (
              <li key={group.module} className={cn("flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4", !group.licensed && "opacity-70")}>
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-accent p-2 text-accent-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">{group.licensed ? `${group.total} records` : `Not licensed · ${group.total} records`}</span>
                  </span>
                </div>
                <ul className="flex flex-col">
                  {group.tables.map(table => {
                    const TableIcon = TABLE_ICONS[table.name] ?? Database;
                    return (
                      <li key={table.name}>
                        <button
                          type="button"
                          onClick={() => onOpenTable(table.name)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <TableIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">{table.label}</span>
                          <span className="tabular-nums text-muted-foreground">{table.count}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
