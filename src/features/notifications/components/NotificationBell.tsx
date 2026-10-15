"use client";
// Feature component: bell with unread count and a dropdown of recent reminders and ticket updates.
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { useToast } from "@/components/shared/Toaster";
import { cn } from "@/lib/cn";
import { formatTimeAgo } from "@/lib/dates";
import { alertTitle, describeNotification, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, useReminderAlerts } from "../hooks/useNotifications";
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
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

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

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  function handleSelect(notification: AppNotification) {
    if (!notification.isRead) markRead.mutate(notification.id);
    setOpen(false);
    if (notification.ticketId) onOpenTicket(notification.ticketId);
    else if (notification.taskId) onOpenTask(notification.taskId);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                disabled={markAllRead.isPending}
                onClick={() => markAllRead.mutate(undefined, { onError: error => toast.error("Couldn't mark notifications read", error.message) })}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Mark all read
              </button>
            )}
          </div>
          {isPending ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Loading notifications…</p>
          ) : error && !items.length ? (
            <p role="alert" className="px-4 py-10 text-center text-sm text-destructive">
              Unable to load notifications.
            </p>
          ) : items.length ? (
            <ul className="max-h-96 divide-y overflow-y-auto">
              {items.map(item => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", item.isRead ? "bg-transparent" : "bg-primary")} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-sm", !item.isRead && "font-medium")}>
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
