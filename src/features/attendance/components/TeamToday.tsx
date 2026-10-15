"use client";
import { useState, type ReactNode } from "react";
import { Users } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Badge } from "@/components/ui/Badge";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/cn";
import { formatTime, localDay } from "@/lib/format";
import { useTeamAttendance } from "../hooks/useAttendance";
import type { DayStatus } from "../services/attendanceService";
import { DAY_STATUSES, formatHours, formatMinutes, LEAVE_PORTIONS, LEAVE_TYPES } from "../utils/attendanceMeta";

const ORDER: Record<DayStatus, number> = { present: 0, checked_out: 1, half_day_leave: 2, on_leave: 3, absent: 4, day_off: 9 };

/** Feature component (admins): everyone's status for a day. */
export function TeamToday() {
  const [date, setDate] = useState(() => localDay());
  const { data, isPending, isPlaceholderData, error, refetch } = useTeamAttendance(date);

  let body: ReactNode;
  if (isPending) body = <LoadingState label="Loading the team…" />;
  else if (error) body = <ErrorState message="Unable to load team attendance." onRetry={() => void refetch()} />;
  else if (!data.people.length) body = <EmptyState title="No active users" message="Add people in Manage users." icon={Users} />;
  else {
    const people = [...data.people].sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.user.name.localeCompare(b.user.name));
    const figures: [string, number, string][] = [
      ["In today", data.summary.present, "text-success"],
      ["Late", data.summary.late ?? 0, "text-warning"],
      ["On leave", data.summary.onLeave, "text-primary"],
      ["Not checked in", data.summary.absent, "text-muted-foreground"],
    ];
    body = (
      <div className={cn("flex flex-col gap-3", isPlaceholderData && "opacity-60")}>
        {data.offReason && (
          <p className="rounded-lg border bg-muted/40 px-4 py-2.5 text-sm">
            {data.holiday ? `${data.holiday.name}: a holiday for the team.` : `This day is ${data.offReason}.`} Anyone who checks in is shown as working.
          </p>
        )}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {figures.map(([label, value, tone]) => (
            <div key={label} className="rounded-xl border bg-card p-4">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className={cn("mt-1 text-2xl font-semibold tabular-nums", tone)}>
                {value}
                <span className="text-sm font-normal text-muted-foreground"> / {data.summary.total}</span>
              </dd>
            </div>
          ))}
        </dl>
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {people.map(person => {
            const status = DAY_STATUSES[person.status];
            const late = person.record?.lateMinutes ?? 0;
            return (
              <li key={person.user.id} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar name={person.user.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{person.user.name}</p>
                  {person.user.jobTitle && <p className="truncate text-xs text-muted-foreground">{person.user.jobTitle}</p>}
                </div>
                <p className="hidden text-right text-xs tabular-nums text-muted-foreground sm:block">
                  {person.record && (
                    <>
                      In {formatTime(person.record.checkInAt)}
                      {person.record.source === "auto" && " (auto)"}
                      {person.record.checkOutAt && ` · Out ${formatTime(person.record.checkOutAt)} · ${formatHours(person.record.hours)}`}
                    </>
                  )}
                  {person.leave && (
                    <span className="block">
                      {LEAVE_TYPES[person.leave.type]?.label}
                      {person.leave.portion !== "full" ? `, ${LEAVE_PORTIONS[person.leave.portion].short}` : ""}
                    </span>
                  )}
                </p>
                {late > 0 && <Badge tone="warning">{formatMinutes(late)} late</Badge>}
                <Badge tone={status.tone}>{status.label}</Badge>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <section aria-labelledby="team-today-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 id="team-today-heading" className="font-semibold">
          Team attendance
        </h2>
        <TextField label="Day" id="team-day" type="date" max={localDay()} value={date} onChange={event => event.target.value && setDate(event.target.value)} className="sm:w-48" />
      </div>
      {body}
    </section>
  );
}
