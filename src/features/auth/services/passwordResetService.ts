import { apiClient } from "@/lib/apiClient";

/** What a valid reset link reveals: enough for the person to recognise their account, nothing more. */
export interface ResetLinkInfo {
  valid: true;
  /** First name only */
  name: string;
  /** Masked, e.g. a***@d***.com */
  email: string;
  workspace: { slug: string; siteTitle: string };
  /** The workspace's password rule (Settings → Security) */
  passwordRule?: PasswordRule;
}

export interface PasswordRule {
  minLength: number;
  /** Letters and numbers both required */
  requireMixed: boolean;
}

export interface ForgotPasswordInput {
  email: string;
  /** The workspace slug when asked from a workspace's own sign-in page */
  workspace?: string;
}

export const passwordResetService = {
  /** Always answers 202 with the same message, whether or not the account exists. */
  forgot: (input: ForgotPasswordInput) => apiClient.post<{ message: string }>("/auth/password/forgot", input),

  /** 404 when the link is unknown, used, or expired. */
  checkLink: (token: string, { signal }: { signal?: AbortSignal } = {}) => apiClient.get<ResetLinkInfo>(`/auth/password/reset/${encodeURIComponent(token)}`, { signal }),

  reset: (input: { token: string; newPassword: string }) => apiClient.post<null>("/auth/password/reset", input),
};
