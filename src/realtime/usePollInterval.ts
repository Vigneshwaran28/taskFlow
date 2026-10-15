"use client";
import { useRealtimeStatus } from "./RealtimeProvider";

/** Slow safety-net poll while live updates are connected (sockets can drop silently). */
export const LIVE_FALLBACK_MS = 90_000;

/**
 * A query's `refetchInterval`: `offlineMs` while live updates are down (or outside the signed-in shell),
 * a slow fallback while they're connected, since events then trigger the refetches.
 */
export function usePollInterval(offlineMs: number, liveMs = LIVE_FALLBACK_MS) {
  return useRealtimeStatus() === "live" ? Math.max(liveMs, offlineMs) : offlineMs;
}
