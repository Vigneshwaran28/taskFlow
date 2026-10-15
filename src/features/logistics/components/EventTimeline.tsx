// Vertical timeline of tracking events, newest first. Used by the shipment page and public tracking.
import { MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import type { ShipmentStatus } from "../services/logisticsService";
import { SHIPMENT_STATUSES } from "../utils/logisticsMeta";

export interface TimelineEvent {
  id?: number;
  status: ShipmentStatus;
  location: string | null;
  note: string | null;
  actor?: { name: string } | null;
  occurredAt: string;
}

export function EventTimeline({ events, label = "Tracking history" }: { events: TimelineEvent[]; label?: string }) {
  if (!events.length) return <p className="text-sm text-muted-foreground">No tracking updates yet.</p>;
  return (
    <ol aria-label={label} className="relative flex flex-col gap-5 border-l pl-6">
      {events.map((event, index) => {
        const meta = SHIPMENT_STATUSES[event.status];
        return (
          <li key={event.id ?? `${event.occurredAt}-${index}`} className="relative">
            <span
              aria-hidden="true"
              className={cn("absolute -left-[1.94rem] top-1 h-3 w-3 rounded-full ring-4 ring-card", index === 0 ? (meta?.bar ?? "bg-primary") : "bg-muted-foreground/40")}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className={cn("text-sm font-medium", index !== 0 && "text-muted-foreground")}>{meta?.label ?? event.status}</p>
              <time dateTime={event.occurredAt} className="text-xs tabular-nums text-muted-foreground">
                {formatDateTime(event.occurredAt)}
              </time>
            </div>
            {event.note && <p className="mt-0.5 text-sm">{event.note}</p>}
            <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              {event.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {event.location}
                </span>
              )}
              {event.actor && <span>by {event.actor.name}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
