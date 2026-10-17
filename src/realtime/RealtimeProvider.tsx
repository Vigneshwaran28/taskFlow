"use client";
// Live updates: one WebSocket per tab to the API's /ws. Server events are hints to re-fetch: each one
// invalidates the matching queries (the REST API stays the source of truth and enforces permissions).
// See docs/REALTIME.md for the event catalogue.
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useTenantSlug } from "@/lib/navigation";

export interface RealtimeEvent<T = Record<string, unknown>> {
  type: string;
  data: T;
  at: string;
}

export type RealtimeStatus = "connecting" | "live" | "offline";

type Listener = (event: RealtimeEvent) => void;

interface RealtimeContextValue {
  status: RealtimeStatus;
  subscribe: (listener: Listener) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/** Query key roots each event refreshes. Keys are the features' `xKeys.all` roots. */
const INVALIDATES: Record<string, QueryKey[]> = {
  "notification.created": [["notifications"]],
  "message.created": [["messaging"]],
  "conversation.updated": [["messaging"]],
  "ticket.updated": [["tickets"]],
  "ticket.assigned": [["tickets"], ["notifications"]],
  "meeting.created": [["meetings"]],
  "meeting.updated": [["meetings"]],
  "meeting.deleted": [["meetings"]],
  "meeting.reminder": [["meetings"], ["notifications"]],
  "announcement.changed": [["announcements"]],
  "note.changed": [["notes"]],
  "note.removed": [["notes"]],
  "shipment.updated": [["logistics"]],
  "clinic.queue.updated": [["clinic"]],
  "clinic.token.called": [["clinic"]],
  "password_reset.requested": [["users"]],
  "settings.updated": [["auth", "me"]],
  "broadcast.published": [["broadcasts"]],
};

/** Where the API's WebSocket lives: NEXT_PUBLIC_WS_URL, else the page's host on the API port (cookies are per host, not port). */
export function realtimeUrl(path: "/ws" | "/ws/public", query = "") {
  const configured = process.env.NEXT_PUBLIC_WS_URL?.replace(/\/+$/, "");
  const base = configured || `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:${process.env.NEXT_PUBLIC_API_PORT || "4000"}`;
  return `${base}${path}${query}`;
}

/**
 * Keeps a socket open with reconnect + backoff while `enabled`. Shared by the signed-in provider and public pages.
 * Returns the connection status; every parsed event goes to `onEvent`.
 */
export function useSocket(url: string | null, onEvent: (event: RealtimeEvent) => void, onClosedForGood?: () => void) {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const handler = useRef(onEvent);
  const closedHandler = useRef(onClosedForGood);
  useEffect(() => {
    handler.current = onEvent;
    closedHandler.current = onClosedForGood;
  });

  // A socket is an external system → effect is correct.
  useEffect(() => {
    if (!url) return undefined;
    let socket: WebSocket | null = null;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let keepAlive: ReturnType<typeof setInterval> | undefined;
    let stopped = false;

    const connect = () => {
      setStatus("connecting");
      socket = new WebSocket(url);
      socket.onopen = () => {
        attempt = 0;
        setStatus("live");
        keepAlive = setInterval(() => socket?.readyState === WebSocket.OPEN && socket.send("ping"), 25_000);
      };
      socket.onmessage = message => {
        try {
          const event = JSON.parse(String(message.data)) as RealtimeEvent;
          if (event?.type && event.type !== "pong") handler.current(event);
        } catch {
          // ignore malformed frames
        }
      };
      socket.onclose = close => {
        clearInterval(keepAlive);
        if (stopped) return;
        setStatus("offline");
        if (close.code === 4001) {
          // The server ended the session (deactivated, password reset) or changed its access (roles): let the app
          // re-check it. A session that ended unmounts this socket (sign-in page); one that's still valid reconnects
          // below, with its new permissions.
          closedHandler.current?.();
        }
        attempt += 1;
        const delay = Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5)) + Math.random() * 500 + (close.code === 4001 ? 2000 : 0);
        retry = setTimeout(connect, delay);
      };
    };

    connect();
    // Reconnect promptly when the tab comes back online.
    const onOnline = () => {
      if (socket && socket.readyState !== WebSocket.OPEN && socket.readyState !== WebSocket.CONNECTING) {
        clearTimeout(retry);
        connect();
      }
    };
    window.addEventListener("online", onOnline);
    return () => {
      stopped = true;
      clearTimeout(retry);
      clearInterval(keepAlive);
      window.removeEventListener("online", onOnline);
      socket?.close();
    };
  }, [url]);

  return url ? status : "offline";
}

/** Signed-in live updates. Mounted once in the app shell. */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const listeners = useRef(new Set<Listener>());
  const [url, setUrl] = useState<string | null>(null);
  // The socket signs in with this workspace's session (a browser can be signed in to several workspaces).
  const workspace = useTenantSlug();

  // The URL depends on window.location, so it's resolved after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the browser location
    setUrl(realtimeUrl("/ws", workspace ? `?ws=${encodeURIComponent(workspace)}` : ""));
  }, [workspace]);

  const status = useSocket(
    url,
    event => {
      for (const key of INVALIDATES[event.type] ?? []) void queryClient.invalidateQueries({ queryKey: key });
      if (event.type === "session.revoked") void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      for (const listener of listeners.current) listener(event);
    },
    () => void queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
  );

  const [value] = useState<RealtimeContextValue>(() => ({
    status: "connecting",
    subscribe: listener => {
      listeners.current.add(listener);
      return () => listeners.current.delete(listener);
    },
  }));

  return <RealtimeContext.Provider value={{ ...value, status }}>{children}</RealtimeContext.Provider>;
}

/** Connection status for the "Live" indicator. */
export function useRealtimeStatus(): RealtimeStatus {
  return useContext(RealtimeContext)?.status ?? "offline";
}

/** Runs `handler` for live events of the given types (e.g. a display board highlighting a called token). */
export function useRealtimeEvent<T = Record<string, unknown>>(types: string | string[], handler: (event: RealtimeEvent<T>) => void) {
  const context = useContext(RealtimeContext);
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  const key = [types].flat().join("|");
  useEffect(() => {
    if (!context) return undefined;
    const wanted = new Set(key.split("|"));
    return context.subscribe(event => {
      if (wanted.has(event.type)) latest.current(event as RealtimeEvent<T>);
    });
  }, [context, key]);
}

/** Anonymous live updates for one public channel ("queue:<code>" or "track:<code>"); returns the status. */
export function usePublicChannel(channel: string | null, onEvent: (event: RealtimeEvent) => void) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the browser location once
    setUrl(channel ? realtimeUrl("/ws/public", `?channel=${encodeURIComponent(channel)}`) : null);
  }, [channel]);
  return useSocket(url, onEvent);
}
