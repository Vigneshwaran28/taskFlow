"use client";
import { Building2, SearchX } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/States";
import { Button } from "@/components/ui/Button";
import { useDocumentTitle } from "@/lib/documentBranding";
import { useSearchParamsState } from "@/lib/navigation";
import { AdminHeader } from "../components/AdminHeader";
import { AdminNav, isAdminView, viewNeedsTenant, type AdminView } from "../components/AdminNav";
import { AdminOverview } from "../components/AdminOverview";
import { AuditLogView } from "../components/AuditLogView";
import { BroadcastsView } from "../components/BroadcastsView";
import { DatabasesView } from "../components/DatabasesView";
import { InsightsView } from "../components/InsightsView";
import { MaintenanceView } from "../components/MaintenanceView";
import { RolesView } from "../components/RolesView";
import { TableBrowser, type BrowserChanges } from "../components/TableBrowser";
import { TenantStatusPill } from "../components/TenantStatusPill";
import { TenantsView, type TenantFilter } from "../components/TenantsView";
import { TenantSwitcher } from "../components/TenantSwitcher";
import { UsersView } from "../components/UsersView";
import { useTenants } from "../hooks/useAdmin";
import type { AuditQuery, SortOrder } from "../services/adminService";

/** Tables a tenant's data browser can show (the server lists the same; "tenants" itself is not tenant data). */
const TABLES: readonly string[] = [
  "users",
  "teams",
  "tickets",
  "ticket_comments",
  "products",
  "stock_movements",
  "customers",
  "deals",
  "orders",
  "order_items",
  "invoices",
  "invoice_items",
  "invoice_payments",
  "carriers",
  "vehicles",
  "shipments",
  "shipment_events",
  "clinic_providers",
  "patients",
  "appointments",
  "clinic_visits",
  "prescriptions",
  "attendance_records",
  "leave_requests",
  "holidays",
  "roles",
  "tenant_audit",
  "expenses",
  "announcements",
  "lists",
  "tasks",
  "notifications",
];

type AuditSource = NonNullable<AuditQuery["source"]>;
const TENANT_FILTERS: readonly string[] = ["all", "active", "suspended", "deleted"];
const isTenantFilter = (value: string | null): value is TenantFilter => Boolean(value && TENANT_FILTERS.includes(value));

const isAuditSource = (value: string | null): value is AuditSource => value === "all" || value === "console" || value === "tenant";

function headingFor(view: AdminView, tenantName: string | undefined): { title: string; description: string } {
  const of = tenantName ? ` of ${tenantName}` : "";
  switch (view) {
    case "overview":
      return tenantName
        ? { title: tenantName, description: "Records per module, users, and the sign-in link of this tenant." }
        : { title: "Overview", description: "Totals across every tenant. Choose a tenant to see its data." };
    case "tenants":
      return { title: "Tenants", description: "Customer companies: their modules, subscriptions, branding, user limits, and sign-in pages. Deleted tenants wait in the recycle bin." };
    case "announcements":
      return { title: "Announcements", description: "Messages from you to every tenant, chosen tenants, or individual people. Subscription reminders go out automatically." };
    case "maintenance":
      return { title: "Maintenance", description: "Close the whole platform or single tenants for maintenance, now or on a schedule. People see a maintenance page; you choose whether workspace admins can still sign in." };
    case "databases":
      return { title: "Databases", description: "The platform database, moving it to another engine, and where each tenant's data lives (SQLite, PostgreSQL, MySQL, MariaDB)." };
    case "users":
      return { title: "Users", description: `Accounts${of}: roles, passwords, and access.` };
    case "roles":
      return { title: "Roles", description: `Roles${of} and what each one allows.` };
    case "data":
      return { title: "Data", description: `Every table${of}, one tenant at a time.` };
    case "insights":
      return { title: "Insights", description: tenantName ? `How ${tenantName} uses TaskFlow.` : "How TaskFlow is used, summed over every tenant." };
    case "audit":
      return {
        title: "Audit log",
        description: tenantName ? `${tenantName}'s own audit log plus every console action about it, newest first.` : "Every console sign-in attempt, export, and change, newest first.",
      };
  }
}

interface ConsoleState {
  view: AdminView;
  tenant?: number;
  table: string;
  user?: number;
  q: string;
  sort?: string;
  order?: SortOrder;
  page: number;
  source: AuditSource;
}

/**
 * The provider console. URL state (?tenant=2&view=data&table=tasks&user=3&q=report&sort=due_at&order=desc&page=2)
 * keeps every view linkable. The tenant comes first: without one only cross-tenant aggregates are shown.
 */
export function AdminDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParamsState();
  const tenantsQuery = useTenants();
  const viewParam = searchParams.get("view");
  const tableParam = searchParams.get("table");
  const sourceParam = searchParams.get("source");
  const view: AdminView = isAdminView(viewParam) ? viewParam : "overview";
  const table = tableParam && TABLES.includes(tableParam) ? tableParam : "users";
  const userId = Number(searchParams.get("user")) || undefined;
  const tenantId = Number(searchParams.get("tenant")) || undefined;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const search = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") || undefined;
  const order: SortOrder = searchParams.get("order") === "desc" ? "desc" : "asc";
  const source: AuditSource = isAuditSource(sourceParam) ? sourceParam : "all";
  const filterParam = searchParams.get("filter");
  const tenantFilter: TenantFilter = isTenantFilter(filterParam) ? filterParam : "all";

  const tenants = tenantsQuery.data?.tenants ?? [];
  const tenant = tenants.find(item => item.id === tenantId);
  const missingTenant = Boolean(tenantId && tenantsQuery.isSuccess && !tenant);
  const scopedTenantId = missingTenant ? undefined : tenantId;

  /** Merge changes into the URL; any change other than the page itself goes back to page 1. */
  function update(changes: BrowserChanges & { source?: AuditSource; filter?: TenantFilter }) {
    const next: ConsoleState = { view, tenant: tenantId, table, user: userId, q: search, sort, order, page: 1, source };
    if ("view" in changes && changes.view && isAdminView(changes.view)) next.view = changes.view;
    if ("tenant" in changes && changes.tenant !== tenantId) {
      // A different tenant: its own users, search, and sort.
      next.tenant = changes.tenant;
      next.user = undefined;
      next.q = "";
      next.sort = undefined;
      next.order = undefined;
    }
    if ("table" in changes && changes.table) next.table = changes.table;
    if ("user" in changes) next.user = changes.user;
    if ("search" in changes) next.q = changes.search ?? "";
    if ("sort" in changes) next.sort = changes.sort;
    if ("order" in changes) next.order = changes.order;
    if ("source" in changes && changes.source) next.source = changes.source;
    if ("page" in changes && changes.page) next.page = changes.page;

    const params: Record<string, string> = {};
    if (next.tenant) params.tenant = String(next.tenant);
    if (next.view !== "overview") params.view = next.view;
    if (next.view === "data") {
      if (next.table !== "users") params.table = next.table;
      if (next.user) params.user = String(next.user);
      if (next.q) params.q = next.q;
      if (next.sort) params.sort = next.sort;
      if (next.sort && next.order === "desc") params.order = "desc";
    }
    if (next.view === "audit" && next.source !== "all") params.source = next.source;
    if (next.view === "tenants" && changes.filter && changes.filter !== "all") params.filter = changes.filter;
    if (next.page > 1) params.page = String(next.page);
    setSearchParams(params);
  }

  const heading = headingFor(view, tenant?.name);
  useDocumentTitle(`${heading.title} · Provider console`);
  const needsTenant = viewNeedsTenant(view) && !scopedTenantId;

  let content;
  if (missingTenant) {
    content = (
      <EmptyState
        title={`Tenant #${tenantId} not found`}
        message="It may be in the recycle bin or deleted permanently, or the link is wrong."
        icon={SearchX}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => update({ tenant: undefined, view: "overview" })}>Show all tenants</Button>
            <Button variant="secondary" onClick={() => update({ tenant: undefined, view: "tenants", filter: "deleted" })}>
              Open the recycle bin
            </Button>
          </div>
        }
      />
    );
  } else if (needsTenant) {
    content = (
      <section aria-labelledby="choose-tenant-heading" className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-card px-4 py-10 text-center">
        <Building2 className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <div>
          <h2 id="choose-tenant-heading" className="text-lg font-semibold">
            Choose a tenant first
          </h2>
          <p className="text-sm text-muted-foreground">{heading.title} show one tenant&apos;s data at a time.</p>
        </div>
        {tenants.length ? (
          <ul className="flex max-w-2xl flex-wrap justify-center gap-2">
            {tenants.slice(0, 12).map(item => (
              <li key={item.id}>
                <Button variant="secondary" size="sm" onClick={() => update({ tenant: item.id, view })}>
                  {item.name}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <Button variant="secondary" onClick={() => update({ view: "tenants" })}>
            Create a tenant
          </Button>
        )}
        {tenants.length > 12 && <p className="text-xs text-muted-foreground">Or search all {tenants.length} tenants with the tenant picker above.</p>}
      </section>
    );
  } else if (view === "overview") {
    content = (
      <AdminOverview
        key={scopedTenantId ?? "all"}
        tenantId={scopedTenantId}
        onOpenTenant={id => update({ tenant: id, view: "overview" })}
        onOpenTable={name => update({ view: "data", table: name, sort: undefined, order: undefined, search: "", user: undefined })}
        onOpenUsers={() => update({ view: "users" })}
        onOpenTenants={filter => update({ view: "tenants", filter })}
      />
    );
  } else if (view === "tenants") {
    content = (
      <TenantsView
        key={tenantFilter}
        initialFilter={tenantFilter}
        selectedTenantId={scopedTenantId}
        onOpen={id => update({ tenant: id, view: "overview" })}
        onUsers={id => update({ tenant: id, view: "users" })}
      />
    );
  } else if (view === "announcements") {
    content = <BroadcastsView />;
  } else if (view === "maintenance") {
    content = <MaintenanceView />;
  } else if (view === "databases") {
    content = <DatabasesView onOpenTenant={id => update({ tenant: id, view: "overview" })} />;
  } else if (view === "users" && scopedTenantId) {
    content = <UsersView key={scopedTenantId} tenantId={scopedTenantId} onViewUserData={id => update({ view: "data", table: "tasks", user: id, search: "", sort: undefined, order: undefined })} />;
  } else if (view === "roles" && scopedTenantId) {
    content = <RolesView tenantId={scopedTenantId} />;
  } else if (view === "data" && scopedTenantId) {
    content = <TableBrowser table={table} tenantId={scopedTenantId} userId={userId} page={page} search={search} sort={sort} order={order} onChange={update} />;
  } else if (view === "insights") {
    content = <InsightsView tenantId={scopedTenantId} tenantName={tenant?.name} />;
  } else {
    content = (
      <AuditLogView
        page={page}
        tenantId={scopedTenantId}
        tenantName={tenant?.name}
        source={source}
        onPageChange={next => update({ page: next })}
        onSourceChange={next => update({ source: next })}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <AdminHeader />
      <div className="border-b bg-card/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tenant</span>
          <TenantSwitcher
            tenants={tenants}
            value={scopedTenantId}
            loading={tenantsQuery.isPending}
            onChange={id => update({ tenant: id, view: !id && viewNeedsTenant(view) ? "overview" : view })}
          />
          {tenant && (
            <span className="flex min-w-0 items-center gap-2 sm:ml-10">
              <TenantStatusPill status={tenant.status} subscription={tenant.subscription} />
              <span className="truncate text-sm text-muted-foreground">
                {tenant.users.active} active user{tenant.users.active === 1 ? "" : "s"} · {tenant.features.length} module{tenant.features.length === 1 ? "" : "s"}
              </span>
            </span>
          )}
        </div>
      </div>
      <main className="mx-auto flex min-w-0 max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex min-w-0 flex-col gap-4">
          <PageHeader title={heading.title} description={heading.description} />
          <AdminNav view={view} hasTenant={Boolean(scopedTenantId)} onChange={id => update({ view: id })} />
        </div>
        {content}
      </main>
    </div>
  );
}
