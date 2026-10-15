"use client";
// "Ticket TKT-0042 updated" for live changes to tickets you raised or are assigned, made by someone else,
// while you aren't looking at that ticket. Skipped when the same change already raised a notification
// (the bell shows its own toast for those).
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/shared/Toaster";
import { useCurrentUser } from "@/features/auth";
import { useRealtimeEvent } from "@/realtime";

interface TicketUpdated {
  ticketId: number;
  actorId?: number;
  requesterId?: number;
  assigneeId?: number | null;
}

interface NotificationCreated {
  ticketId?: number | null;
}

/** notification.created is published ~150 ms after the change; wait a little longer before deciding. */
const SETTLE_MS = 800;
const ticketKey = (id: number) => `TKT-${String(id).padStart(4, "0")}`;

/** Mounted once in the app shell (help desk tenants only). */
export function TicketToasts() {
  const toast = useToast();
  const { data: user } = useCurrentUser();
  const { ticketId: openId } = useParams<{ ticketId?: string }>();
  const notified = useRef(new Map<number, number>());
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  // Pending timers are external to React → effect cleanup is correct.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  useRealtimeEvent<NotificationCreated>("notification.created", ({ data }) => {
    if (data.ticketId) notified.current.set(data.ticketId, Date.now());
  });

  useRealtimeEvent<TicketUpdated>("ticket.updated", ({ data }) => {
    if (!user || data.actorId === user.id) return;
    if (data.requesterId !== user.id && data.assigneeId !== user.id) return;
    if (Number(openId) === data.ticketId) return;
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      const at = notified.current.get(data.ticketId);
      if (at && Date.now() - at < SETTLE_MS + 2000) return;
      toast.info(`Ticket ${ticketKey(data.ticketId)} updated`);
    }, SETTLE_MS);
    timers.current.add(timer);
  });

  return null;
}
