import { useMutation, useQuery } from "@tanstack/react-query";
import { setupService, type DatabaseSettings } from "../services/setupService";

export const setupKeys = {
  status: ["setup", "status"] as const,
  importSummary: ["setup", "import-summary"] as const,
};

export function useSetupStatus({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: setupKeys.status,
    queryFn: ({ signal }) => setupService.getStatus({ signal }),
    staleTime: Infinity,
    enabled,
  });
}

/** Standalone edition: the workspace and record counts the wizard will import. */
export function useImportSummary({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: setupKeys.importSummary,
    queryFn: ({ signal }) => setupService.getImportSummary({ signal }),
    staleTime: Infinity,
    enabled,
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: ({ database, createDatabase }: { database: DatabaseSettings; createDatabase: boolean }) => setupService.testConnection(database, createDatabase),
  });
}

/** The wizard reloads into the console on success, so nothing cached needs refreshing here. */
export function useCompleteSetup() {
  return useMutation({ mutationFn: setupService.complete });
}
