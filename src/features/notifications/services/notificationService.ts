import { apiClient } from "@/lib/apiClient";

export interface AppNotification {
  id: number;
  taskId: number | null;
  /** Set for help desk updates */
  ticketId: number | null;
  title: string;
  body: string | null;
  /** Due date of the related task (ISO UTC) */
  dueAt: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationFeed {
  unreadCount: number;
  items: AppNotification[];
}

export const notificationService = {
  async getNotifications({ signal }: { signal?: AbortSignal } = {}): Promise<NotificationFeed> {
    const data = await apiClient.get<Partial<NotificationFeed> | null>("/notifications", { signal });
    return { unreadCount: data?.unreadCount ?? 0, items: data?.items ?? [] };
  },

  markRead(id: number) {
    return apiClient.post(`/notifications/${id}/read`);
  },

  markAllRead() {
    return apiClient.post("/notifications/read-all");
  },

  clearAll() {
    return apiClient.delete("/notifications");
  },
};
