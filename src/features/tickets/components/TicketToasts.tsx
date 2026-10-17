"use client";
// "Ticket TKT-0042 updated" and "Ticket TKT-0042 assigned to you" toast alerts with audible chimes.
// When a ticket is assigned to a specific user, that user receives an audio sound chime and an action toast.
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/shared/Toaster";
import { useCurrentUser } from "@/features/auth";
import { useRouter } from "@/lib/navigation";
import { playTicketChime } from "@/lib/sound";
import { useRealtimeEvent } from "@/realtime";

interface TicketUpdated {
  ticketId: number;
  actorId?: number;
  requesterId?: number;
  assigneeId?: number | null;
}

interface TicketAssigned {
  ticketId: number;
  ticketKey: string;
  subject: string;
  actorId: number;
  actorName: string;
  priority?: string;
}

interface NotificationCreated {
  ticketId?: number | null;
}

const SETTLE_MS = 800;
const ticketKey = (id: number) => `TKT-${String(id).padStart(4, "0")}`;

/** Mounted once in the app shell (help desk tenants only). */
export function TicketToasts() {
  const toast = useToast();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { ticketId: openId } = useParams<{ ticketId?: string }>();
  const notified = useRef(new Map<number, number>());
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

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

  // Specifically for when a ticket is assigned to the current user
  useRealtimeEvent<TicketAssigned>("ticket.assigned", ({ data }) => {
    if (!user || data.actorId === user.id) return;
    notified.current.set(data.ticketId, Date.now());

    // Play crisp audio alert
    playTicketChime();

    // Show rich action toast with direct link to the ticket
    toast.info(`Ticket ${data.ticketKey} assigned to you`, `${data.actorName} assigned: ${data.subject}`, {
      badge: data.priority ? data.priority.toUpperCase() : undefined,
      duration: 8000,
      action: {
        label: "View Ticket",
        onClick: () => router.push(`/tickets/${data.ticketId}`),
      },
    });
  });

  useRealtimeEvent<TicketUpdated>("ticket.updated", ({ data }) => {
    if (!user || data.actorId === user.id) return;
    if (data.requesterId !== user.id && data.assigneeId !== user.id) return;
    if (Number(openId) === data.ticketId) return;

    const timer = setTimeout(() => {
      timers.current.delete(timer);
      const at = notified.current.get(data.ticketId);
      if (at && Date.now() - at < SETTLE_MS + 2000) return;
      toast.info(`Ticket ${ticketKey(data.ticketId)} updated`, undefined, {
        action: {
          label: "View Ticket",
          onClick: () => router.push(`/tickets/${data.ticketId}`),
        },
      });
    }, SETTLE_MS);
    timers.current.add(timer);
  });

  return null;
}
