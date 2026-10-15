"use client";
import { cn } from "@/lib/cn";
import { useRealtimeStatus } from "./RealtimeProvider";

const LABELS = { live: "Live updates on", connecting: "Connecting to live updates…", offline: "Live updates paused; the page still refreshes on its own" };

/** A small dot in the top bar showing whether live updates are connected. */
export function LiveIndicator() {
  const status = useRealtimeStatus();
  return (
    <span className="hidden items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted-foreground sm:inline-flex" title={LABELS[status]} role="status" aria-label={LABELS[status]}>
      <span
        aria-hidden="true"
        className={cn("h-2 w-2 rounded-full", status === "live" ? "bg-emerald-500" : status === "connecting" ? "animate-pulse bg-amber-500 motion-reduce:animate-none" : "bg-slate-400")}
      />
      {status === "live" ? "Live" : status === "connecting" ? "…" : "Offline"}
    </span>
  );
}
