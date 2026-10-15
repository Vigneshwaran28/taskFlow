"use client";
import { useState } from "react";
import { CalendarClock, Wrench, X } from "lucide-react";
import { useCurrentUser } from "@/features/auth";
import { expectedBack, windowRange } from "../utils/maintenanceText";

/**
 * Feature component for the app shell: tells owners and admins they're working during a maintenance window (everyone
 * else sees the maintenance page), and tells everyone about a window coming up.
 */
export function MaintenanceBanner() {
  const { data: user } = useCurrentUser();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const active = user?.maintenance?.active;
  const upcoming = user?.maintenance?.upcoming;

  if (active) {
    return (
      <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
        <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Maintenance mode: only owners and admins can use {active.scope === "platform" ? "TaskFlow" : "this workspace"} right now.</p>
          <p className="text-muted-foreground">
            {active.message ? `${active.message} · ` : ""}
            {expectedBack(active)}
          </p>
        </div>
      </div>
    );
  }

  const key = upcoming ? `${upcoming.scope}:${upcoming.startsAt}` : null;
  if (!upcoming || dismissed === key) return null;
  return (
    <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm">
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          Scheduled maintenance {windowRange(upcoming)}
        </p>
        <p className="text-muted-foreground">
          {upcoming.scope === "platform" ? "TaskFlow" : "This workspace"} will be unavailable then{upcoming.allowAdmins ? " (owners and admins can still sign in)" : ""}.
          {upcoming.message ? ` ${upcoming.message}` : ""} Save your work before it starts.
        </p>
      </div>
      <button type="button" onClick={() => setDismissed(key)} aria-label="Dismiss" className="rounded p-1 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
