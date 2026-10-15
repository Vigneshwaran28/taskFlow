// Date helpers in the user's local timezone. The API stores ISO-8601 UTC strings.

export const startOfDay = (date: Date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfDay = (date: Date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO string -> value for <input type="datetime-local"> (local time, minutes precision). */
export function toLocalInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value -> ISO string (or null). */
export function fromLocalInputValue(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** "YYYY-MM-DD" shifted by n calendar days. */
export function shiftDay(day: string, n: number) {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
const fullFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** "Today, 3:00 PM" / "Tomorrow, 9:00 AM" / "Mon, Oct 6, 9:00 AM" */
export function formatRelativeDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  const today = new Date();
  if (isSameDay(date, today)) return `Today, ${timeFormat.format(date)}`;
  if (isSameDay(date, addDays(today, 1))) return `Tomorrow, ${timeFormat.format(date)}`;
  if (isSameDay(date, addDays(today, -1))) return `Yesterday, ${timeFormat.format(date)}`;
  return `${dayFormat.format(date)}, ${timeFormat.format(date)}`;
}

export const formatDateTime = (iso: string | null | undefined) => (iso ? fullFormat.format(new Date(iso)) : "");

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

/** "5 minutes ago", "in 2 hours" */
export function formatTimeAgo(iso: string) {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relativeFormat.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

/**
 * Whole years between a YYYY-MM-DD date (a birthday or joining date) and today, or null.
 * Mirrors the server's ageOf, so forms show the same age the server stores.
 */
export function yearsSince(day: string | null | undefined, today: Date = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day ?? "");
  if (!match) return null;
  const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])];
  let years = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < date)) years--;
  return years;
}
