// Display metadata and pure helpers for the clinic: statuses, types, transitions, options, vitals ranges.
import type { Tone } from "@/components/ui/Badge";
import type { Accent } from "@/hooks/useTheme";
import type { AppointmentType } from "@/types/session";
import type { AppointmentStatus, BloodGroup, Gender, PrescriptionRoute, Vitals } from "../services/clinicService";

export const APPOINTMENT_STATUS_META: Readonly<Record<AppointmentStatus, { label: string; tone: Tone }>> = Object.freeze({
  scheduled: { label: "Scheduled", tone: "neutral" },
  confirmed: { label: "Confirmed", tone: "info" },
  checked_in: { label: "Checked in", tone: "warning" },
  in_progress: { label: "In consultation", tone: "primary" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  no_show: { label: "No-show", tone: "danger" },
});

export const statusLabel = (status: AppointmentStatus) => APPOINTMENT_STATUS_META[status]?.label ?? status;

export const APPOINTMENT_TYPE_META: Readonly<Record<AppointmentType, { label: string; tone: Tone }>> = Object.freeze({
  consultation: { label: "Consultation", tone: "primary" },
  follow_up: { label: "Follow-up", tone: "info" },
  procedure: { label: "Procedure", tone: "warning" },
  teleconsult: { label: "Teleconsult", tone: "info" },
  vaccination: { label: "Vaccination", tone: "success" },
  lab_test: { label: "Lab test", tone: "neutral" },
  checkup: { label: "Check-up", tone: "success" },
});

export const typeLabel = (type: string) => APPOINTMENT_TYPE_META[type as AppointmentType]?.label ?? type.replaceAll("_", " ");

/** Allowed status changes (mirrors the server's TRANSITIONS). */
export const TRANSITIONS: Readonly<Record<AppointmentStatus, readonly AppointmentStatus[]>> = Object.freeze({
  scheduled: ["confirmed", "checked_in", "cancelled", "no_show"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
});

export const canMove = (from: AppointmentStatus, to: AppointmentStatus) => TRANSITIONS[from]?.includes(to) ?? false;
export const isClosed = (status: AppointmentStatus) => TRANSITIONS[status]?.length === 0;
export const isReschedulable = (status: AppointmentStatus) => status === "scheduled" || status === "confirmed";
/** Statuses that hold a slot in the book (cancelled and no-show free it). */
export const holdsSlot = (status: AppointmentStatus) => status !== "cancelled" && status !== "no_show";

/** in_progress / completed need the treating practitioner (or records.view); the rest need appointments.manage. */
export const isClinicalStatus = (status: AppointmentStatus) => status === "in_progress" || status === "completed";

export const GENDER_OPTIONS: readonly { value: Gender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Prefer not to say" },
];

export const genderLabel = (gender: Gender | null | undefined) => GENDER_OPTIONS.find(option => option.value === gender)?.label ?? "";

export const BLOOD_GROUPS: readonly BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const ROUTE_OPTIONS: readonly { value: PrescriptionRoute; label: string }[] = [
  { value: "oral", label: "Oral" },
  { value: "topical", label: "Topical" },
  { value: "injection", label: "Injection" },
  { value: "inhaled", label: "Inhaled" },
  { value: "drops", label: "Drops" },
  { value: "other", label: "Other" },
];

export const routeLabel = (route: string | null | undefined) => ROUTE_OPTIONS.find(option => option.value === route)?.label ?? route ?? "";

export const MAX_PRESCRIPTIONS = 30;

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** "34 y · Female"; "~34 y" when the age was entered without a date of birth. */
export function ageGender(age: number | null | undefined, gender: Gender | null | undefined, estimated = false) {
  return [age != null ? `${estimated ? "~" : ""}${age} y` : null, genderLabel(gender) || null].filter(Boolean).join(" · ");
}

/** "34 yrs", or "~34 yrs" for an estimated age; "" when unknown. */
export const ageLabel = (age: number | null | undefined, estimated = false) => (age == null ? "" : `${estimated ? "~" : ""}${age} ${age === 1 ? "yr" : "yrs"}`);

/** A patient number shown in two groups of four: "1234 5678". */
export const formatPatientNumber = (value: string | null | undefined) => (value ? value.replace(/^(\d{4})(\d+)$/, "$1 $2") : "");

// ---- Vitals ----
export type VitalKey = keyof Vitals;

export interface VitalMeta {
  key: VitalKey;
  label: string;
  short: string;
  unit: string;
  /** Accepted by the server */
  min: number;
  max: number;
  /** Typical adult range; values outside it are flagged gently */
  normal: [number, number];
  step: string;
}

export const VITALS: readonly VitalMeta[] = [
  { key: "bpSystolic", label: "BP systolic", short: "Sys", unit: "mmHg", min: 50, max: 260, normal: [90, 140], step: "1" },
  { key: "bpDiastolic", label: "BP diastolic", short: "Dia", unit: "mmHg", min: 30, max: 160, normal: [60, 90], step: "1" },
  { key: "pulse", label: "Pulse", short: "Pulse", unit: "bpm", min: 20, max: 250, normal: [60, 100], step: "1" },
  { key: "temperatureC", label: "Temperature", short: "Temp", unit: "°C", min: 30, max: 45, normal: [36.1, 37.5], step: "0.1" },
  { key: "weightKg", label: "Weight", short: "Wt", unit: "kg", min: 0.3, max: 400, normal: [0.3, 400], step: "0.1" },
  { key: "heightCm", label: "Height", short: "Ht", unit: "cm", min: 20, max: 260, normal: [20, 260], step: "0.1" },
  { key: "spo2", label: "SpO₂", short: "SpO₂", unit: "%", min: 50, max: 100, normal: [95, 100], step: "1" },
  { key: "respiratoryRate", label: "Respiratory rate", short: "RR", unit: "/min", min: 4, max: 80, normal: [12, 20], step: "1" },
];

export const vitalMeta = (key: VitalKey) => VITALS.find(item => item.key === key)!;

/** "invalid" outside what the server accepts, "abnormal" outside the typical range, else null. */
export function vitalFlag(key: VitalKey, value: number | null | undefined): "invalid" | "abnormal" | null {
  if (value == null || Number.isNaN(value)) return null;
  const meta = vitalMeta(key);
  if (value < meta.min || value > meta.max) return "invalid";
  if (value < meta.normal[0] || value > meta.normal[1]) return "abnormal";
  return null;
}

/** BMI from kg and cm, one decimal (same as the server). */
export function bmiOf(weightKg: number | null | undefined, heightCm: number | null | undefined) {
  if (!weightKg || !heightCm) return null;
  return Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10;
}

export function bmiCategory(bmi: number | null) {
  if (bmi == null) return null;
  if (bmi < 18.5) return { label: "Underweight", tone: "warning" as Tone };
  if (bmi < 25) return { label: "Healthy", tone: "success" as Tone };
  if (bmi < 30) return { label: "Overweight", tone: "warning" as Tone };
  return { label: "Obese", tone: "danger" as Tone };
}

/** Compact chips for a visit's vitals: "BP 120/80 mmHg", "Pulse 72 bpm", … */
export function vitalChips(vitals: Vitals | null | undefined, bmi?: number | null) {
  if (!vitals) return [];
  const chips: { label: string; flagged: boolean }[] = [];
  if (vitals.bpSystolic != null && vitals.bpDiastolic != null) {
    chips.push({ label: `BP ${vitals.bpSystolic}/${vitals.bpDiastolic} mmHg`, flagged: Boolean(vitalFlag("bpSystolic", vitals.bpSystolic) || vitalFlag("bpDiastolic", vitals.bpDiastolic)) });
  }
  for (const meta of VITALS) {
    if (meta.key === "bpSystolic" || meta.key === "bpDiastolic") continue;
    const value = vitals[meta.key];
    if (value != null) chips.push({ label: `${meta.short} ${value} ${meta.unit}`, flagged: Boolean(vitalFlag(meta.key, value)) });
  }
  if (bmi != null) chips.push({ label: `BMI ${bmi}`, flagged: bmi < 18.5 || bmi >= 30 });
  return chips;
}

// ---- Practitioner colours (static classes so Tailwind keeps them; each has a dark variant) ----
export interface AccentClasses {
  dot: string;
  block: string;
  header: string;
  swatch: string;
}

export const ACCENT_CLASSES: Readonly<Record<Accent, AccentClasses>> = Object.freeze({
  indigo: {
    dot: "bg-indigo-500",
    block: "border-indigo-500 bg-indigo-50 text-indigo-950 dark:bg-indigo-500/15 dark:text-indigo-100",
    header: "border-t-indigo-500",
    swatch: "bg-indigo-500",
  },
  blue: { dot: "bg-blue-500", block: "border-blue-500 bg-blue-50 text-blue-950 dark:bg-blue-500/15 dark:text-blue-100", header: "border-t-blue-500", swatch: "bg-blue-500" },
  teal: { dot: "bg-teal-500", block: "border-teal-500 bg-teal-50 text-teal-950 dark:bg-teal-500/15 dark:text-teal-100", header: "border-t-teal-500", swatch: "bg-teal-500" },
  emerald: {
    dot: "bg-emerald-500",
    block: "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-100",
    header: "border-t-emerald-500",
    swatch: "bg-emerald-500",
  },
  amber: { dot: "bg-amber-500", block: "border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-500/15 dark:text-amber-100", header: "border-t-amber-500", swatch: "bg-amber-500" },
  rose: { dot: "bg-rose-500", block: "border-rose-500 bg-rose-50 text-rose-950 dark:bg-rose-500/15 dark:text-rose-100", header: "border-t-rose-500", swatch: "bg-rose-500" },
  violet: {
    dot: "bg-violet-500",
    block: "border-violet-500 bg-violet-50 text-violet-950 dark:bg-violet-500/15 dark:text-violet-100",
    header: "border-t-violet-500",
    swatch: "bg-violet-500",
  },
  slate: { dot: "bg-slate-500", block: "border-slate-500 bg-slate-100 text-slate-950 dark:bg-slate-500/20 dark:text-slate-100", header: "border-t-slate-500", swatch: "bg-slate-500" },
  cyan: { dot: "bg-cyan-500", block: "border-cyan-500 bg-cyan-50 text-cyan-950 dark:bg-cyan-500/15 dark:text-cyan-100", header: "border-t-cyan-500", swatch: "bg-cyan-500" },
  fuchsia: { dot: "bg-fuchsia-500", block: "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-950 dark:bg-fuchsia-500/15 dark:text-fuchsia-100", header: "border-t-fuchsia-500", swatch: "bg-fuchsia-500" },
  lime: { dot: "bg-lime-500", block: "border-lime-500 bg-lime-50 text-lime-950 dark:bg-lime-500/15 dark:text-lime-100", header: "border-t-lime-500", swatch: "bg-lime-500" },
  orange: { dot: "bg-orange-500", block: "border-orange-500 bg-orange-50 text-orange-950 dark:bg-orange-500/15 dark:text-orange-100", header: "border-t-orange-500", swatch: "bg-orange-500" },
});

export const accentClasses = (color: string | null | undefined) => ACCENT_CLASSES[(color as Accent) ?? "teal"] ?? ACCENT_CLASSES.teal;
