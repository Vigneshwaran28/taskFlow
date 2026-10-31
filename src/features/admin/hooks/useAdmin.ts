import { keepPreviousData, useMutation, useQuery, useQueryClient, type Query } from "@tanstack/react-query";
import { adminService, type AdminSession, type AuditQuery, type OverviewTenant, type TableQuery, type TenantScope } from "../services/adminService";

export const adminKeys = {
  all: ["admin"] as const,
  session: ["admin", "session"] as const,
  overview: (tenantId?: number) => ["admin", "overview", tenantId ?? "all"] as const,
  insights: (tenantId?: number) => ["admin", "insights", tenantId ?? "all"] as const,
  table: (table: string, query: TableQuery) => ["admin", "table", table, query] as const,
  auditAll: ["admin", "audit"] as const,
  audit: (query: AuditQuery) => ["admin", "audit", query] as const,
  tenants: ["admin", "tenants"] as const,
  tenantList: (scope: TenantScope) => ["admin", "tenants", scope] as const,
  tenantPeople: (id: number) => ["admin", "tenant-people", id] as const,
  broadcasts: ["admin", "broadcasts"] as const,
  tenantRoles: (id: number) => ["admin", "tenant-roles", id] as const,
  maintenance: ["admin", "maintenance"] as const,
  databases: ["admin", "databases"] as const,
  databaseSchema: ["admin", "database-schema"] as const,
  tenantDatabase: (id: number) => ["admin", "tenant-database", id] as const,
  passwordRequests: ["admin", "password-requests"] as const,
};

/** Every cached admin query except the session itself. */
const isAdminData = (query: Query) => query.queryKey[0] === "admin" && query.queryKey[1] !== "session";

export function useAdminSession() {
  return useQuery({
    queryKey: adminKeys.session,
    queryFn: ({ signal }) => adminService.me({ signal }),
    staleTime: 5 * 60_000,
  });
}

/** Signing in or out as admin drops every cached admin query, then seeds the session. */
function useAdminSessionMutation<TInput>(mutationFn: (input: TInput) => Promise<AdminSession | null>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: session => {
      queryClient.removeQueries({ queryKey: adminKeys.all });
      queryClient.setQueryData(adminKeys.session, session ?? null);
    },
  });
}

export const useAdminLogin = () => useAdminSessionMutation(adminService.login);
export const useAdminLogout = () =>
  useAdminSessionMutation(async () => {
    await adminService.logout();
    return null;
  });

/** Refetch every admin view (tables, counts, insights, audit log). */
export function useRefreshAdmin() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ predicate: isAdminData });
}

/** Cross-tenant aggregates (no tenant) or one tenant's counts and users. */
export function useAdminOverview(tenantId?: number) {
  return useQuery({
    queryKey: adminKeys.overview(tenantId),
    queryFn: ({ signal }) => adminService.getOverview(tenantId, { signal }),
  });
}

/** One tenant's overview (counts per table and its users); idle without a tenant. */
export function useTenantOverview(tenantId: number | undefined) {
  return useQuery({
    queryKey: adminKeys.overview(tenantId),
    queryFn: ({ signal }) => adminService.getOverview(tenantId, { signal }),
    enabled: Boolean(tenantId),
    select: data => (data.scope === "tenant" ? data : null) as OverviewTenant | null,
  });
}

export function useAdminInsights(tenantId?: number) {
  return useQuery({
    queryKey: adminKeys.insights(tenantId),
    queryFn: ({ signal }) => adminService.getInsights(tenantId, { signal }),
  });
}

/** Rows of one table; the tenants table is the only one listed without a tenant. */
export function useAdminTable(table: string, query: TableQuery) {
  return useQuery({
    queryKey: adminKeys.table(table, query),
    queryFn: ({ signal }) => adminService.getTableRows(table, query, { signal }),
    placeholderData: keepPreviousData,
    enabled: table === "tenants" || Boolean(query.tenantId),
  });
}

export function useAdminAudit(query: AuditQuery) {
  return useQuery({
    queryKey: adminKeys.audit(query),
    queryFn: ({ signal }) => adminService.getAudit(query, { signal }),
    placeholderData: keepPreviousData,
  });
}

/** Exports are recorded in the audit log, so refresh it afterwards. */
export function useExportTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ table, query }: { table: string; query: TableQuery }) => adminService.exportTable(table, query),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.auditAll }),
  });
}

/** Downloads a tenant as a standalone app; the export is audit-logged, so the log is refreshed afterwards. */
export function useExportStandalone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, onProgress, signal }: { id: number; onProgress?: (bytes: number) => void; signal?: AbortSignal }) => adminService.exportStandalone(id, { onProgress, signal }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.auditAll }),
  });
}

/** Changes can affect any count, table, or chart: refresh all admin data. */
function useAdminChange<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ predicate: isAdminData }),
  });
}

/** Tenants outside the recycle bin (default), or only the recycle bin. */
export function useTenants(scope: TenantScope = "live", { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: adminKeys.tenantList(scope), queryFn: ({ signal }) => adminService.listTenants({ signal, scope }), enabled });
}

/** One tenant's people with their admin flag (for picking broadcast recipients); idle without a tenant. */
export function useTenantPeople(tenantId: number | undefined) {
  return useQuery({
    queryKey: adminKeys.tenantPeople(tenantId ?? 0),
    queryFn: ({ signal }) => adminService.tenantPeople(tenantId!, { signal }),
    enabled: Boolean(tenantId),
  });
}

/** Sent, scheduled, and expired provider announcements (subscription notices left out). */
export function useBroadcasts() {
  return useQuery({ queryKey: adminKeys.broadcasts, queryFn: ({ signal }) => adminService.listBroadcasts({ signal }) });
}

export function useTenantRoles(tenantId: number) {
  return useQuery({ queryKey: adminKeys.tenantRoles(tenantId), queryFn: ({ signal }) => adminService.tenantRoles(tenantId, { signal }) });
}

export function useMaintenanceOverview() {
  return useQuery({ queryKey: adminKeys.maintenance, queryFn: ({ signal }) => adminService.getMaintenance({ signal }), refetchInterval: 60_000 });
}
export const useSetPlatformMaintenance = () => useAdminChange(adminService.setPlatformMaintenance);
export const useSetTenantMaintenance = () => useAdminChange(adminService.setTenantMaintenance);
export const useCreateTenant = () => useAdminChange(adminService.createTenant);
export const useUpdateTenant = () => useAdminChange(adminService.updateTenant);
export const useCreateTenantUser = () => useAdminChange(adminService.createTenantUser);
export const useSetUserActive = () => useAdminChange(adminService.setUserActive);
export const useDeleteRow = () => useAdminChange(adminService.deleteRow);
export const useChangeRole = () => useAdminChange(adminService.changeRole);
export const useResetPassword = () => useAdminChange(adminService.resetPassword);
export const useDeleteTenant = () => useAdminChange(adminService.deleteTenant);
export const useRestoreTenant = () => useAdminChange(adminService.restoreTenant);
export const usePurgeTenant = () => useAdminChange(adminService.purgeTenant);
export const useSendRenewalReminder = () => useAdminChange(adminService.sendRenewalReminder);
export const useCreateBroadcast = () => useAdminChange(adminService.createBroadcast);
export const useUpdateBroadcast = () => useAdminChange(adminService.updateBroadcast);
export const useRetractBroadcast = () => useAdminChange(adminService.retractBroadcast);

// ---- Databases ----
export function useDatabases() {
  return useQuery({ queryKey: adminKeys.databases, queryFn: ({ signal }) => adminService.getDatabases({ signal }) });
}

/** Which tables each module brings and how they link (changes only with a server update). */
export function useDatabaseSchema() {
  return useQuery({ queryKey: adminKeys.databaseSchema, queryFn: ({ signal }) => adminService.getDatabaseSchema({ signal }), staleTime: 30 * 60_000 });
}

export function useTenantDatabase(tenantId: number | undefined) {
  return useQuery({ queryKey: adminKeys.tenantDatabase(tenantId ?? 0), queryFn: ({ signal }) => adminService.getTenantDatabase(tenantId!, { signal }), enabled: Boolean(tenantId) });
}

export const useTestDatabase = () => useMutation({ mutationFn: adminService.testDatabase });
export const useSwitchPlatformDatabase = () => useAdminChange(adminService.switchPlatformDatabase);

// ---- Password Reset Requests (Tenant Admins) ----
export function useTenantAdminPasswordRequests() {
  return useQuery({
    queryKey: adminKeys.passwordRequests,
    queryFn: ({ signal }) => adminService.passwordRequests({ signal }),
    refetchInterval: 30_000,
  });
}
export const useCreateAdminResetLink = () => useAdminChange(adminService.createResetLink);
export const useDismissAdminPasswordRequest = () => useAdminChange(adminService.dismissPasswordRequest);
