import { apiClient } from "@/lib/apiClient";
import type { PersonRef, RoleRef } from "@/types/session";

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  roles: RoleRef[];
  /** Still on a temporary password */
  mustChangePassword: boolean;
  jobTitle: string | null;
  /** YYYY-MM-DD */
  dateOfBirth: string | null;
  /** Whole years, from dateOfBirth */
  age: number | null;
  /** YYYY-MM-DD */
  joinedOn: string | null;
  isActive: boolean;
  /** Whether login with code is enabled for this user */
  isCodeLoginEnabled?: boolean;
  /** Last successful sign-in (null = never signed in) */
  lastLoginAt: string | null;
  /** Direct login key code / PIN (TF-XXXXXX) assigned to this user */
  loginCode: string | null;
  createdAt: string;
}

/** Active users and the plan's limit (null = unlimited). */
export interface Seats {
  used: number;
  limit: number | null;
}

export interface ManagedUsersResponse {
  users: ManagedUser[];
  seats: Seats;
}

interface UserDetailsInput {
  name: string;
  jobTitle: string | null;
  dateOfBirth: string | null;
  joinedOn: string | null;
}

export interface CreateUserInput extends UserDetailsInput {
  email: string;
  /** Temporary password: they choose their own at first sign-in */
  password: string;
  roleIds: number[];
  isCodeLoginEnabled?: boolean;
}

export type UpdateUserInput = Partial<UserDetailsInput & { roleIds: number[]; isActive: boolean; isCodeLoginEnabled: boolean }>;

export const userService = {
  async list({ signal }: { signal?: AbortSignal } = {}): Promise<ManagedUsersResponse> {
    const data = await apiClient.get<Partial<ManagedUsersResponse> | null>("/users", { signal });
    return { users: data?.users ?? [], seats: data?.seats ?? { used: 0, limit: null } };
  },

  create: (input: CreateUserInput) => apiClient.post<ManagedUser>("/users", input),

  update: ({ id, changes }: { id: number; changes: UpdateUserInput }) => apiClient.patch<ManagedUser>(`/users/${id}`, changes),

  /** Sets a temporary password; the person must choose a new one at next sign-in. Also closes their reset requests. */
  resetPassword: ({ id, password }: { id: number; password: string }) => apiClient.post<null>(`/users/${id}/password`, { password }),

  /** Open requests first, then the last 20 closed ones. */
  async passwordRequests({ signal }: { signal?: AbortSignal } = {}): Promise<PasswordResetRequest[]> {
    const data = await apiClient.get<PasswordResetRequest[] | null>("/users/password-requests", { signal });
    return Array.isArray(data) ? data : [];
  },

  /** A one-time reset link. The token is only ever returned here; the server keeps a hash. */
  createResetLink: ({ id, expiresInHours }: { id: number; expiresInHours: number }) => apiClient.post<ResetLink>(`/users/${id}/reset-link`, { expiresInHours }),

  dismissPasswordRequest: (id: number) => apiClient.post<null>(`/users/password-requests/${id}/dismiss`),

  /** Ends the person's sessions on every device (their password stays). */
  signOutEverywhere: (id: number) => apiClient.post<null>(`/users/${id}/sign-out`),

  /** Regenerates a unique login key code for a specific user. */
  regenerateLoginCode: (id: number) => apiClient.post<{ ok: true; id: number; loginCode: string }>(`/users/${id}/login-code/regenerate`),

  /** Many accounts at once, all with one temporary password. dryRun checks every row without creating anything. */
  importUsers: (input: ImportUsersInput) => apiClient.post<ImportUsersResult>("/users/import", input, { timeout: 60000 }),
};

export interface ImportRow {
  name: string;
  email: string;
  jobTitle: string | null;
}

export interface ImportUsersInput {
  rows: ImportRow[];
  password: string;
  roleIds: number[];
  dryRun: boolean;
}

export type ImportRowStatus = "ready" | "created" | "skipped" | "error";

export interface ImportUsersResult {
  dryRun: boolean;
  summary: Record<ImportRowStatus, number>;
  results: { row: number; name: string; email: string; status: ImportRowStatus; message?: string }[];
}

export type PasswordResetStatus = "requested" | "issued" | "used" | "dismissed" | "expired";

/** Someone asked for a password reset (from the sign-in page), or an admin issued them a link. */
export interface PasswordResetRequest {
  id: number;
  user: { id: number; name: string; email: string; jobTitle: string | null };
  status: PasswordResetStatus;
  /** null when an admin created the link without a request */
  requestedAt: string | null;
  requestedIp: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  issuedBy: PersonRef | null;
}

export interface ResetLink {
  /** Path on this site: /reset-password/<token> */
  url: string;
  token: string;
  expiresAt: string;
}

export const isOpenResetRequest = (request: PasswordResetRequest) => request.status === "requested" || request.status === "issued";
