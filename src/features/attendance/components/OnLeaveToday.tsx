"use client";
// "On leave": who is on approved leave on a day, for everyone with attendance access, so colleagues can plan around
// it (the reception knows which doctor is away). Shows the type, half or full day and the dates, never the reason.
// `compact`: today only, a short card for the home page.
import Link from "@/components/navigation/Link";
import { useState, type ReactNode } from "react";
import { Palmtree } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Badge } from "@/components/ui/Badge";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/cn";
import { formatDay, localDay } from "@/lib/format";
import { useOnLeave } from "../hooks/useAttendance";
import type { OnLeavePerson } from "../services/attendanceService";
import { LEAVE_PORTIONS, LEAVE_TYPES } from "../utils/attendanceMeta";

const COMPACT_LIMIT = 5;

/** "Sick leave · first half", "Annual leave". */
const leaveLabel = (person: OnLeavePerson) => [LEAVE_TYPES[person.type]?.label ?? "Leave", person.portion !== "full" ? LEAVE_PORTIONS[person.portion].short : null].filter(Boolean).join(" · ");

/** "Today only", "6 Oct – 9 Oct". */
function span(person: OnLeavePerson) {
  if (person.startDate === person.endDate) return formatDay(person.startDate);
  return `${formatDay(person.startDate)} – ${formatDay(person.endDate)}`;
}

export function OnLeaveToday({ compact = false }: { compact?: boolean }) {
  const [date, setDate] = useState(() => localDay());
  const { data, isPending, isPlaceholderData, error, refetch } = useOnLeave(compact ? localDay() : date);

  if (compact) {
    return (
      <section aria-labelledby="on-leave-today-heading" className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 id="on-leave-today-heading" className="flex items-center gap-2 text-sm font-semibold">
            <Palmtree className="h-4 w-4 text-primary" aria-hidden="true" />
            On leave today
          </h3>
          <Link href="/attendance?tab=on-leave" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-sm text-muted-foreground">Couldn&apos;t load who&apos;s on leave.</p>
        ) : data.people.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody is on leave today.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {data.people.slice(0, COMPACT_LIMIT).map(person => (
              <li key={person.leaveId} className="flex items-center gap-2 text-sm">
                <Avatar name={person.user.name} size="sm" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{person.user.name}</span>
                  {person.roles.length > 0 && <span className="text-muted-foreground"> · {person.roles.join(", ")}</span>}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{leaveLabel(person)}</span>
              </li>
            ))}
            {data.people.length > COMPACT_LIMIT && <li className="text-xs text-muted-foreground">+{data.people.length - COMPACT_LIMIT} more</li>}
          </ul>
        )}
      </section>
    );
  }

  let body: ReactNode;
  if (isPending) body = <LoadingState label="Loading who's on leave…" />;
  else if (error) body = <ErrorState message="Unable to load who's on leave." onRetry={() => void refetch()} />;
  else if (!data.people.length) body = <EmptyState title="Nobody is on leave" message={`No approved leave on ${formatDay(date)}.`} icon={Palmtree} />;
  else {
    body = (
      <ul className={cn("divide-y overflow-hidden rounded-xl border bg-card", isPlaceholderData && "opacity-60")}>
        {data.people.map(person => (
          <li key={person.leaveId} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <Avatar name={person.user.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{person.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{[person.user.jobTitle, person.roles.join(", ")].filter(Boolean).join(" · ") || "—"}</p>
            </div>
            <p className="text-xs tabular-nums text-muted-foreground">{span(person)}</p>
            <Badge tone={person.portion === "full" ? "primary" : "info"}>{leaveLabel(person)}</Badge>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section aria-labelledby="on-leave-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="on-leave-heading" className="font-semibold">
            On leave
          </h2>
          <p className="text-sm text-muted-foreground">Approved leave on the day you pick{data ? ` · ${data.people.length} ${data.people.length === 1 ? "person" : "people"}` : ""}.</p>
        </div>
        <TextField label="Day" id="on-leave-day" type="date" value={date} onChange={event => event.target.value && setDate(event.target.value)} className="sm:w-48" />
      </div>
      {body}
    </section>
  );
}
