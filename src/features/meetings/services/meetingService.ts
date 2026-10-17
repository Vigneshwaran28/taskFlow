import { apiClient } from "@/lib/apiClient";

export type MeetingPlatform = "google_meet" | "zoom" | "teams" | "custom";

export interface MeetingParticipant {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Meeting {
  id: number;
  title: string;
  description: string | null;
  platform: MeetingPlatform;
  platformLabel: string;
  url: string;
  startAt: string;
  endAt: string | null;
  reminderMinutes: number;
  reminderSent: boolean;
  isInstant: boolean;
  createdBy: MeetingParticipant | null;
  participants: MeetingParticipant[];
  isParticipant: boolean;
  canManage: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingQuery {
  scope?: "upcoming" | "today" | "past" | "all";
  search?: string;
}

export interface CreateMeetingPayload {
  title: string;
  description?: string | null;
  platform?: MeetingPlatform;
  url: string;
  startAt: string;
  endAt?: string | null;
  reminderMinutes?: number;
  participantIds?: number[];
  isInstant?: boolean;
}

export interface UpdateMeetingPayload {
  title?: string;
  description?: string | null;
  platform?: MeetingPlatform;
  url?: string;
  startAt?: string;
  endAt?: string | null;
  reminderMinutes?: number;
  participantIds?: number[];
}

export const meetingService = {
  async getMeetings(query: MeetingQuery = {}, { signal }: { signal?: AbortSignal } = {}): Promise<Meeting[]> {
    const data = await apiClient.get<{ items: Meeting[] }>("/meetings", {
      params: query as Record<string, string>,
      signal,
    });
    return data?.items ?? [];
  },

  async getMeeting(id: number, { signal }: { signal?: AbortSignal } = {}): Promise<Meeting> {
    return apiClient.get<Meeting>(`/meetings/${id}`, { signal });
  },

  async create(payload: CreateMeetingPayload): Promise<Meeting> {
    return apiClient.post<Meeting>("/meetings", payload);
  },

  async update(id: number, payload: UpdateMeetingPayload): Promise<{ ok: boolean; id: number }> {
    return apiClient.patch(`/meetings/${id}`, payload);
  },

  async delete(id: number): Promise<void> {
    return apiClient.delete(`/meetings/${id}`);
  },
};
