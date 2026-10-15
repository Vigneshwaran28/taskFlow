// Generic CSV helpers: read a pasted or uploaded CSV, and save rows as a .csv file.

/** One CSV cell, quoted when it needs to be. */
export const csvCell = (value: string | number | null | undefined) => {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Rows of cells as CSV text (header first). */
export const toCsv = (rows: (string | number | null | undefined)[][]) => rows.map(row => row.map(csvCell).join(",")).join("\r\n");

/**
 * Parses CSV text into rows of trimmed cells (quoted fields, doubled quotes, commas and newlines inside quotes).
 * Also accepts semicolon- or tab-separated text, as spreadsheets in some locales export it. Blank lines are skipped.
 */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [",", ";", "\t"].reduce((best, candidate) => (firstLine.split(candidate).length > firstLine.split(best).length ? candidate : best), ",");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && !cell.trim()) {
      quoted = true;
      cell = "";
    } else if (char === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

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
