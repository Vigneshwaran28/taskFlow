const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const BOOLEAN_COLUMNS = new Set([
  "reminder_sent",
  "is_read",
  "is_internal",
  "is_lead",
  "is_active",
  "is_accepting",
  "is_pinned",
]);

/** Turns a raw database value into display text. Null stays null so the table can style it. */
export function formatCell(column: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (BOOLEAN_COLUMNS.has(column) || typeof value === "boolean") return value === true || value === 1 || value === "1" ? "Yes" : "No";
  if (typeof value === "string" && ISO_DATETIME.test(value)) {
    return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** A row's primary key as a number (null when it has none). */
export function rowKey(row: Record<string, unknown>, key = "id"): number | null {
  const value = Number(row[key]);
  return Number.isInteger(value) && value > 0 ? value : null;
}
