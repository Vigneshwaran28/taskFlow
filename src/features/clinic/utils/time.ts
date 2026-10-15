// Clinic-local wall-clock helpers. Appointment times are "YYYY-MM-DDTHH:MM" strings built from a calendar
// day and an "HH:MM" clock time; they compare as text and are never converted through UTC.
import { localDay } from "@/lib/format";

const pad = (value: number) => String(value).padStart(2, "0");

/** The browser's wall clock as "YYYY-MM-DDTHH:MM". */
export function nowStamp(date = new Date()) {
  return `${localDay(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "2026-10-05" + "09:30" -> "2026-10-05T09:30" */
export const stampOf = (day: string, hhmm: string) => `${day}T${hhmm}`;

/** "09:30" -> 570 */
export function minutesOf(hhmm: string) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/** 570 -> "09:30" */
export const clockOf = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** Weekday (0 = Sunday) of a "YYYY-MM-DD" day, read as a local calendar day. */
export const weekdayOf = (day: string) => new Date(`${day}T00:00:00`).getDay();

export const isClock = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
