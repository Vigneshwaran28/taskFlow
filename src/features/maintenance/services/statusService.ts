import { apiClient } from "@/lib/apiClient";
import type { MaintenanceInfo } from "@/lib/maintenance";

export interface PlatformStatus {
  ok: true;
  maintenance: MaintenanceInfo;
}

export const statusService = {
  /** No sign-in needed. With a workspace, its own window counts too. */
  get: (workspace: string | null, { signal }: { signal?: AbortSignal } = {}) => apiClient.get<PlatformStatus>("/public/status", { params: { workspace }, signal }),
};
