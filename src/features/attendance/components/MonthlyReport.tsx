"use client";
import { useState, type ReactNode } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { cn } from "@/lib/cn";
import { useAttendanceReport } from "../hooks/useAttendance";
import { formatHours, monthOf } from "../utils/attendanceMeta";
import { MonthPicker } from "./MonthPicker";

/** Feature component (admins): days present, hours, and leave per person for a month. */
export function MonthlyReport() {
  const [month, setMonth] = useState(() => monthOf());
  const { data, isPending, isPlaceholderData, error, refetch } = useAttendanceReport(month);

  let body: ReactNode;
  if (isPending) body = <LoadingState label="Loading report…" />;
  else if (error) body = <ErrorState message="Unable to load the report." onRetry={() => void refetch()} />;
  else if (!data.rows.length) body = <EmptyState title="No one to report on" message="Active people appear here with their days present, hours, and leave." />;
  else {
    body = (
      <div className={cn("relative overflow-x-auto rounded-xl border bg-card", isPlaceholderData && "opacity-60")}>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Monthly attendance by person</caption>
          <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-semibold">Person</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Days present</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Late</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Leave days</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Hours</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Attendance</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.rows.map(row => {
              const rate = data.workingDays ? Math.min(100, Math.round(((row.daysPresent + row.leaveDays) / data.workingDays) * 100)) : 0;
              const late = row.lateDays ?? 0;
              return (
                <tr key={row.user.id}>
                  <td className="px-3 py-2.5">
                    <span className="font-medium">{row.user.name}</span>
                    {row.user.jobTitle && <span className="block text-xs text-muted-foreground">{row.user.jobTitle}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.daysPresent}</td>
                  <td className={cn("px-3 py-2.5 text-right tabular-nums", late > 0 && "font-medium text-warning")}>{late}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.leaveDays}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{formatHours(row.hours)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-24 rounded-full bg-muted" aria-hidden="true">
                        <span className="block h-full rounded-full bg-primary/85" style={{ width: `${rate}%` }} />
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">{rate}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section aria-labelledby="monthly-report-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="monthly-report-heading" className="font-semibold">
            Monthly report
          </h2>
          {data && <p className="text-xs text-muted-foreground">{data.workingDays} working days in your workspace calendar. Attendance counts days present plus approved leave.</p>}
        </div>
        <MonthPicker month={month} onChange={setMonth} />
      </div>
      {body}
    </section>
  );
}
