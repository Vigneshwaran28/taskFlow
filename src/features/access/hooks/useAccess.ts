import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/features/auth";
import { accessService, type AuditQuery } from "../services/accessService";

export const accessKeys = {
  all: ["access"] as const,
  roles: ["access", "roles"] as const,
  rules: ["access", "rules"] as const,
  explainAll: ["access", "explain"] as const,
  explain: (userId: number) => ["access", "explain", userId] as const,
  auditAll: ["access", "audit"] as const,
  audit: (query: AuditQuery) => ["access", "audit", query] as const,
};

export const useRoles = ({ enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: accessKeys.roles, queryFn: ({ signal }) => accessService.roles({ signal }), enabled });

export const useAuditLog = (query: AuditQuery) =>
  useQuery({ queryKey: accessKeys.audit(query), queryFn: ({ signal }) => accessService.audit(query, { signal }), placeholderData: keepPreviousData });

/** Role edits can change the signed-in user's own permissions, the user list, and the audit log. */
function useRoleChange<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accessKeys.roles });
      queryClient.invalidateQueries({ queryKey: accessKeys.rules });
      queryClient.invalidateQueries({ queryKey: accessKeys.explainAll });
      queryClient.invalidateQueries({ queryKey: accessKeys.auditAll });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}

export const useCreateRole = () => useRoleChange(accessService.createRole);
export const useUpdateRole = () => useRoleChange(accessService.updateRole);
export const useDeleteRole = () => useRoleChange(accessService.deleteRole);

export const useAccessRules = ({ enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: accessKeys.rules, queryFn: ({ signal }) => accessService.accessRules({ signal }), enabled });

/** Why a person has each permission (roles, grants, and the limits that removed some); idle without a person. */
export const useAccessExplanation = (userId: number | undefined) =>
  useQuery({ queryKey: accessKeys.explain(userId ?? 0), queryFn: ({ signal }) => accessService.explain(userId!, { signal }), enabled: Boolean(userId) });

// Rules change people's access like role edits do.
export const useCreateRule = () => useRoleChange(accessService.createRule);
export const useUpdateRule = () => useRoleChange(accessService.updateRule);
export const useDeleteRule = () => useRoleChange(accessService.deleteRule);
