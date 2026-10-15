"use client";
import { useState, type ReactNode } from "react";
import { CalendarX } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { formatDay, formatTime } from "@/lib/format";
import { useMyAttendance } from "../hooks/useAttendance";
import { formatHours, formatMinutes, LEAVE_TYPES, monthOf } from "../utils/attendanceMeta";
import { MonthPicker } from "./MonthPicker";

/** Feature component: the signed-in user's days in a month, with totals. */
export function MyMonth() {
  const [month, setMonth] = useState(() => monthOf());
  const { data, isPending, isPlaceholderData, error, refetch } = useMyAttendance(month);

  let body: ReactNode;
  if (isPending) body = <LoadingState label="Loading your month…" />;
  else if (error) body = <ErrorState message="Unable to load your attendance." onRetry={() => void refetch()} />;
  else {
    const { summary } = data;
    const figures: [string, ReactNode][] = [
      ["Days present", `${summary.daysPresent} / ${summary.workingDays ?? "—"}`],
      ["Late arrivals", summary.lateDays ?? 0],
      ["Hours worked", formatHours(summary.hours)],
      ["Average day", summary.averageHours ? formatHours(summary.averageHours) : "—"],
      ["Leave days", summary.leaveDays],
      ["Annual leave left", data.balance ? `${data.balance.remaining} / ${data.balance.allowance}` : "—"],
    ];
    body = (
      <div className={cn("flex flex-col gap-4", isPlaceholderData && "opacity-60")}>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {figures.map(([label, value]) => (
            <div key={label} className="rounded-xl border bg-card p-4">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        {data.leaves.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Approved leave this month">
            {data.leaves.map(leave => (
              <li key={leave.id}>
                <Badge tone="primary">
                  {LEAVE_TYPES[leave.type]?.label}: {formatDay(leave.startDate)}
                  {leave.endDate !== leave.startDate ? ` to ${formatDay(leave.endDate)}` : ""}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {data.records.length ? (
          <div className="relative overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Attendance in the selected month</caption>
              <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Day</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Check in</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Check out</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Worked</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...data.records].reverse().map(record => (
                  <tr key={record.id}>
                    <td className="px-3 py-2.5 font-medium">{formatDay(record.date)}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      <span className="flex flex-wrap items-center gap-1.5">
                        {formatTime(record.checkInAt)}
                        {record.source === "auto" && <Badge tone="info">Auto</Badge>}
                        {record.lateMinutes > 0 && <Badge tone="warning">{formatMinutes(record.lateMinutes)} late</Badge>}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{record.checkOutAt ? formatTime(record.checkOutAt) : <Badge tone="success">Still working</Badge>}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{record.checkOutAt ? formatHours(record.hours) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No days recorded" message="Check in each workday; your days appear here." icon={CalendarX} />
        )}
      </div>
    );
  }

  return (
    <section aria-labelledby="my-month-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="my-month-heading" className="font-semibold">
          My attendance
        </h2>
        <MonthPicker month={month} onChange={setMonth} />
      </div>
      {body}
    </section>
  );
}
