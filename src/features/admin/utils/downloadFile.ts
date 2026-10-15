/** Saves text as a file through a temporary object URL. */
export function downloadFile(filename: string, text: string, type = "text/csv;charset=utf-8") {
  // Leading BOM so Excel reads UTF-8 names correctly.
  const url = URL.createObjectURL(new Blob(["﻿", text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Saves a binary download (e.g. a ZIP) under `filename`. */
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Some browsers start reading the file only after the click returns.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
