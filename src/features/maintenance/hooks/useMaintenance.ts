import { useQuery } from "@tanstack/react-query";
import { statusService } from "../services/statusService";

export const maintenanceKeys = {
  status: (workspace: string | null) => ["maintenance", "status", workspace ?? ""] as const,
};

/** The platform's (and a workspace's) maintenance windows. `poll`: re-check every 30 seconds (the maintenance page). */
export function usePlatformStatus(workspace: string | null, { poll = false, enabled = true }: { poll?: boolean; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: maintenanceKeys.status(workspace),
    queryFn: ({ signal }) => statusService.get(workspace, { signal }),
    refetchInterval: poll ? 30_000 : false,
    refetchIntervalInBackground: poll,
    staleTime: poll ? 0 : 60_000,
    enabled,
  });
}
