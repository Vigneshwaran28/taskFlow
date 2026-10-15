"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ArrowRight, BellRing, Building2, CalendarClock, Globe, PackageOpen, Pause, Pencil, Play, Plus, RotateCcw, Search, Trash2, Users } from "lucide-react";
import { MODULES, type ModuleMeta } from "@/app-shell/modules";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { WorkspaceLoginLink } from "@/features/auth";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { useDeleteTenant, useRestoreTenant, useSendRenewalReminder, useTenants, useUpdateTenant } from "../hooks/useAdmin";
import type { IndustryKey, IndustryMeta, Tenant, TenantStatus } from "../services/adminService";
import { industryMeta } from "../utils/moduleRules";
import { IndustryBadge } from "./IndustryPicker";
import { PurgeTenantDialog } from "./PurgeTenantDialog";
import { TenantStatusPill } from "./TenantStatusPill";

// Loaded when first opened: keeps the big tenant form and the export out of the page's first download.
const ExportStandaloneDialog = dynamic(() => import("./ExportStandaloneDialog").then(module => module.ExportStandaloneDialog), { ssr: false });
const TenantFormDialog = dynamic(() => import("./TenantFormDialog").then(module => module.TenantFormDialog), { ssr: false });

type FormState = { tenant: Tenant | null; key: number } | null;

/** all = every tenant outside the recycle bin */
export type TenantFilter = "all" | "active" | "suspended" | "deleted";

export interface TenantsViewProps {
  /** The tenant chosen in the switcher (highlighted) */
  selectedTenantId?: number;
  /** Select the tenant (and show its overview) */
  onOpen: (tenantId: number) => void;
  /** Select the tenant and show its users */
  onUsers: (tenantId: number) => void;
  /** Starting filter (the overview's recycle-bin card opens the bin) */
  initialFilter?: TenantFilter;
}

const searchClass =
  "h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const matchesTerm = (tenant: Tenant, term: string) =>
  !term || tenant.name.toLowerCase().includes(term) || tenant.slug.includes(term) || (tenant.contactEmail ?? "").toLowerCase().includes(term) || (tenant.subscription?.plan ?? "").toLowerCase().includes(term);

/** Feature component: every customer tenant with its plan, seats, subscription, and sign-in link; create, edit, suspend, delete; the recycle bin. */
export function TenantsView({ selectedTenantId, onOpen, onUsers, initialFilter = "all" }: TenantsViewProps) {
  const toast = useToast();
  const [filter, setFilter] = useState<TenantFilter>(initialFilter);
  const liveQuery = useTenants("live");
  const binQuery = useTenants("deleted", { enabled: filter === "deleted" });
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();
  const restoreTenant = useRestoreTenant();
  const reminder = useSendRenewalReminder();
  const [form, setForm] = useState<FormState>(null);
  const [suspending, setSuspending] = useState<Tenant | null>(null);
  const [deleting, setDeleting] = useState<Tenant | null>(null);
  const [purging, setPurging] = useState<Tenant | null>(null);
  const [exporting, setExporting] = useState<Tenant | null>(null);
  const [query, setQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState<IndustryKey | "all">("all");

  const { data, isPending, error, refetch } = liveQuery;
  if (isPending) return <LoadingState label="Loading tenants…" />;
  if (error) return <ErrorState message="Unable to load tenants." onRetry={() => void refetch()} />;

  const openForm = (tenant: Tenant | null = null) => setForm(current => ({ tenant, key: (current?.key ?? 0) + 1 }));
  const tenants = data.tenants;
  const { counts } = data;
  const term = query.trim().toLowerCase();
  const byStatus = filter === "active" || filter === "suspended" ? tenants.filter(tenant => (filter === "active" ? tenant.status === "active" : tenant.status !== "active")) : tenants;
  const catalog = data.catalog;
  const byIndustry = industryFilter === "all" ? byStatus : byStatus.filter(tenant => (tenant.industry ?? "custom") === industryFilter);
  const shown = byIndustry.filter(tenant => matchesTerm(tenant, term));
  const totalUsers = tenants.reduce((sum, tenant) => sum + tenant.users.active, 0);

  const FILTERS: { id: TenantFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.active + counts.suspended },
    { id: "active", label: "Active", count: counts.active },
    { id: "suspended", label: "Suspended", count: counts.suspended },
    { id: "deleted", label: "Recycle bin", count: counts.deleted },
  ];

  function setStatus(tenant: Tenant, status: TenantStatus) {
    updateTenant.mutate(
      { id: tenant.id, changes: { status } },
      {
        onSuccess: () => {
          setSuspending(null);
          toast.success(
            status === "suspended" ? `${tenant.name} suspended` : `${tenant.name} reactivated`,
            status === "suspended" ? "Its users are signed out and can't sign in." : "Its users can sign in again."
          );
        },
        onError: err => {
          setSuspending(null);
          toast.error("Couldn't change the tenant", err.message);
        },
      }
    );
  }

  function moveToBin(tenant: Tenant) {
    deleteTenant.mutate(tenant.id, {
      onSuccess: () => {
        setDeleting(null);
        toast.success(`${tenant.name} moved to the recycle bin`, "Nobody can sign in. Restore it from the recycle bin, or delete it permanently.");
      },
      onError: err => {
        setDeleting(null);
        toast.error("Couldn't delete the tenant", err.message);
      },
    });
  }

  function restore(tenant: Tenant) {
    restoreTenant.mutate(tenant.id, {
      onSuccess: () => toast.success(`${tenant.name} restored`, "Its users can sign in again."),
      onError: err => toast.error("Couldn't restore the tenant", err.message),
    });
  }

  function sendReminder(tenant: Tenant) {
    reminder.mutate(tenant.id, {
      onSuccess: result => toast.success("Renewal reminder sent", `${result.recipients} admin${result.recipients === 1 ? "" : "s"} of ${tenant.name} notified in the app.`),
      onError: err => toast.error("Couldn't send the reminder", err.message),
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Show tenants" className="flex w-full min-w-0 overflow-x-auto rounded-lg border bg-card p-0.5 sm:w-max">
          {FILTERS.map(item => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filter === item.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.id === "deleted" && <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
              {item.label}
              <span className={cn("tabular-nums", filter === item.id ? "opacity-80" : "text-muted-foreground")}>{item.count}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {catalog && filter !== "deleted" && (
            <label className="block w-full sm:w-48">
              <span className="sr-only">Industry</span>
              <select value={industryFilter} onChange={event => setIndustryFilter(event.target.value as IndustryKey | "all")} className={selectClass}>
                <option value="all">All industries</option>
                {catalog.industries.map(industry => (
                  <option key={industry.key} value={industry.key}>
                    {industry.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="relative block w-full sm:w-60">
            <span className="sr-only">Filter tenants</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter tenants" className={searchClass} />
          </label>
          <Button onClick={() => openForm()}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New tenant
          </Button>
        </div>
      </div>

      {filter === "deleted" ? (
        <RecycleBin query={binQuery} term={term} onRestore={restore} restoring={restoreTenant.isPending ? restoreTenant.variables : undefined} onPurge={setPurging} />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium tabular-nums text-foreground">{counts.active}</span> active of {counts.active + counts.suspended} tenants ·{" "}
            <span className="font-medium tabular-nums text-foreground">{totalUsers}</span> active users
          </p>
          {!tenants.length ? (
            <EmptyState
              title="Create your first workspace"
              message="Each tenant is one customer company with its own address, modules, plan, and owner. The owner signs in at /<address>/login and manages their own people, roles, and restrictions."
              icon={Building2}
              action={
                <Button onClick={() => openForm()}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New tenant
                </Button>
              }
            />
          ) : !shown.length ? (
            <EmptyState
              title={term ? `No tenant matches "${query.trim()}"` : industryFilter !== "all" ? `No ${industryMeta(catalog, industryFilter)?.label ?? industryFilter} tenants` : `No ${filter} tenants`}
              message={term ? "Try the name, address, plan, or contact email." : undefined}
              icon={Search}
            />
          ) : (
            <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {shown.map(tenant => (
                <TenantCardItem
                  key={tenant.id}
                  tenant={tenant}
                  industry={industryMeta(catalog, tenant.industry)}
                  selected={tenant.id === selectedTenantId}
                  onEdit={() => openForm(tenant)}
                  onOpen={() => onOpen(tenant.id)}
                  onUsers={() => onUsers(tenant.id)}
                  onActivate={() => setStatus(tenant, "active")}
                  activating={updateTenant.isPending && updateTenant.variables?.id === tenant.id}
                  onSuspend={() => setSuspending(tenant)}
                  onDelete={() => setDeleting(tenant)}
                  onExport={() => setExporting(tenant)}
                  onRemind={() => sendReminder(tenant)}
                  reminding={reminder.isPending && reminder.variables === tenant.id}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {form && <TenantFormDialog key={form.key} tenant={form.tenant} features={data.features} catalog={catalog} defaultSettings={data.defaultSettings} onClose={() => setForm(null)} onOpenTenant={onOpen} />}
      {exporting && <ExportStandaloneDialog key={exporting.id} tenant={exporting} onClose={() => setExporting(null)} />}
      {purging && <PurgeTenantDialog key={purging.id} tenant={purging} onClose={() => setPurging(null)} />}
      <ConfirmDialog
        open={Boolean(suspending)}
        title={`Suspend ${suspending?.name ?? "tenant"}?`}
        message="All of its users are signed out and can't sign in until you activate it again. Its data is kept."
        confirmLabel="Suspend tenant"
        pending={updateTenant.isPending}
        onConfirm={() => suspending && setStatus(suspending, "suspended")}
        onCancel={() => setSuspending(null)}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.name ?? "tenant"}?`}
        message="It moves to the recycle bin: everyone is signed out, nobody can sign in, and its sign-in page disappears. Its data and address are kept until you delete it permanently, and you can restore it at any time."
        confirmLabel="Move to recycle bin"
        pending={deleteTenant.isPending}
        onConfirm={() => deleting && moveToBin(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

interface TenantCardItemProps {
  tenant: Tenant;
  /** The tenant's industry (null: an older server without industries) */
  industry: IndustryMeta | null;
  selected: boolean;
  onEdit: () => void;
  onOpen: () => void;
  onUsers: () => void;
  onActivate: () => void;
  activating: boolean;
  onSuspend: () => void;
  onDelete: () => void;
  onExport: () => void;
  onRemind: () => void;
  reminding: boolean;
}

function TenantCardItem({ tenant, industry, selected, onEdit, onOpen, onUsers, onActivate, activating, onSuspend, onDelete, onExport, onRemind, reminding }: TenantCardItemProps) {
  const suspended = tenant.status !== "active";
  const seatsFull = tenant.maxUsers != null && tenant.users.active >= tenant.maxUsers;
  const siteTitle = tenant.settings?.branding?.siteTitle?.trim();
  const subscription = tenant.subscription;
  return (
    <li className={cn("flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5", selected && "border-primary ring-1 ring-primary")} data-testid="tenant-card">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="min-w-0 truncate text-base font-semibold">{tenant.name}</span>
            <TenantStatusPill status={tenant.status} subscription={subscription} />
            <IndustryBadge industry={industry} />
          </p>
          {siteTitle && siteTitle !== tenant.name && (
            <p className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground" title="Website title">
              <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">Website title:</span>
              <span className="truncate">{siteTitle}</span>
            </p>
          )}
          <p className="truncate text-xs text-muted-foreground">
            {tenant.contactEmail ? `${tenant.contactEmail} · ` : ""}since {formatDate(tenant.createdAt)}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Edit ${tenant.name}`} title="Edit">
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/50 pl-3">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">Sign-in</span>
        <WorkspaceLoginLink slug={tenant.slug} name={tenant.name} className="min-w-0 flex-1" />
      </div>

      <ul className="flex flex-wrap gap-1.5" aria-label="Enabled modules">
        {tenant.features.map(key => {
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
      </ul>

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="flex items-center justify-between">
            <span className="text-muted-foreground">Active users</span>
            <span className={cn("font-medium tabular-nums", seatsFull && "text-destructive")}>
              {tenant.users.active}
              {tenant.maxUsers != null ? ` / ${tenant.maxUsers}` : " (no limit)"}
            </span>
          </dt>
          {tenant.maxUsers != null && (
            <dd className="mt-1.5 h-1.5 rounded-full bg-muted" aria-hidden="true">
              <div className={cn("h-full rounded-full", seatsFull ? "bg-destructive" : "bg-primary")} style={{ width: `${Math.min(100, (tenant.users.active / tenant.maxUsers) * 100)}%` }} />
            </dd>
          )}
        </div>
        <div className="flex min-w-0 items-start gap-2">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="sr-only">Subscription</dt>
            <dd className="truncate font-medium">{subscription?.plan || "No plan"}</dd>
            <dd className="truncate text-xs text-muted-foreground">
              {subscription?.endsOn ? `Ends ${formatDate(subscription.endsOn)} · ${subscription.graceDays} grace day${subscription.graceDays === 1 ? "" : "s"}` : "No end date"}
            </dd>
          </div>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3">
        <Button size="sm" onClick={onOpen} aria-label={`Open ${tenant.name}`}>
          Open
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button variant="secondary" size="sm" onClick={onUsers} aria-label={`${tenant.name} users`}>
          <Users className="h-4 w-4" aria-hidden="true" />
          Users ({tenant.users.total})
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {subscription?.endsOn && (
            <Button variant="ghost" size="sm" onClick={onRemind} loading={reminding} aria-label={`Send renewal reminder now to ${tenant.name}`} title="Send renewal reminder now">
              <BellRing className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Remind</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onExport} aria-label={`Export ${tenant.name} as a standalone app`} title="Export as standalone app (code + data)">
            <PackageOpen className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          {suspended ? (
            <Button variant="ghost" size="sm" onClick={onActivate} loading={activating}>
              <Play className="h-4 w-4" aria-hidden="true" />
              Activate
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={onSuspend}>
              <Pause className="h-4 w-4" aria-hidden="true" />
              Suspend
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={onDelete} aria-label={`Delete ${tenant.name}`} title="Delete (to the recycle bin)">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </li>
  );
}

interface RecycleBinProps {
  query: ReturnType<typeof useTenants>;
  term: string;
  onRestore: (tenant: Tenant) => void;
  /** id of the tenant being restored */
  restoring?: number;
  onPurge: (tenant: Tenant) => void;
}

/** Deleted tenants: kept (and their address reserved) until deleted permanently. */
function RecycleBin({ query, term, onRestore, restoring, onPurge }: RecycleBinProps) {
  const { data, isPending, error, refetch } = query;
  if (isPending) return <LoadingState label="Loading the recycle bin…" />;
  if (error) return <ErrorState message="Unable to load the recycle bin." onRetry={() => void refetch()} />;
  const tenants = data.tenants.filter(tenant => matchesTerm(tenant, term));
  if (!data.tenants.length) return <EmptyState title="The recycle bin is empty" message="Deleted tenants wait here until you restore them or delete them permanently." icon={Trash2} />;
  if (!tenants.length) return <EmptyState title={`No deleted tenant matches "${term}"`} icon={Search} />;

  return (
    <section aria-label="Recycle bin" className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Nobody can sign in to these tenants and their sign-in pages are gone. Their data and addresses are kept until you delete them permanently.</p>
      <ul className="flex flex-col divide-y rounded-xl border bg-card" data-testid="recycle-bin">
        {tenants.map(tenant => (
          <li key={tenant.id} className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="min-w-0 truncate font-semibold">{tenant.name}</span>
                <span className="font-mono text-xs text-muted-foreground">/{tenant.slug}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Deleted {formatDateTime(tenant.deletedAt)}
                {tenant.deletedBy ? ` by ${tenant.deletedBy}` : ""} · {tenant.users.total} user{tenant.users.total === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-muted-foreground">Kept until you delete it permanently.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => onRestore(tenant)} loading={restoring === tenant.id} aria-label={`Restore ${tenant.name}`}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Restore
              </Button>
              <Button variant="danger" size="sm" onClick={() => onPurge(tenant)} aria-label={`Delete ${tenant.name} permanently`}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete permanently
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
