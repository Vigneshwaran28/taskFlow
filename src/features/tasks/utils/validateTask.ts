export interface TaskValidationValues {
  title: string;
  notes?: string | null;
  dueAt: string | null;
  remindAt: string | null;
  repeat: string;
  reminder: string;
}

export type TaskErrors = Partial<Record<"title" | "notes" | "dueAt" | "remindAt", string>>;

/** Mirrors the server's task schema (routes/tasks.js). */
export function validateTask(values: TaskValidationValues): TaskErrors {
  const errors: TaskErrors = {};
  if (!values.title.trim()) errors.title = "Title is required.";
  else if (values.title.trim().length > 200) errors.title = "Keep the title under 200 characters.";
  if ((values.notes?.length ?? 0) > 5000) errors.notes = "Notes are too long (5000 characters max).";
  if (values.repeat !== "none" && !values.dueAt) errors.dueAt = "Repeating tasks need a due date.";
  if (values.reminder !== "none" && values.reminder !== "custom" && !values.dueAt) {
    errors.remindAt = "Set a due date to use this reminder, or pick a custom time.";
  }
  if (values.reminder === "custom" && !values.remindAt) errors.remindAt = "Pick a reminder time.";
  else if (values.reminder === "custom" && values.remindAt && values.dueAt && new Date(values.remindAt) > new Date(values.dueAt)) {
    errors.remindAt = "The reminder should be at or before the due time.";
  }
  return errors;
}
