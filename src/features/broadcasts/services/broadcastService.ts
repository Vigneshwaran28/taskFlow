import { apiClient } from "@/lib/apiClient";

export type BroadcastSeverity = "info" | "warning" | "critical";
/** subscription = an automatic "your subscription ends…" notice to the workspace's admins */
export type BroadcastKind = "announcement" | "maintenance" | "subscription";

/** One message from the provider (the company that runs this TaskFlow). */
export interface ProviderNotice {
  id: number;
  kind: BroadcastKind;
  severity: BroadcastSeverity;
  title: string;
  body: string;
  /** ISO time it was published */
  publishAt: string;
  expiresAt: string | null;
  isRead: boolean;
  /** Hidden from the banner */
  dismissed: boolean;
}

/** none = no end date; ending = within 30 days; grace = ended, access continues until graceEndsOn; expired = access stopped */
export type SubscriptionState = "none" | "active" | "ending" | "grace" | "expired";

export interface SubscriptionSummary {
  plan: string;
  /** YYYY-MM-DD */
  startsOn: string | null;
  endsOn: string | null;
  graceDays: number;
  /** Last day anyone can sign in (end date + grace days) */
  graceEndsOn: string | null;
  /** Days until the end date (negative once past); null without an end date */
  daysLeft: number | null;
  state: SubscriptionState;
}

export interface ProviderInbox {
  items: ProviderNotice[];
  unread: number;
  /** The workspace's subscription; only for workspace admins */
  subscription: SubscriptionSummary | null;
}

const EMPTY: ProviderInbox = { items: [], unread: 0, subscription: null };

export const broadcastService = {
  async inbox({ signal }: { signal?: AbortSignal } = {}): Promise<ProviderInbox> {
    const data = await apiClient.get<Partial<ProviderInbox> | null>("/broadcasts", { signal });
    return { ...EMPTY, ...data, items: data?.items ?? [], subscription: data?.subscription ?? null };
  },

  markRead: (id: number) => apiClient.post<{ id: number }>(`/broadcasts/${id}/read`),

  dismiss: (id: number) => apiClient.post<{ id: number }>(`/broadcasts/${id}/dismiss`),
};
