// Display metadata for task enums. Complete class names only (Tailwind cannot see runtime strings).
import type { Tone } from "@/components/ui/Badge";
import type { SelectOption } from "@/components/ui/SelectField";
import type { Task, TaskPriority, TaskRepeat, TaskStatus } from "../services/taskService";

export const PRIORITIES: Readonly<Record<TaskPriority, { label: string; tone: Tone; rank: number }>> = Object.freeze({
  urgent: { label: "Urgent", tone: "danger", rank: 0 },
  high: { label: "High", tone: "warning", rank: 1 },
  medium: { label: "Medium", tone: "info", rank: 2 },
  low: { label: "Low", tone: "neutral", rank: 3 },
});

export const STATUSES: Readonly<Record<TaskStatus, { label: string }>> = Object.freeze({
  todo: { label: "To do" },
  in_progress: { label: "In progress" },
  done: { label: "Done" },
});

export const REPEATS: Readonly<Record<TaskRepeat, { label: string }>> = Object.freeze({
  none: { label: "Does not repeat" },
  daily: { label: "Every day" },
  weekly: { label: "Every week" },
  monthly: { label: "Every month" },
});

/** Reminder presets relative to the due date, in minutes before. */
export const REMINDER_PRESETS: readonly SelectOption[] = Object.freeze([
  { value: "none", label: "No reminder" },
  { value: "0", label: "At due time" },
  { value: "10", label: "10 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
  { value: "custom", label: "Custom time…" },
]);

export const toOptions = (map: Readonly<Record<string, { label: string }>>): SelectOption[] => Object.entries(map).map(([value, meta]) => ({ value, label: meta.label }));

export const isOverdue = (task: Pick<Task, "status" | "dueAt">) => task.status !== "done" && Boolean(task.dueAt) && new Date(task.dueAt!) < new Date();

/** Priority choices for selects, most urgent first. */
export const PRIORITY_OPTIONS = toOptions(PRIORITIES);
