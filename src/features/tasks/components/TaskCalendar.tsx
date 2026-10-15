"use client";
// Feature component: fetches tasks for the visible month grid and renders it.
import { Plus } from "lucide-react";
import { canOpenModule } from "@/app-shell/modules";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { cn } from "@/lib/cn";
import { addDays, endOfDay, isSameDay, startOfDay } from "@/lib/dates";
import { localDay } from "@/lib/format";
import { HOLIDAY_TYPES, useHolidays } from "@/features/attendance";
import { useCurrentUser } from "@/features/auth";
import { useTasks } from "../hooks/useTasks";
import type { Task, TaskPriority } from "../services/taskService";
import { PRIORITIES } from "../utils/taskMeta";

const MAX_PER_DAY = 3;
const WEEKDAYS = Array.from(
  { length: 7 },
  (_, index) => new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(2024, 0, 7 + index)) // 2024-01-07 is a Sunday
);
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const PRIORITY_DOT: Record<TaskPriority, string> = { urgent: "bg-red-500", high: "bg-amber-500", medium: "bg-sky-500", low: "bg-slate-400" };

export interface TaskCalendarProps {
  /** First day of the visible month */
  month: Date;
  onCreate: (day: Date) => void;
  onOpen: (task: Task) => void;
}

export function TaskCalendar({ month, onCreate, onOpen }: TaskCalendarProps) {
  const gridStart = startOfDay(addDays(month, -month.getDay()));
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const gridEnd = endOfDay(days[days.length - 1]);

  const { data, isPending, error, refetch } = useTasks({
    dueFrom: gridStart.toISOString(),
    dueTo: gridEnd.toISOString(),
    sort: "due",
    pageSize: 500,
  });

  // Holidays come from the attendance module, when this person can open it. A grid can span two years.
  const { data: user } = useCurrentUser();
  const showHolidays = canOpenModule(user, "attendance");
  const firstYear = gridStart.getFullYear();
  const lastYear = gridEnd.getFullYear();
  const { data: holidaysA } = useHolidays(firstYear, { enabled: showHolidays });
  const { data: holidaysB } = useHolidays(lastYear, { enabled: showHolidays && lastYear !== firstYear });
  const allHolidays = [...(holidaysA?.holidays ?? []), ...(lastYear !== firstYear ? (holidaysB?.holidays ?? []) : [])];
  const holidaysByDay = new Map<string, typeof allHolidays>();
  for (const holiday of allHolidays) {
    if (holiday.type === "optional" && !holiday.picked) continue;
    holidaysByDay.set(holiday.date, [...(holidaysByDay.get(holiday.date) ?? []), holiday]);
  }

  const byDay = new Map<number, Task[]>();
  for (const task of data?.items ?? []) {
    if (!task.dueAt) continue;
    const key = startOfDay(new Date(task.dueAt)).getTime();
    byDay.set(key, [...(byDay.get(key) ?? []), task]);
  }
  const today = new Date();

  if (isPending) return <LoadingState label="Loading calendar…" />;
  if (error) return <ErrorState message="Unable to load the calendar." onRetry={() => void refetch()} />;

  return (
    <div className="relative overflow-x-auto rounded-xl border bg-card shadow-sm">
      <div className="grid min-w-[720px] grid-cols-7">
        {WEEKDAYS.map(day => (
          <div key={day} className="border-b bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {day}
          </div>
        ))}
        {days.map(day => {
          const tasks = byDay.get(day.getTime()) ?? [];
          const inMonth = day.getMonth() === month.getMonth();
          const isToday = isSameDay(day, today);
          const holidays = holidaysByDay.get(localDay(day)) ?? [];
          return (
            <div
              key={day.getTime()}
              className={cn(
                "group relative min-h-28 border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0",
                !inMonth && "bg-muted/30",
                holidays.length > 0 && "bg-red-50/60 dark:bg-red-500/5"
              )}
            >
              <div className="flex items-center justify-between px-1">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    isToday ? "bg-primary font-semibold text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {day.getDate()}
                </span>
                <button
                  type="button"
                  onClick={() => onCreate(day)}
                  aria-label={`Add task on ${day.toDateString()}`}
                  className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {holidays.map(holiday => (
                <p
                  key={holiday.id}
                  title={HOLIDAY_TYPES[holiday.type]?.label}
                  className="mt-1 flex items-center gap-1.5 truncate rounded-md px-1.5 text-xs font-medium text-red-700 dark:text-red-300"
                >
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", HOLIDAY_TYPES[holiday.type]?.dot)} aria-hidden="true" />
                  <span className="truncate">{holiday.name}</span>
                </p>
              ))}
              <ul className="mt-1 flex flex-col gap-1">
                {tasks.slice(0, MAX_PER_DAY).map(task => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(task)}
                      title={`${task.title} · ${PRIORITIES[task.priority]?.label} priority`}
                      className={cn(
                        "flex w-full items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        task.status === "done" && "text-muted-foreground line-through"
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", PRIORITY_DOT[task.priority])} aria-hidden="true" />
                      <span className="shrink-0 text-muted-foreground">{task.dueAt ? timeFormat.format(new Date(task.dueAt)) : ""}</span>
                      <span className="truncate">{task.title}</span>
                    </button>
                  </li>
                ))}
                {tasks.length > MAX_PER_DAY && <li className="px-1.5 text-xs text-muted-foreground">+{tasks.length - MAX_PER_DAY} more</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
