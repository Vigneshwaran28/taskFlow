import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { setCurrentSession } from "@/features/auth";
import { workspaceService, type SettingsPatch } from "../services/workspaceService";

export const workspaceKeys = {
  all: ["workspace"] as const,
  settings: ["workspace", "settings"] as const,
  overview: ["workspace", "overview"] as const,
  accessCode: ["workspace", "accessCode"] as const,
};

/** The workspace security PIN / access code for login and user creation. */
export function useTenantAccessCode({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: workspaceKeys.accessCode, queryFn: ({ signal }) => workspaceService.getAccessCode({ signal }), enabled });
}

/** Regenerates the workspace security PIN / access code. */
export function useRegenerateTenantAccessCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workspaceService.regenerateAccessCode,
    onSuccess: data => {
      queryClient.setQueryData(workspaceKeys.accessCode, data);
    },
  });
}

/** Settings with the licensed module list (for the restrictions panel). */
export function useWorkspaceSettings({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: workspaceKeys.settings, queryFn: ({ signal }) => workspaceService.getSettings({ signal }), enabled });
}

/** The workspace admin's overview (seats, people, roles, modules, restrictions, recent activity). */
export function useWorkspaceOverview() {
  return useQuery({ queryKey: workspaceKeys.overview, queryFn: ({ signal }) => workspaceService.overview({ signal }) });
}

const patchTouchesModules = (patch: SettingsPatch) => Boolean(patch.security && "disabledModules" in patch.security);

/** Settings travel with the session, so a save refreshes the signed-in user (and every module reading it). */
export function useUpdateWorkspaceSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workspaceService.updateSettings,
    onSuccess: (response, variables) => {
      queryClient.setQueryData(workspaceKeys.settings, response);
      setCurrentSession(queryClient, current => (current ? { ...current, tenant: { ...current.tenant, settings: response.settings, features: response.features } } : current));
      // Switching modules off or on changes what the session may open: re-check it as well.
      if (patchTouchesModules(variables)) void queryClient.invalidateQueries({ queryKey: ["auth"] });
      queryClient.invalidateQueries({ predicate: query => query.queryKey[0] !== "auth" && query.queryKey[0] !== "admin" });
    },
  });
}
