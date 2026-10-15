import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { FeatureKey, SessionUser, SettingsKey, WorkspaceSettings } from "@/types/session";
import { ApiError } from "@/lib/apiClient";
import { useTenantSlug } from "@/lib/navigation";
import { currentWorkspace } from "@/lib/tenantPath";
import { authService } from "../services/authService";

export const authKeys = {
  /** Prefix of every signed-in session (one per workspace); invalidate this to re-check them all. */
  me: ["auth", "me"] as const,
  /** The session for one workspace ("" = pages outside a workspace, which use the most recent sign-in). */
  session: (workspace: string | null | undefined) => ["auth", "me", workspace ?? ""] as const,
  sessions: ["auth", "sessions"] as const,
  publicWorkspace: (slug: string) => ["public-workspace", slug] as const,
};

/** Updates the cached session of the workspace this tab shows. */
export function setCurrentSession(queryClient: QueryClient, update: SessionUser | null | ((current: SessionUser | null | undefined) => SessionUser | null | undefined)) {
  queryClient.setQueryData<SessionUser | null>(authKeys.session(currentWorkspace()), update as never);
}

/** A workspace's public sign-in branding. Unknown addresses (404) aren't retried. */
export function usePublicWorkspace(slug: string | null | undefined, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: authKeys.publicWorkspace(slug ?? ""),
    queryFn: ({ signal }) => authService.publicWorkspace(slug ?? "", { signal }),
    enabled: enabled && Boolean(slug),
    staleTime: 60_000,
    retry: (failureCount, error) => failureCount < 2 && error instanceof ApiError && (error.status === 0 || error.status >= 500),
  });
}

/** The signed-in account for the workspace in the URL (each workspace open in this browser has its own). */
export function useCurrentUser() {
  const workspace = useTenantSlug();
  return useQuery({
    queryKey: authKeys.session(workspace),
    queryFn: ({ signal }) => authService.me({ signal }),
    staleTime: 5 * 60_000,
  });
}

/** The workspaces this browser is signed in to (start page, workspace switcher). */
export function useWorkspaceSessions({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: authKeys.sessions,
    queryFn: ({ signal }) => authService.sessions({ signal }),
    staleTime: 30_000,
    enabled,
  });
}

/** Signing in or out changes whose data is cached: reset everything, then seed the session. */
function useSessionMutation<TInput>(mutationFn: (input: TInput) => Promise<SessionUser | null>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: user => {
      queryClient.removeQueries({ predicate: query => query.queryKey[0] !== "setup" });
      queryClient.setQueryData(authKeys.session(currentWorkspace()), user ?? null);
      // Signed in from a page outside the workspace (/login): its own pages start with this session too.
      if (user?.tenant?.slug) queryClient.setQueryData(authKeys.session(user.tenant.slug), user);
    },
  });
}

export const useLogin = () => useSessionMutation(authService.login);
/** Signs out of the workspace this tab shows; other workspaces on this browser stay signed in. */
export const useLogout = () =>
  useSessionMutation(async () => {
    await authService.logout();
    return null;
  });

/** Signs out of one workspace (start page, switcher) or, with `all`, of every workspace on this browser. */
export function useSignOutWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authService.logout,
    onSuccess: (_result, input) => {
      if (input?.all) queryClient.removeQueries({ queryKey: authKeys.me });
      else if (input?.workspace) queryClient.removeQueries({ queryKey: authKeys.session(input.workspace) });
      queryClient.removeQueries({ queryKey: authKeys.session("") }); // the most recent sign-in may have been that one
      void queryClient.invalidateQueries({ queryKey: authKeys.sessions });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: user => setCurrentSession(queryClient, user),
  });
}

/** Changing the password also clears a temporary-password requirement, so the app opens right away. */
export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authService.changePassword,
    onSuccess: () => {
      const user = queryClient.getQueryData<SessionUser | null>(authKeys.session(currentWorkspace()));
      if (user?.mustChangePassword) {
        setCurrentSession(queryClient, { ...user, mustChangePassword: false });
        // Queries that failed while the password was temporary can run now.
        queryClient.invalidateQueries({ predicate: query => query.queryKey[0] !== "auth" });
      }
    },
  });
}

/** Module keys the signed-in user's workspace is licensed for. */
export function useFeatures(): FeatureKey[] {
  const { data: user } = useCurrentUser();
  return user?.tenant?.features ?? [];
}

export const useHasFeature = (feature: FeatureKey) => useFeatures().includes(feature);

/** The workspace's settings for one module (see the server's moduleSettings.js). */
export function useModuleSettings<K extends SettingsKey>(module: K): Partial<WorkspaceSettings[K]> {
  const { data: user } = useCurrentUser();
  return user?.tenant?.settings?.[module] ?? {};
}

/** The workspace's display name: the branding title when set, else the workspace name. */
export function useSiteTitle() {
  const { data: user } = useCurrentUser();
  return user?.tenant?.settings?.branding?.siteTitle?.trim() || user?.tenant?.name || "TaskFlow";
}

/** The signed-in user's effective permission keys (see the server's services/permissions.js). */
export function usePermissions() {
  const { data: user } = useCurrentUser();
  return user?.permissions ?? [];
}

/** True when the signed-in user holds any of the permissions. */
export function useCan(...permissions: string[]) {
  const held = usePermissions();
  return permissions.some(permission => held.includes(permission));
}

/** Saves appearance preferences to the account; the session copy updates when it succeeds. */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authService.updatePreferences,
    onSuccess: preferences => setCurrentSession(queryClient, current => (current ? { ...current, preferences } : current)),
  });
}

/** The workspace's password rule (settings.security), mirroring the server's securityPolicy.js passwordProblem. */
export function usePasswordRule() {
  const security = useModuleSettings("security");
  const minLength = security.passwordMinLength ?? 8;
  const requireMixed = Boolean(security.passwordRequireMixed);
  return {
    minLength,
    requireMixed,
    hint: `At least ${minLength} characters${requireMixed ? ", with letters and numbers" : ""}.`,
    /** Why a new password breaks the rule, or null */
    problem: (password: string) => {
      if (password.length < minLength) return `Use at least ${minLength} characters.`;
      if (requireMixed && !(/[A-Za-z]/.test(password) && /\d/.test(password))) return "Use both letters and numbers.";
      return null;
    },
  };
}

/** The email domains new accounts must use (empty = any), for hints on account forms. */
export function useAllowedEmailDomains() {
  return useModuleSettings("security").allowedEmailDomains ?? [];
}
