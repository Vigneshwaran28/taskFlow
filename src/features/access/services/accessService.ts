import { apiClient } from "@/lib/apiClient";

export interface Permission {
  /** e.g. "attendance.leave.approve" */
  key: string;
  /** "workspace" or a module key */
  module: string;
  label: string;
  description: string;
}

export interface Role {
  id: number;
  /** owner, admin, agent, member for built-in roles; null for custom roles */
  key: string | null;
  name: string;
  description: string | null;
  /** Built-in: can't be renamed or deleted */
  isSystem: boolean;
  /** Owner: always every permission */
  locked: boolean;
  permissions: string[];
  /** Active people holding the role */
  members: number;
}

export interface RolesResponse {
  roles: Role[];
  catalog: Permission[];
  /** The signed-in user's own permissions */
  mine: string[];
  isOwner: boolean;
}

export interface RoleInput {
  name?: string;
  description: string | null;
  permissions: string[];
}

export interface AuditEntry {
  id: number;
  /** e.g. "user.roles", "role.permissions", "leave.approve" */
  action: string;
  target: string | null;
  details: Record<string, unknown> | null;
  actor: { id: number; name: string } | null;
  createdAt: string;
}

export interface AuditQuery {
  page: number;
  action?: string;
  search?: string;
}

export interface AuditPage {
  entries: AuditEntry[];
  page: number;
  total: number;
  totalPages: number;
}

// ---- Access rules (server: routes/accessRules.js) ----
export type AccessLevel = "none" | "read" | "write" | "manage";
export type RuleLevel = AccessLevel | "custom";
export type RuleMode = "grant" | "limit";
export type RuleState = "active" | "scheduled" | "expired" | "off";

export interface CatalogPermission extends Permission {
  /** The level that includes it: read < write < manage */
  level: AccessLevel;
}

export interface AccessRule {
  id: number;
  name: string;
  description: string;
  /** grant: adds access; limit: caps the modules it names (wins over roles and grants) */
  mode: RuleMode;
  /** Module key -> level (modules not listed are untouched) */
  levels: Record<string, RuleLevel>;
  /** Permission keys for modules set to custom */
  permissions: string[];
  /** YYYY-MM-DD or null */
  startsOn: string | null;
  endsOn: string | null;
  isActive: boolean;
  state: RuleState;
  users: { id: number; name: string; email: string; isActive: boolean }[];
  updatedAt: string;
}

export interface AccessRulesResponse {
  rules: AccessRule[];
  catalog: CatalogPermission[];
  /** Modules the workspace has (workspace first) */
  modules: string[];
  levels: AccessLevel[];
  mine: string[];
  isOwner: boolean;
}

export interface AccessRuleInput {
  name: string;
  description: string | null;
  mode: RuleMode;
  levels: Record<string, RuleLevel>;
  permissions: string[];
  startsOn: string | null;
  endsOn: string | null;
  isActive: boolean;
  userIds: number[];
}

export interface ExplainedPermission {
  key: string;
  label: string;
  module: string;
  level: AccessLevel;
  granted: boolean;
  sources: { type: "role" | "grant"; id: number; name: string }[];
  limitedBy: { id: number; name: string }[];
}

export interface AccessExplanation {
  user: { id: number; name: string; email: string; isActive: boolean };
  isOwner: boolean;
  roles: { id: number; name: string }[];
  rules: { id: number; name: string; mode: RuleMode; state: RuleState }[];
  permissions: ExplainedPermission[];
  total: number;
}

type RequestContext = { signal?: AbortSignal };

export const accessService = {
  async roles({ signal }: RequestContext = {}): Promise<RolesResponse> {
    const data = await apiClient.get<Partial<RolesResponse> | null>("/roles", { signal });
    return { roles: data?.roles ?? [], catalog: data?.catalog ?? [], mine: data?.mine ?? [], isOwner: Boolean(data?.isOwner) };
  },

  createRole: (input: RoleInput) => apiClient.post<Role>("/roles", input),

  updateRole: ({ id, changes }: { id: number; changes: Partial<RoleInput> }) => apiClient.patch<Role>(`/roles/${id}`, changes),

  deleteRole: (id: number) => apiClient.delete(`/roles/${id}`),

  accessRules: ({ signal }: RequestContext = {}) => apiClient.get<AccessRulesResponse>("/access-rules", { signal }),

  createRule: (input: AccessRuleInput) => apiClient.post<AccessRule>("/access-rules", input),

  updateRule: ({ id, changes }: { id: number; changes: Partial<AccessRuleInput> }) => apiClient.patch<AccessRule>(`/access-rules/${id}`, changes),

  deleteRule: (id: number) => apiClient.delete(`/access-rules/${id}`),

  explain: (userId: number, { signal }: RequestContext = {}) => apiClient.get<AccessExplanation>(`/access-rules/explain/${userId}`, { signal }),

  async audit({ page = 1, action, search }: AuditQuery, { signal }: RequestContext = {}): Promise<AuditPage> {
    const data = await apiClient.get<Partial<AuditPage> | null>("/audit", { params: { page, action, search }, signal });
    return { entries: data?.entries ?? [], page: data?.page ?? page, total: data?.total ?? 0, totalPages: data?.totalPages ?? 1 };
  },
};
