import { apiClient } from "@/lib/apiClient";
import type { FeatureKey, SettingsKey, WorkspaceSettings } from "@/types/session";

/** A partial settings change: only the modules (and fields) sent are changed. */
export type SettingsPatch = { [K in SettingsKey]?: Partial<WorkspaceSettings[K]> };

export interface WorkspaceSettingsResponse {
  /** Modules people can use: licensed, minus the ones the workspace switched off */
  features: FeatureKey[];
  /** Modules on the provider's plan for this workspace */
  licensed: FeatureKey[];
  /** The complete settings after the change */
  settings: WorkspaceSettings;
}

export type SubscriptionState = "none" | "active" | "ending" | "grace" | "expired";

/** GET /api/workspace/overview — the workspace admin's dashboard. */
export interface WorkspaceOverview {
  workspace: { name: string; slug: string; status: "active" | "suspended"; createdAt: string };
  subscription: { plan: string; startsOn: string | null; endsOn: string | null; graceDays: number; graceEndsOn: string | null; daysLeft: number | null; state: SubscriptionState };
  seats: { used: number; limit: number | null };
  people: { total: number; active: number; deactivated: number; temporaryPassword: number; neverSignedIn: number; signedInLast7Days: number };
  roles: { id: number; key: string | null; name: string; isSystem: boolean; members: number }[];
  modules: { licensed: FeatureKey[]; enabled: FeatureKey[] };
  security: WorkspaceSettings["security"];
  /** null when the viewer can't manage users */
  openPasswordRequests: number | null;
  /** null when the viewer can't see the audit log */
  recentActivity: { id: number; action: string; target: string | null; actor: string | null; createdAt: string }[] | null;
}

export interface TenantAccessCode {
  id: number;
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  code: string;
  name: string;
  type: string;
  description: string | null;
  isActive: boolean;
  isDeleted: boolean;
  usageCount: number;
  maxUses: number | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export const workspaceService = {
  /** Settings plus which modules are licensed (the session only carries the usable ones). */
  getSettings: ({ signal }: { signal?: AbortSignal } = {}) => apiClient.get<WorkspaceSettingsResponse>("/workspace/settings", { signal }),

  /** Saves settings for one or more modules, e.g. { attendance: { autoCheckIn: false } }. */
  updateSettings: (patch: SettingsPatch) => apiClient.patch<WorkspaceSettingsResponse>("/workspace/settings", patch),

  overview: ({ signal }: { signal?: AbortSignal } = {}) => apiClient.get<WorkspaceOverview>("/workspace/overview", { signal }),

  /** The workspace security PIN / access code for login and user creation. */
  getAccessCode: ({ signal }: { signal?: AbortSignal } = {}) => apiClient.get<TenantAccessCode>("/workspace/access-code", { signal }),

  /** Regenerates the workspace security PIN / access code, soft-deleting the old one. */
  regenerateAccessCode: () => apiClient.post<TenantAccessCode>("/workspace/access-code/regenerate"),
};
