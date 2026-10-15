import { ApiError, apiClient } from "@/lib/apiClient";
import type { AccountPreferences, PublicWorkspace, SessionUser, WorkspaceSession } from "@/types/session";

export interface ProfileInput {
  name: string;
  jobTitle?: string | null;
  dateOfBirth?: string | null;
  showBirthday?: boolean;
  /** Profile picture link ("" or null = none) */
  avatarUrl?: string | null;
}

export const authService = {
  /** Current user, or null when signed out. */
  async me({ signal }: { signal?: AbortSignal } = {}): Promise<SessionUser | null> {
    try {
      return await apiClient.get<SessionUser>("/auth/me", { signal });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },

  /** `workspace`: the slug when signing in on a workspace's own page (accounts of other workspaces are refused). */
  login: (credentials: { email: string; password: string; workspace?: string }) => apiClient.post<SessionUser>("/auth/login", credentials),

  /** A workspace's public sign-in branding (no sign-in needed); 404 for unknown addresses. */
  publicWorkspace: (slug: string, { signal }: { signal?: AbortSignal } = {}) => apiClient.get<PublicWorkspace>(`/public/workspaces/${encodeURIComponent(slug)}`, { signal }),

  /**
   * Signs out of the workspace this tab shows; `workspace` names another one (start page, switcher), `all` signs
   * out of every workspace on this browser.
   */
  logout: (input?: { workspace?: string; all?: boolean }) => apiClient.post<null>("/auth/logout", input ?? {}),

  /** The workspaces this browser is signed in to. */
  async sessions({ signal }: { signal?: AbortSignal } = {}): Promise<WorkspaceSession[]> {
    const data = await apiClient.get<WorkspaceSession[] | null>("/auth/sessions", { signal });
    return Array.isArray(data) ? data : [];
  },

  updateProfile: (input: ProfileInput) => apiClient.patch<SessionUser>("/auth/me", input),

  /** Saves appearance preferences and the home layout on the account (so they follow the person to any device). */
  updatePreferences: (preferences: AccountPreferences) => apiClient.patch<AccountPreferences>("/auth/me/preferences", preferences),

  changePassword: (input: { currentPassword: string; newPassword: string }) => apiClient.post<null>("/auth/me/password", input),
};
