"use client";
// Date + slot grid from /availability, with "Next available" (/availability/next). Shared by booking and rescheduling.
import { CalendarClock, CalendarOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { cn } from "@/lib/cn";
import { formatClock, formatDay, localDay } from "@/lib/format";
import { useAvailability, useFindNextAvailable } from "../hooks/useClinic";

export interface SlotPickerProps {
  providerId: number | null;
  date: string;
  time: string | null;
  onChange: (value: { date: string; time: string | null }) => void;
  /** Allow typing any time (front desk "book anyway") */
  allowCustomTime?: boolean;
  dateError?: string | null;
  timeError?: string | null;
}

export function SlotPicker({ providerId, date, time, onChange, allowCustomTime = false, dateError, timeError }: SlotPickerProps) {
  const { data, isPending, error, refetch, isPlaceholderData } = useAvailability(providerId, date);
  const next = useFindNextAvailable();
  const slots = data?.slots ?? [];
  const freeCount = slots.filter(slot => slot.available).length;

  function findNext() {
    if (!providerId) return;
    next.mutate(
      { providerId, from: date },
      {
        onSuccess: result => {
          const first = result.slots[0];
          if (first) onChange({ date: first.date, time: first.start });
        },
      }
    );
  }

  let body;
  if (!providerId) body = <p className="text-sm text-muted-foreground">Choose a practitioner to see free times.</p>;
  else if (isPending) body = <LoadingState label="Loading free times…" className="py-6" />;
  else if (error) body = <ErrorState message="Unable to load free times." onRetry={() => void refetch()} />;
  else if (data?.closed)
    body = (
      <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
        <CalendarOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        Closed on {formatDay(date)}: {data.closed}.
      </p>
    );
  else if (!slots.length) body = <p className="text-sm text-muted-foreground">No sessions on this day.</p>;
  else
    body = (
      <div role="group" aria-label={`Times on ${formatDay(date)}`} className={cn("grid grid-cols-3 gap-2 sm:grid-cols-5", isPlaceholderData && "opacity-60")}>
        {slots.map(slot => {
          const selected = time === slot.start;
          return (
            <button
              key={slot.start}
              type="button"
              disabled={!slot.available && !selected}
              aria-pressed={selected}
              aria-label={`${formatClock(slot.start)}, ${slot.available ? "available" : "unavailable"}`}
              onClick={() => onChange({ date, time: slot.start })}
              className={cn(
                "h-9 rounded-lg border text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : slot.available
                    ? "border-input bg-card hover:border-primary hover:bg-accent"
                    : "cursor-not-allowed border-transparent bg-muted text-muted-foreground line-through opacity-70"
              )}
            >
              {formatClock(slot.start)}
            </button>
          );
        })}
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <TextField label="Date" type="date" min={localDay()} value={date} onChange={event => onChange({ date: event.target.value, time: null })} error={dateError} className="w-44" required />
        <Button variant="secondary" onClick={findNext} loading={next.isPending} disabled={!providerId}>
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          Next available
        </Button>
        {data && !data.closed && slots.length > 0 && (
          <span className="pb-2 text-xs text-muted-foreground" aria-live="polite">
            {freeCount} of {slots.length} free · {data.slotMinutes}-min slots
          </span>
        )}
      </div>
      {next.data && next.data.slots.length === 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          No free slots in the booking window.
        </p>
      )}
      {next.error && <p role="alert" className="text-sm text-destructive">{next.error.message}</p>}
      {body}
      {timeError && (
        <p role="alert" className="text-sm text-destructive">
          {timeError}
        </p>
      )}
      {allowCustomTime && (
        <TextField
          label="Or enter a time"
          type="time"
          value={time ?? ""}
          onChange={event => onChange({ date, time: event.target.value || null })}
          hint="Any time, even outside the practitioner's hours."
          className="w-44"
        />
      )}
    </div>
  );
}
