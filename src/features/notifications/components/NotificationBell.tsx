"use client";
// Feature component: bell with unread count and a dropdown of recent reminders and ticket updates.
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { useToast } from "@/components/shared/Toaster";
import { cn } from "@/lib/cn";
import { formatTimeAgo } from "@/lib/dates";
import { useRouter } from "@/lib/navigation";
import { alertTitle, describeNotification, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, useReminderAlerts } from "../hooks/useNotifications";
import { useProviderInbox, useMarkNoticeRead } from "@/features/broadcasts";
import type { AppNotification } from "../services/notificationService";

export interface NotificationBellProps {
  onOpenTask: (taskId: number) => void;
  onOpenTicket: (ticketId: number) => void;
}

export function NotificationBell({ onOpenTask, onOpenTicket }: NotificationBellProps) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data, isPending, error } = useNotifications();
  const { data: providerData } = useProviderInbox();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const markNoticeRead = useMarkNoticeRead();

  useReminderAlerts(notification => toast.info(alertTitle(notification), describeNotification(notification)));

  // Close on outside click / Escape (DOM events are an external system → effect is correct).
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node | null)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const notificationUnread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  // Integrate unread provider broadcasts so the bell badge accurately reflects ALL pending notices
  const unreadBroadcasts = (providerData?.items ?? []).filter(b => !b.isRead);
  const unreadNotifTitles = new Set(items.filter(n => !n.isRead).map(n => n.title));
  const distinctBroadcastUnread = unreadBroadcasts.filter(b => !unreadNotifTitles.has(b.title)).length;
  const unread = notificationUnread + distinctBroadcastUnread;

  // Merge any unread broadcasts that aren't already represented in in-app notifications
  const unreadBroadcastTitles = new Set(unreadBroadcasts.map(b => b.title));
  const filteredItems = items.filter(i => !(unreadBroadcastTitles.has(i.title) && i.isRead));
  const displayItems: AppNotification[] = [...filteredItems];
  for (const b of unreadBroadcasts) {
    if (!filteredItems.some(i => i.title === b.title && !i.isRead)) {
      displayItems.unshift({
        id: -b.id,
        taskId: null,
        ticketId: null,
        meetingId: null,
        title: b.title,
        body: b.body,
        dueAt: null,
        isRead: b.isRead,
        createdAt: b.publishAt,
      });
    }
  }

  const router = useRouter();

  function handleSelect(notification: AppNotification) {
    if (!notification.isRead) {
      if (notification.id < 0) {
        markNoticeRead.mutate(-notification.id);
      } else {
        markRead.mutate(notification.id);
        const matchingBroadcast = providerData?.items.find(b => b.title === notification.title && !b.isRead);
        if (matchingBroadcast) markNoticeRead.mutate(matchingBroadcast.id);
      }
    }
    setOpen(false);
    if (notification.meetingId) router.push("/meetings");
    else if (notification.ticketId) onOpenTicket(notification.ticketId);
    else if (notification.taskId) onOpenTask(notification.taskId);
  }

  function handleMarkAllRead() {
    markAllRead.mutate(undefined, { onError: error => toast.error("Couldn't mark notifications read", error.message) });
    for (const item of unreadBroadcasts) {
      markNoticeRead.mutate(item.id);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative rounded-lg p-2 text-muted-foreground transition-all duration-150 select-none touch-manipulation cursor-pointer active:scale-95 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 && (
          <span
            data-testid="notification-badge"
            style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
            className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full !bg-red-600 px-1 text-[11px] font-bold leading-none !text-white ring-2 ring-background shadow-md tabular-nums pointer-events-none select-none z-10 animate-in zoom-in-75 duration-150"
            aria-hidden="true"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Notifications"
          className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        >
          <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/40">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                disabled={markAllRead.isPending}
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline select-none touch-manipulation cursor-pointer active:scale-95 transition-all"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Mark all read
              </button>
            )}
          </div>
          {isPending ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Loading notifications…</p>
          ) : error && !displayItems.length ? (
            <p role="alert" className="px-4 py-10 text-center text-sm text-destructive">
              Unable to load notifications.
            </p>
          ) : displayItems.length ? (
            <ul className="max-h-96 divide-y overflow-y-auto">
              {displayItems.map(item => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="flex w-full gap-3 px-4 py-3 text-left transition-colors select-none touch-manipulation cursor-pointer active:bg-muted/80 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", item.isRead ? "bg-transparent" : "bg-primary")} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-sm", !item.isRead ? "font-semibold text-foreground" : "font-medium text-foreground/90")}>
                        {!item.isRead && <span className="sr-only">Unread: </span>}
                        {item.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{describeNotification(item)}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{formatTimeAgo(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
              <BellOff className="h-6 w-6" aria-hidden="true" />
              No notifications yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
