import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatRelativeDateTime } from "@/lib/dates";
import { usePollInterval } from "@/realtime";
import { notificationService, type AppNotification } from "../services/notificationService";

/** Toast / desktop alert title: ticket updates use the ticket subject, reminders say so. */
export const alertTitle = (notification: AppNotification) => (notification.ticketId ? notification.title : `Reminder: ${notification.title}`);

/** Human text for a reminder, in the user's timezone. */
export function describeNotification(notification: AppNotification) {
  if (notification.body) return notification.body;
  return notification.dueAt ? `Due ${formatRelativeDateTime(notification.dueAt)}` : "Reminder";
}

export const notificationKeys = {
  all: ["notifications"] as const,
};

/** notification.created refreshes the bell live; polling is the fallback for when the socket is down. */
const POLL_MS = 30_000;

export function useNotifications() {
  const refetchInterval = usePollInterval(POLL_MS);
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: ({ signal }) => notificationService.getNotifications({ signal }),
    refetchInterval,
    refetchIntervalInBackground: true, // reminders should arrive even when the tab is hidden
  });
}

/**
 * Calls `onNew` for reminders that arrive after the app has loaded, and shows a
 * browser notification when permission was granted. Existing notifications are ignored.
 */
export function useReminderAlerts(onNew: (notification: AppNotification) => void) {
  const { data } = useNotifications();
  const seenIds = useRef<Set<number> | null>(null);
  const onNewRef = useRef(onNew);

  useEffect(() => {
    onNewRef.current = onNew;
  });

  // Browser Notification API is an external system → effect is correct.
  useEffect(() => {
    if (!data) return;
    const unread = data.items.filter(item => !item.isRead);
    if (seenIds.current === null) {
      seenIds.current = new Set(data.items.map(item => item.id));
      return;
    }
    for (const item of unread) {
      if (seenIds.current.has(item.id)) continue;
      seenIds.current.add(item.id);
      onNewRef.current?.(item);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(alertTitle(item), { body: describeNotification(item), tag: `tf-${item.id}` });
      }
    }
  }, [data]);
}

function useNotificationMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export const useMarkNotificationRead = () => useNotificationMutation((id: number) => notificationService.markRead(id));
export const useMarkAllNotificationsRead = () => useNotificationMutation<void>(() => notificationService.markAllRead());
export const useClearNotifications = () => useNotificationMutation<void>(() => notificationService.clearAll());
