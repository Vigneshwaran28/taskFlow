import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/apiClient";
import { passwordResetService } from "../services/passwordResetService";

export const passwordResetKeys = {
  link: (token: string) => ["auth", "reset-link", token] as const,
};

export const useForgotPassword = () => useMutation({ mutationFn: passwordResetService.forgot });

/** Checks a reset link once; an invalid or expired link (404) isn't retried. */
export function useResetLink(token: string) {
  return useQuery({
    queryKey: passwordResetKeys.link(token),
    queryFn: ({ signal }) => passwordResetService.checkLink(token, { signal }),
    enabled: Boolean(token),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => failureCount < 2 && error instanceof ApiError && (error.status === 0 || error.status >= 500),
  });
}

export const useResetPassword = () => useMutation({ mutationFn: passwordResetService.reset });
