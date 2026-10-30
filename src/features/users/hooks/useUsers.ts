import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/features/auth";
import { userService } from "../services/userService";

export const userKeys = {
  all: ["users"] as const,
  passwordRequests: ["users", "password-requests"] as const,
};

export function useManagedUsers({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: ({ signal }) => userService.list({ signal }),
    enabled,
  });
}

/** User changes also change the directory and every person picker. */
function useUserChange<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: ["people"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["access"] });
      queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}

export const useCreateUser = () => useUserChange(userService.create);
export const useSignOutEverywhere = () => useUserChange(userService.signOutEverywhere);
/** Only a real import changes users; a preview (dryRun) changes nothing. */
export function useImportUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userService.importUsers,
    onSuccess: result => {
      if (result.dryRun) return;
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: ["people"] });
      queryClient.invalidateQueries({ queryKey: ["access"] });
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
    },
  });
}
export const useUpdateUser = () => useUserChange(userService.update);
export const useRegenerateUserLoginCode = () => useUserChange(userService.regenerateLoginCode);
/** Setting a temporary password also closes the person's reset requests: refresh everything under ["users"]. */
export function useResetUserPassword() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: userService.resetPassword, onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }) });
}

/** Password reset requests; the realtime provider invalidates ["users"] on `password_reset.requested`, so this refreshes live. */
export function usePasswordRequests({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: userKeys.passwordRequests,
    queryFn: ({ signal }) => userService.passwordRequests({ signal }),
    enabled,
  });
}

export function useCreateResetLink() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: userService.createResetLink, onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.passwordRequests }) });
}

export function useDismissPasswordRequest() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: userService.dismissPasswordRequest, onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.passwordRequests }) });
}
