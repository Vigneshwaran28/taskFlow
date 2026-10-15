// Display metadata for leave and day status. Complete class names only.
import type { Tone } from "@/components/ui/Badge";
import type { DayStatus, HolidayType, LeavePortion, LeaveStatus, LeaveType } from "../services/attendanceService";

export const LEAVE_TYPES: Readonly<Record<LeaveType, { label: string }>> = Object.freeze({
  annual: { label: "Annual leave" },
  sick: { label: "Sick leave" },
  casual: { label: "Casual leave" },
  unpaid: { label: "Unpaid leave" },
  other: { label: "Other" },
});

export const isLeaveType = (value: string): value is LeaveType => Object.hasOwn(LEAVE_TYPES, value);

export const LEAVE_STATUSES: Readonly<Record<LeaveStatus, { label: string; tone: Tone }>> = Object.freeze({
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
});

export const DAY_STATUSES: Readonly<Record<DayStatus, { label: string; tone: Tone }>> = Object.freeze({
  present: { label: "Working", tone: "success" },
  checked_out: { label: "Checked out", tone: "info" },
  on_leave: { label: "On leave", tone: "primary" },
  half_day_leave: { label: "Half-day leave", tone: "primary" },
  absent: { label: "Not checked in", tone: "neutral" },
  day_off: { label: "Day off", tone: "neutral" },
});

export const HOLIDAY_TYPES: Readonly<Record<HolidayType, { label: string; short: string; tone: Tone; dot: string }>> = Object.freeze({
  public: { label: "Public holiday", short: "Public", tone: "danger", dot: "bg-red-500" },
  company: { label: "Company holiday", short: "Company", tone: "primary", dot: "bg-primary" },
  optional: { label: "Optional holiday", short: "Optional", tone: "warning", dot: "bg-amber-500" },
});

export const HOLIDAY_TYPE_KEYS = Object.keys(HOLIDAY_TYPES) as HolidayType[];

/** Which week of the month a day-of-month falls in (1st Saturday = 1). Mirrors the server. */
export const weekOfMonth = (dayOfMonth: number) => Math.ceil(dayOfMonth / 7);

export interface WeekRules {
  workingDays?: number[];
  saturdaysOff?: number[];
}

/** True when a YYYY-MM-DD date is a weekly day off under the workspace's working-day rules. */
export function isWeeklyOff(date: string, { workingDays = [1, 2, 3, 4, 5], saturdaysOff = [] }: WeekRules = {}) {
  const day = new Date(`${date}T00:00:00`);
  const weekday = day.getDay();
  if (!workingDays.includes(weekday)) return true;
  return weekday === 6 && saturdaysOff.includes(weekOfMonth(day.getDate()));
}

/** True for a real YYYY-MM-DD calendar day (rejects 2026-02-30). Mirrors the server's date check. */
export function isRealDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** Whole calendar days from `from` to `to` (both YYYY-MM-DD). */
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** "2026-10" for a Date, in local time. */
export const monthOf = (date: Date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

/** Shift a "YYYY-MM" month by n months. */
export function shiftMonth(month: string, n: number) {
  const [year, index] = month.split("-").map(Number);
  return monthOf(new Date(year, index - 1 + n, 1));
}

const monthFormat = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
export const formatMonth = (month: string) => monthFormat.format(new Date(`${month}-01T00:00:00`));

/** "7.5" hours -> "7h 30m" */
export function formatHours(hours: number) {
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

export const LEAVE_PORTIONS: Readonly<Record<LeavePortion, { label: string; short: string }>> = Object.freeze({
  full: { label: "Full day(s)", short: "" },
  first_half: { label: "First half (morning)", short: "first half" },
  second_half: { label: "Second half (afternoon)", short: "second half" },
});

/** The local clock as HH:MM, sent with check-ins so lateness uses the employee's own time. */
export function localTime(date: Date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** 25 minutes -> "25m", 75 -> "1h 15m" */
export const formatMinutes = (minutes: number) => (minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`);
