// CSV helpers for holidays: the export uses the same columns the import reads.
import type { Holiday } from "../services/attendanceService";

const cell = (value: string | null | undefined) => {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const holidaysToCsv = (holidays: Holiday[]) =>
  ["date,name,type,description", ...holidays.map(holiday => [holiday.date, holiday.name, holiday.type, holiday.description].map(cell).join(","))].join("\r\n");

/** Saves text as a .csv file (with a BOM so Excel reads UTF-8 names correctly). */
export function downloadCsv(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob(["﻿", text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
