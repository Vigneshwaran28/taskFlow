import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/apiClient";
import { useTenantSlug } from "@/lib/navigation";
import { patientPortalService, type PortalProfile } from "../services/patientPortalService";

/** Keyed by workspace: each workspace's portal has its own sign-in on this browser. */
export const portalKeys = {
  all: ["patientPortal"] as const,
  me: (slug: string) => ["patientPortal", slug, "me"] as const,
  tokens: (slug: string) => ["patientPortal", slug, "tokens"] as const,
  visits: (slug: string) => ["patientPortal", slug, "visits"] as const,
};

const signedOut = (error: unknown) => error instanceof ApiError && error.status === 401;

/** The signed-in patient for this workspace's portal, or null when nobody is signed in. */
export function usePortalSession() {
  const slug = useTenantSlug() ?? "";
  return useQuery({
    queryKey: portalKeys.me(slug),
    queryFn: async ({ signal }): Promise<PortalProfile | null> => {
      try {
        return await patientPortalService.me({ signal });
      } catch (error) {
        if (signedOut(error)) return null;
        throw error;
      }
    },
    enabled: Boolean(slug),
    staleTime: 60_000,
    retry: (count, error) => !(error instanceof ApiError && error.status < 500 && error.status !== 0) && count < 2,
  });
}

/** Today's tokens. `intervalMs`: the poll (slow while the live channel is connected). A 401 signs the page out. */
export function usePortalTokens(intervalMs: number, enabled = true) {
  const slug = useTenantSlug() ?? "";
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: portalKeys.tokens(slug),
    queryFn: async ({ signal }) => {
      try {
        return await patientPortalService.tokens({ signal });
      } catch (error) {
        if (signedOut(error)) queryClient.setQueryData(portalKeys.me(slug), null);
        throw error;
      }
    },
    enabled: enabled && Boolean(slug),
    refetchInterval: intervalMs,
    refetchOnWindowFocus: true,
  });
}

export function usePortalVisits(enabled = true) {
  const slug = useTenantSlug() ?? "";
  return useQuery({ queryKey: portalKeys.visits(slug), queryFn: ({ signal }) => patientPortalService.visits({ signal }), enabled: enabled && Boolean(slug) });
}

export function usePortalLogin() {
  const slug = useTenantSlug() ?? "";
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patientPortalService.login,
    onSuccess: profile => {
      queryClient.removeQueries({ queryKey: ["patientPortal", slug] });
      queryClient.setQueryData(portalKeys.me(slug), profile);
    },
  });
}

export function usePortalLogout() {
  const slug = useTenantSlug() ?? "";
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patientPortalService.logout,
    onSettled: () => {
      queryClient.removeQueries({ queryKey: ["patientPortal", slug] });
      queryClient.setQueryData(portalKeys.me(slug), null);
    },
  });
}
