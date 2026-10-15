import { apiClient } from "@/lib/apiClient";

/** "all": everyone in the workspace; "roles": only people holding one of the chosen roles. */
export type AnnouncementAudience = "all" | "roles";

export interface AnnouncementRole {
  id: number;
  name: string;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  pinned: boolean;
  author: { id: number; name: string; jobTitle: string | null } | null;
  audience: AnnouncementAudience;
  /** The roles it is addressed to (empty for everyone) */
  roles: AnnouncementRole[];
  isRead: boolean;
  /** Read receipts from the audience; shown to the author and managers (null for others) */
  readCount: number | null;
  /** Active people it is addressed to, not counting the author; null like readCount */
  audienceSize: number | null;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementFeed {
  canPost: boolean;
  /** Active people in the workspace */
  audience: number;
  unread: number;
  items: Announcement[];
}

export interface AnnouncementInput {
  title: string;
  body: string;
  pinned: boolean;
  audience: AnnouncementAudience;
  roleIds: number[];
}

/** GET /api/announcements/roles: the audience picker for people who post. */
export interface AudienceRole extends AnnouncementRole {
  key: string | null;
  /** Active people holding the role */
  members: number;
}

export const announcementService = {
  async list({ signal }: { signal?: AbortSignal } = {}): Promise<AnnouncementFeed> {
    const data = await apiClient.get<Partial<AnnouncementFeed> | null>("/announcements", { signal });
    return { canPost: Boolean(data?.canPost), audience: data?.audience ?? 0, unread: data?.unread ?? 0, items: data?.items ?? [] };
  },
  async roles({ signal }: { signal?: AbortSignal } = {}): Promise<AudienceRole[]> {
    return (await apiClient.get<AudienceRole[] | null>("/announcements/roles", { signal })) ?? [];
  },
  create: (input: AnnouncementInput) => apiClient.post<Announcement>("/announcements", input),
  update: ({ id, changes }: { id: number; changes: Partial<AnnouncementInput> }) => apiClient.patch<Announcement>(`/announcements/${id}`, changes),
  remove: (id: number) => apiClient.delete(`/announcements/${id}`),
  markRead: (ids: number[]) => apiClient.post<null>("/announcements/read", { ids }),
};
