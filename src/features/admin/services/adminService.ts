import { ApiError, apiClient, apiUrl } from "@/lib/apiClient";
import type { FeatureKey, WorkspaceSettings } from "@/types/session";

type Signal = { signal?: AbortSignal };

export interface AdminSession {
  username: string;
  /** ISO time the admin session ends */
  expiresAt?: string;
}

/** Which part of the product a table belongs to: a licensed module, the workspace itself, or the provider. */
export type TableModule = FeatureKey | "workspace" | "provider";

export interface TableSummary {
  name: string;
  label: string;
  module: TableModule;
  count: number;
}

/** A role as listed by the console (custom roles have key null). */
export interface AdminRoleRef {
  key: string | null;
  name: string;
}

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  jobTitle: string | null;
  roles: AdminRoleRef[];
  isActive: boolean;
  tenant: { id: number; name: string } | null;
  createdAt: string;
  lists: number;
  tasks: number;
  openTasks: number;
  notifications: number;
}

export type TenantStatus = "active" | "suspended";

/** none = no end date; ending = within 30 days; grace = ended but still has access; expired = nobody can sign in */
export type SubscriptionState = "none" | "active" | "ending" | "grace" | "expired";

export interface TenantSubscription {
  /** Free text (Trial, Standard, Business, …) */
  plan: string;
  /** YYYY-MM-DD */
  startsOn: string | null;
  /** null = no end date */
  endsOn: string | null;
  graceDays: number;
  /** Last day anyone can sign in (end date + grace days) */
  graceEndsOn: string | null;
  /** Days until the end date (negative once past) */
  daysLeft: number | null;
  state: SubscriptionState;
}

/** A tenant as an overview card (no data from inside the tenant). */
export interface TenantCard {
  id: number;
  name: string;
  slug: string;
  /** Website title ("" = the tenant name) */
  siteTitle: string;
  status: TenantStatus;
  features: FeatureKey[];
  maxUsers: number | null;
  users: { total: number; active: number };
  subscription?: TenantSubscription;
  createdAt: string;
}

/** GET /overview without a tenant: cross-tenant aggregates only. */
export interface OverviewAll {
  scope: "all";
  totals: {
    tenants: number;
    activeTenants: number;
    suspendedTenants: number;
    users: number;
    activeUsers: number;
    /** Subscription ends within 30 days */
    expiringSoon: number;
    inGrace: number;
    expired: number;
    /** Deleted tenants waiting in the recycle bin */
    recycleBin: number;
  };
  tenants: TenantCard[];
}

/** GET /overview?tenantId: one tenant's row counts per table and its users. */
export interface OverviewTenant {
  scope: "tenant";
  tenant: TenantCard;
  tables: TableSummary[];
  users: UserSummary[];
}

export type SortOrder = "asc" | "desc";

export interface TableQuery {
  page?: number;
  pageSize?: number;
  /** Required by the API for every table except "tenants" */
  tenantId?: number;
  userId?: number;
  search?: string;
  /** Column name */
  sort?: string;
  order?: SortOrder;
}

/** A raw database row keyed by column name. */
export type TableRow = Record<string, unknown>;

export interface TableRows {
  table: string;
  /** Primary key column ("id" for every table except clinic_providers, keyed by user_id) */
  key: string;
  /** Column names in database order */
  columns: string[];
  rows: TableRow[];
  total: number;
  page: number;
  totalPages: number;
  sort: string;
  order: SortOrder;
}

export interface CountByName {
  name: string;
  count: number;
}

export interface Insights {
  totals: { users: number; newUsers: number; tasks: number; open: number; overdue: number; completedWeek: number; unread: number };
  byStatus: CountByName[];
  byPriority: CountByName[];
  /** UTC days, oldest first */
  daily: { day: string; created: number; completed: number }[];
}

export type AuditSource = "console" | "tenant";

export interface AuditEntry {
  id: number;
  /** Unique across both sources, e.g. "tenant-12" */
  key: string;
  /** console = done in this console; tenant = the tenant's own audit log */
  source: AuditSource;
  actor: string;
  /** login, export, delete_row, change_role, … or a tenant action like "role.update" */
  action: string;
  /** e.g. "users#4" */
  target: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

export interface AuditPage {
  entries: AuditEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AuditQuery {
  page?: number;
  tenantId?: number;
  source?: "all" | AuditSource;
}

/** hospital, logistics, retail, services, custom (server: services/moduleCatalog.js) */
export type IndustryKey = "hospital" | "logistics" | "retail" | "services" | "custom";

export interface IndustryMeta {
  key: IndustryKey;
  label: string;
  description: string;
  /** Modules a tenant of this industry may be licensed for */
  allowed: FeatureKey[];
  /** What a new tenant of this industry starts with */
  recommended: FeatureKey[];
}

export interface ModuleRelation {
  /** Hard dependencies: can't be licensed without them */
  requires: FeatureKey[];
  /** Soft links: "works well with" */
  enhances: FeatureKey[];
  /** Why they relate, for hints */
  note: string | null;
}

/** How modules relate and what each industry offers (GET /bunny/tenants). */
export interface ModuleCatalog {
  common: FeatureKey[];
  modules: Partial<Record<FeatureKey, ModuleRelation>>;
  industries: IndustryMeta[];
  defaultIndustry: IndustryKey;
}

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  status: TenantStatus;
  /** Enabled module keys */
  features: FeatureKey[];
  /** Older tenants are "custom" */
  industry?: IndustryKey;
  /** null = unlimited */
  maxUsers: number | null;
  contactEmail: string | null;
  /** Resolved settings (stored changes merged over the defaults) */
  settings: WorkspaceSettings;
  users: { total: number; active: number };
  subscription?: TenantSubscription;
  /** Set while the tenant is in the recycle bin */
  deletedAt?: string | null;
  /** Console username that deleted it */
  deletedBy?: string | null;
  /** Where its data lives (the platform database, or one of its own) */
  database?: TenantDatabaseLabel;
  createdAt: string;
  updatedAt?: string;
}

// ---- Databases (server: routes/adminDatabase.js, services/tenantDatabases.js) ----
export type DatabaseClient = "sqlite" | "postgres" | "mysql" | "mariadb";

/** A connection as the console sends it. An empty password keeps the saved one when editing. */
export type DatabaseConfigInput =
  | { client: "sqlite"; filename: string }
  | { client: Exclude<DatabaseClient, "sqlite">; host: string; port: number; database: string; user: string; password: string; ssl: boolean };

/** A saved connection as the server shows it (never the password). */
export type DatabaseConfigView =
  | { client: "sqlite"; label: string; filename: string }
  | { client: Exclude<DatabaseClient, "sqlite">; label: string; host: string; port: number; database: string; user: string; ssl: boolean; hasPassword: boolean };

export interface TenantDatabaseLabel {
  mode: "platform" | "dedicated";
  client: DatabaseClient | null;
  label: string;
}

export interface DatabaseEngine {
  key: DatabaseClient;
  label: string;
  defaultPort: number | null;
  note: string;
  /** Its driver is installed on the server */
  available: boolean;
}

export interface DatabasesOverview {
  platform: { config: DatabaseConfigView; label: string; version: string | null; previous: string | null; switchedAt: string | null; switching: { startedAt: string; to: string } | null };
  engines: DatabaseEngine[];
  tenants: { id: number; name: string; slug: string; deleted: boolean; mode: "platform" | "dedicated"; label: string; client: DatabaseClient }[];
}

export interface TableRelation {
  name: string;
  columns: number;
  primary: string[];
  references: { columns: string[]; table: string; onDelete: string | null }[];
}

/** Which tables each module brings (core tables every workspace has). */
export interface DatabaseSchema {
  core: string[];
  platform: string[];
  modules: Partial<Record<FeatureKey, string[]>>;
  tables: TableRelation[];
}

export interface TenantDatabaseInfo {
  mode: "platform" | "dedicated";
  label: string;
  config: DatabaseConfigView | null;
  tables: string[];
  missing?: string[];
  status: "ok" | "unreachable";
  error?: string;
  relations: TableRelation[];
}

export interface DatabaseChoice {
  mode: "platform" | "dedicated";
  config?: DatabaseConfigInput;
  /** PostgreSQL / MySQL: create the database when it doesn't exist */
  createDatabase?: boolean;
}

export interface DatabaseTestResult {
  ok: true;
  version: string;
  createdDatabase: boolean;
  label: string;
}

export interface PlatformSwitchResult {
  version: string;
  tables: number;
  rows: number;
  from: string;
  to: string;
}

/** live = not in the recycle bin (default); deleted = only the recycle bin */
export type TenantScope = "live" | "deleted";

export interface TenantList {
  /** Every licensable module key, in the server's order */
  features: FeatureKey[];
  /** Module dependencies and industries; null from an older server */
  catalog: ModuleCatalog | null;
  defaultSettings: WorkspaceSettings;
  scope: TenantScope;
  /** Every tenant by bucket, for the Active / Suspended / Recycle bin filter */
  counts: { active: number; suspended: number; deleted: number };
  tenants: Tenant[];
}

export interface PurgeResult {
  id: number;
  name: string;
  slug: string;
  /** Rows removed per table (only tables that had rows) */
  removed: Record<string, number>;
  total: number;
}

/** A person of one tenant, for picking broadcast recipients. */
export interface TenantPerson {
  id: number;
  name: string;
  email: string;
  roles: AdminRoleRef[];
  isActive: boolean;
  /** Owner or manages users: receives "tenant admins only" broadcasts */
  isAdmin: boolean;
}

export type BroadcastKind = "announcement" | "maintenance" | "subscription";
export type BroadcastSeverity = "info" | "warning" | "critical";
export type BroadcastAudience = "all" | "tenants" | "users";
export type BroadcastRecipients = "admins" | "everyone";
export type BroadcastState = "scheduled" | "live" | "expired" | "retracted";

export interface BroadcastTarget {
  tenantId: number;
  tenantName: string | null;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
}

export interface Broadcast {
  id: number;
  kind: BroadcastKind;
  severity: BroadcastSeverity;
  title: string;
  body: string;
  audience: BroadcastAudience;
  recipients: BroadcastRecipients;
  targets: BroadcastTarget[];
  createdBy: string | null;
  publishAt: string;
  expiresAt: string | null;
  retractedAt: string | null;
  createdAt: string;
  state: BroadcastState;
  reads: number;
  dismissed: number;
  /** Who it reaches now (null once retracted or expired) */
  recipientCount: number | null;
}

export interface BroadcastInput {
  kind: Exclude<BroadcastKind, "subscription">;
  severity: BroadcastSeverity;
  title: string;
  body: string;
  audience: BroadcastAudience;
  recipients: BroadcastRecipients;
  tenantIds: number[];
  userIds: number[];
  /** People by tenant (tenants with their own database number their people independently) */
  users?: { tenantId: number; userId: number }[];
  /** ISO; null = publish now */
  publishAt: string | null;
  expiresAt: string | null;
}

/** A settings patch: any settings key, any subset of its fields. */
export type SettingsPatch = { [K in keyof WorkspaceSettings]?: Partial<WorkspaceSettings[K]> };

export interface TenantPlan {
  name: string;
  industry?: IndustryKey;
  features: FeatureKey[];
  settings: SettingsPatch;
  maxUsers: number | null;
  contactEmail: string | null;
  plan?: string;
  /** YYYY-MM-DD or null */
  subscriptionStartsOn?: string | null;
  subscriptionEndsOn?: string | null;
  graceDays?: number;
}

export interface CreateTenantInput extends TenantPlan {
  slug?: string;
  owner: { name: string; email: string; password: string };
  /** Default: the platform database */
  database?: DatabaseChoice;
}

export type TenantChanges = Partial<TenantPlan & { status: TenantStatus }> & { database?: { config: DatabaseConfigInput } };

export interface TenantRole {
  id: number;
  /** owner, admin, agent, member for built-in roles; null for custom roles */
  key: string | null;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
  members: { total: number; active: number };
  createdAt: string;
  updatedAt: string;
}

export type ConsoleRole = "admin" | "agent" | "member";

export interface CreateTenantUserInput {
  tenantId: number;
  name: string;
  email: string;
  role: ConsoleRole;
  password: string;
}

/** User actions pass the tenant being viewed so the API refuses users of another tenant. */
interface UserTarget {
  id: number;
  tenantId?: number;
}

const EMPTY_TOTALS: Insights["totals"] = { users: 0, newUsers: 0, tasks: 0, open: 0, overdue: 0, completedWeek: 0, unread: 0 };
const EMPTY_ALL: OverviewAll = {
  scope: "all",
  totals: { tenants: 0, activeTenants: 0, suspendedTenants: 0, users: 0, activeUsers: 0, expiringSoon: 0, inGrace: 0, expired: 0, recycleBin: 0 },
  tenants: [],
};

/** Query params for a table request; empty values are dropped by the API client. */
const tableParams = ({ page = 1, pageSize = 20, tenantId, userId, search, sort, order }: TableQuery = {}) => ({ page, pageSize, tenantId, userId, search, sort, order });

export const adminService = {
  /** Current admin session, or null when not signed in as admin. */
  async me({ signal }: Signal = {}): Promise<AdminSession | null> {
    try {
      return await apiClient.get<AdminSession>("/bunny/me", { signal });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },

  login: (credentials: { username: string; password: string }) => apiClient.post<AdminSession>("/bunny/login", credentials),

  logout: () => apiClient.post<null>("/bunny/logout"),

  /** Cross-tenant aggregates (no tenant), or one tenant's counts and users. */
  async getOverview(tenantId: number | undefined, { signal }: Signal = {}): Promise<OverviewAll | OverviewTenant> {
    const data = await apiClient.get<OverviewAll | OverviewTenant | null>("/bunny/overview", { params: { tenantId }, signal });
    if (data?.scope === "tenant") return { ...data, tables: data.tables ?? [], users: data.users ?? [] };
    if (data?.scope === "all") return { ...EMPTY_ALL, ...data, totals: { ...EMPTY_ALL.totals, ...data.totals }, tenants: data.tenants ?? [] };
    return EMPTY_ALL;
  },

  async getInsights(tenantId: number | undefined, { signal }: Signal = {}): Promise<Insights> {
    const data = await apiClient.get<Partial<Insights> | null>("/bunny/insights", { params: { tenantId }, signal });
    return {
      totals: { ...EMPTY_TOTALS, ...data?.totals },
      byStatus: data?.byStatus ?? [],
      byPriority: data?.byPriority ?? [],
      daily: data?.daily ?? [],
    };
  },

  async getTableRows(table: string, query: TableQuery = {}, { signal }: Signal = {}): Promise<TableRows> {
    const data = await apiClient.get<Partial<TableRows> | null>(`/bunny/tables/${encodeURIComponent(table)}`, { params: tableParams(query), signal });
    return {
      table: data?.table ?? table,
      key: data?.key ?? "id",
      columns: data?.columns ?? [],
      rows: data?.rows ?? [],
      total: data?.total ?? 0,
      page: data?.page ?? 1,
      totalPages: data?.totalPages ?? 1,
      sort: data?.sort ?? "id",
      order: data?.order ?? "asc",
    };
  },

  /** All rows matching the filters (up to 10,000) as CSV text. */
  async exportTable(table: string, query: TableQuery = {}): Promise<string> {
    const { tenantId, userId, search, sort, order } = query;
    const text = await apiClient.get<unknown>(`/bunny/tables/${encodeURIComponent(table)}/export`, { params: { tenantId, userId, search, sort, order }, timeout: 60_000 });
    return typeof text === "string" ? text : "";
  },

  /** Deletes a row; the API checks it belongs to the tenant. */
  deleteRow: ({ table, id, tenantId }: { table: string; id: number; tenantId: number }) => apiClient.delete(`/bunny/tables/${encodeURIComponent(table)}/${id}`, { params: { tenantId } }),

  changeRole: ({ id, tenantId, role }: UserTarget & { role: ConsoleRole }) =>
    apiClient.patch<{ id: number; role: ConsoleRole }>(`/bunny/users/${id}/role`, { role }, { params: { tenantId } }),

  resetPassword: ({ id, tenantId, password }: UserTarget & { password: string }) => apiClient.post<null>(`/bunny/users/${id}/password`, { password }, { params: { tenantId } }),

  setUserActive: ({ id, tenantId, isActive }: UserTarget & { isActive: boolean }) =>
    apiClient.patch<{ id: number; isActive: boolean }>(`/bunny/users/${id}/active`, { isActive }, { params: { tenantId } }),

  async getAudit({ page = 1, tenantId, source = "all" }: AuditQuery = {}, { signal }: Signal = {}): Promise<AuditPage> {
    const data = await apiClient.get<Partial<AuditPage> | null>("/bunny/audit", { params: { page, pageSize: 25, tenantId, source: tenantId ? source : undefined }, signal });
    const entries = (data?.entries ?? []).map(entry => ({ ...entry, source: entry.source ?? "console", key: entry.key ?? `${entry.source ?? "console"}-${entry.id}` }));
    return { entries, total: data?.total ?? 0, page: data?.page ?? page, totalPages: data?.totalPages ?? 1 };
  },

  async listTenants({ signal, scope = "live" }: Signal & { scope?: TenantScope } = {}): Promise<TenantList> {
    const data = await apiClient.get<Partial<TenantList> | null>("/bunny/tenants", { params: { scope: scope === "live" ? undefined : scope }, signal });
    return {
      features: data?.features ?? [],
      catalog: data?.catalog ?? null,
      defaultSettings: data?.defaultSettings ?? ({} as WorkspaceSettings),
      scope: data?.scope ?? scope,
      counts: { active: 0, suspended: 0, deleted: 0, ...data?.counts },
      tenants: data?.tenants ?? [],
    };
  },

  /** Moves a tenant to the recycle bin: nobody can sign in, its data is kept. */
  deleteTenant: (id: number) => apiClient.delete<Tenant>(`/bunny/tenants/${id}`),

  restoreTenant: (id: number) => apiClient.post<Tenant>(`/bunny/tenants/${id}/restore`),

  /** Deletes a tenant from the recycle bin for good; `slug` must be typed to confirm. */
  purgeTenant: ({ id, slug }: { id: number; slug: string }) => apiClient.post<PurgeResult>(`/bunny/tenants/${id}/purge`, { slug }),

  /**
   * Downloads a tenant as a standalone app (ZIP of code + data). Streams the response so `onProgress` can report the
   * bytes received; the server sends no length up front (it builds the archive while sending it).
   */
  async exportStandalone(id: number, { onProgress, signal }: Signal & { onProgress?: (bytes: number) => void } = {}): Promise<{ blob: Blob; filename: string }> {
    let response: Response;
    try {
      response = await fetch(apiUrl(`/bunny/tenants/${id}/export`), { credentials: "include", signal });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ApiError({ status: 0, message: "Can't reach the server. Check your connection." });
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string; code?: string } | null;
      throw new ApiError({ status: response.status, code: body?.code, message: body?.message ?? "The export failed. Please try again.", data: body });
    }
    const filename = response.headers.get("X-Export-Filename") ?? `tenant-${id}-taskflow-standalone.zip`;
    const reader = response.body?.getReader();
    if (!reader) return { blob: await response.blob(), filename };
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      onProgress?.(received);
    }
    return { blob: new Blob(chunks, { type: "application/zip" }), filename };
  },

  sendRenewalReminder: (id: number) => apiClient.post<{ broadcastId: number; recipients: number }>(`/bunny/tenants/${id}/renewal-reminder`),

  async tenantPeople(id: number, { signal }: Signal = {}): Promise<TenantPerson[]> {
    return (await apiClient.get<TenantPerson[] | null>(`/bunny/tenants/${id}/users`, { signal })) ?? [];
  },

  async listBroadcasts({ signal, kind = "provider" }: Signal & { kind?: "provider" | "subscription" | "all" } = {}): Promise<Broadcast[]> {
    const data = await apiClient.get<{ items?: Broadcast[] } | null>("/bunny/broadcasts", { params: { kind }, signal });
    return data?.items ?? [];
  },

  createBroadcast: (input: BroadcastInput) => apiClient.post<{ id: number; state: BroadcastState; recipientCount: number }>("/bunny/broadcasts", input),

  updateBroadcast: ({ id, input }: { id: number; input: BroadcastInput }) => apiClient.patch<{ id: number; state: BroadcastState }>(`/bunny/broadcasts/${id}`, input),

  retractBroadcast: (id: number) => apiClient.post<{ id: number; state: BroadcastState }>(`/bunny/broadcasts/${id}/retract`),

  /** Creates a tenant and its first admin (the owner). */
  createTenant: (input: CreateTenantInput) => apiClient.post<Tenant & { ownerId: number }>("/bunny/tenants", input),

  updateTenant: ({ id, changes }: { id: number; changes: TenantChanges }) => apiClient.patch<Tenant>(`/bunny/tenants/${id}`, changes),

  async tenantRoles(id: number, { signal }: Signal = {}): Promise<TenantRole[]> {
    return (await apiClient.get<TenantRole[] | null>(`/bunny/tenants/${id}/roles`, { signal })) ?? [];
  },

  createTenantUser: ({ tenantId, ...input }: CreateTenantUserInput) => apiClient.post<{ id: number }>(`/bunny/tenants/${tenantId}/users`, input),

  getMaintenance: ({ signal }: Signal = {}) => apiClient.get<MaintenanceOverview>("/bunny/maintenance", { signal }),

  /** The window for every tenant. */
  setPlatformMaintenance: (input: MaintenanceInput) => apiClient.put<MaintenanceSetting>("/bunny/maintenance/platform", input),

  setTenantMaintenance: ({ id, input }: { id: number; input: MaintenanceInput }) => apiClient.put<MaintenanceSetting>(`/bunny/maintenance/tenants/${id}`, input),

  getDatabases: ({ signal }: Signal = {}) => apiClient.get<DatabasesOverview>("/bunny/databases", { signal }),

  /** Tries a connection; tenantId: an empty password uses that tenant's saved one. */
  testDatabase: (input: { config: DatabaseConfigInput; createDatabase?: boolean; tenantId?: number }) => apiClient.post<DatabaseTestResult>("/bunny/databases/test", input, { timeout: 30_000 }),

  /** Copies the platform database to another one and switches to it (minutes on a large install). */
  switchPlatformDatabase: (input: { config: DatabaseConfigInput; createDatabase: boolean; confirm: "SWITCH" }) =>
    apiClient.post<PlatformSwitchResult>("/bunny/databases/platform/switch", input, { timeout: 30 * 60_000 }),

  getDatabaseSchema: ({ signal }: Signal = {}) => apiClient.get<DatabaseSchema>("/bunny/databases/schema", { signal }),

  getTenantDatabase: (id: number, { signal }: Signal = {}) => apiClient.get<TenantDatabaseInfo>(`/bunny/databases/tenants/${id}`, { signal }),

  /** Tenant admin password reset requests across all workspaces */
  async passwordRequests({ signal }: Signal = {}): Promise<TenantAdminPasswordRequest[]> {
    const data = await apiClient.get<TenantAdminPasswordRequest[] | null>("/bunny/password-requests", { signal });
    return Array.isArray(data) ? data : [];
  },

  /** Issue a secure one-time password reset link for a tenant admin or user in /bunny */
  createResetLink: ({ id, tenantId, expiresInHours = 24 }: { id: number; tenantId?: number; expiresInHours?: number }) =>
    apiClient.post<ResetLink>(`/bunny/users/${id}/reset-link`, { expiresInHours, tenantId }),

  dismissPasswordRequest: (id: number) => apiClient.post<null>(`/bunny/password-requests/${id}/dismiss`),
};

export interface TenantAdminPasswordRequest {
  id: number;
  status: "requested" | "issued" | "used" | "dismissed" | "expired";
  requestedAt: string | null;
  requestedIp: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  user: { id: number; name: string; email: string; jobTitle: string | null };
  tenant: { id: number; name: string; slug: string };
}

export interface ResetLink {
  url: string;
  token: string;
  expiresAt: string;
}

// ---- Maintenance windows (server: routes/adminMaintenance.js) ----
export type MaintenanceState = "off" | "scheduled" | "active" | "ended";

export interface MaintenanceInput {
  enabled: boolean;
  message: string;
  /** null = from now */
  startsAt: string | null;
  /** null = until switched off */
  endsAt: string | null;
  /** Workspace owners and admins can still sign in */
  allowAdmins: boolean;
}

export interface MaintenanceSetting extends MaintenanceInput {
  state: MaintenanceState;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface MaintenanceOverview {
  platform: MaintenanceSetting;
  tenants: { id: number; name: string; slug: string; status: TenantStatus; maintenance: MaintenanceSetting }[];
}
