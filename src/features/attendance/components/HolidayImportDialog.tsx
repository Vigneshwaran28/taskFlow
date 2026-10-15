"use client";
import { useState, type ChangeEvent } from "react";
import { AlertTriangle, Download, FileUp } from "lucide-react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { fieldErrorsOf } from "@/lib/apiClient";
import { formatDay } from "@/lib/format";
import { useImportHolidays } from "../hooks/useAttendance";
import type { HolidayImportResult } from "../services/attendanceService";
import { HOLIDAY_TYPES } from "../utils/attendanceMeta";
import { downloadCsv } from "../utils/holidayCsv";

const MAX_FILE_BYTES = 200_000;

type ImportMode = "merge" | "replace";

function templateCsv() {
  const year = new Date().getFullYear();
  return [
    "date,name,type,description",
    `${year}-01-26,Republic Day,public,`,
    `${year}-08-15,Independence Day,public,`,
    `${year}-10-20,Diwali,public,Festival of lights`,
    `${year}-12-24,Christmas Eve,optional,Pick it if you celebrate`,
    `${year}-12-31,Year-end shutdown,company,`,
  ].join("\r\n");
}

/**
 * Feature component: upload a CSV of holidays, preview what will change, then import it.
 * Columns: date (YYYY-MM-DD or DD/MM/YYYY), name, type (public, company, optional), description.
 */
export function HolidayImportDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const importHolidays = useImportHolidays();
  const [file, setFile] = useState<{ name: string; csv: string } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [preview, setPreview] = useState<HolidayImportResult | null>(null);

  function runPreview(csv: string, nextMode: ImportMode) {
    setPreview(null);
    importHolidays.mutate({ csv, mode: nextMode, dryRun: true }, { onSuccess: setPreview });
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    setFileError(null);
    setPreview(null);
    importHolidays.reset();
    if (!chosen) return;
    if (chosen.size > MAX_FILE_BYTES) {
      setFile(null);
      setFileError("That file is larger than 200 KB. Split it into smaller files.");
      return;
    }
    const csv = await chosen.text();
    if (!csv.trim()) {
      setFile(null);
      setFileError("That file is empty. Choose a CSV with a date and name on each row.");
      return;
    }
    setFile({ name: chosen.name, csv });
    runPreview(csv, mode);
  }

  function changeMode(next: ImportMode) {
    setMode(next);
    if (file) runPreview(file.csv, next);
  }

  function handleImport() {
    if (!file) return;
    importHolidays.mutate(
      { csv: file.csv, mode, dryRun: false },
      {
        onSuccess: result => {
          const parts = [`${result.create} added`, `${result.update} updated`];
          if (result.remove) parts.push(`${result.remove} removed first`);
          if (result.errors.length) parts.push(`${result.errors.length} skipped`);
          toast.success("Holidays imported", parts.join(" · "));
          onClose();
        },
      }
    );
  }

  const changes = preview ? preview.create + preview.update : 0;
  // The dialog has no fields to highlight, so a field error (e.g. csv: "The file is too large.") is shown as the alert.
  const serverFieldErrors = fieldErrorsOf(importHolidays.error);
  const error = fileError ?? (serverFieldErrors.csv || serverFieldErrors.mode || importHolidays.error?.message);

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title="Import holidays"
      description="Upload a CSV file. You'll see what changes before anything is saved."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} loading={importHolidays.isPending && Boolean(preview)} disabled={!preview || !changes || importHolidays.isPending}>
            {preview && changes ? `Import ${changes} holiday${changes === 1 ? "" : "s"}` : "Import"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p>
            Columns: <code className="font-mono text-xs">date, name, type, description</code>. Dates as <span className="font-medium">2026-10-20</span> or{" "}
            <span className="font-medium">20/10/2026</span>. Type is <span className="font-medium">public</span>, <span className="font-medium">company</span>, or{" "}
            <span className="font-medium">optional</span> (empty means public; “restricted” and “floating” count as optional).
          </p>
          <Button variant="link" size="sm" className="mt-1 px-0" onClick={() => downloadCsv("holidays-template.csv", templateCsv())}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Download a template
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-medium hover:bg-muted has-focus-visible:ring-2 has-focus-visible:ring-ring">
            <FileUp className="h-4 w-4" aria-hidden="true" />
            {file ? "Choose another file" : "Choose CSV file"}
            <input type="file" accept=".csv,text/csv" onChange={event => void handleFile(event)} className="sr-only" />
          </label>
          {file && <span className="truncate text-sm text-muted-foreground">{file.name}</span>}
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">When a holiday already exists</legend>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-start gap-2">
              <input type="radio" name="import-mode" checked={mode === "merge"} onChange={() => changeMode("merge")} className="mt-0.5 accent-primary" />
              <span>
                <span className="font-medium">Merge</span> <span className="text-muted-foreground">: add new holidays, update matching ones (same date and name), keep the rest.</span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" name="import-mode" checked={mode === "replace"} onChange={() => changeMode("replace")} className="mt-0.5 accent-primary" />
              <span>
                <span className="font-medium">Replace</span> <span className="text-muted-foreground">: remove every holiday in the years this file covers, then add the file&apos;s holidays.</span>
              </span>
            </label>
          </div>
        </fieldset>

        <FormAlert message={error} />
        {importHolidays.isPending && !preview && <p className="text-sm text-muted-foreground">Checking the file…</p>}

        {preview && (
          <div className="flex flex-col gap-3" aria-live="polite">
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">{preview.create} new</Badge>
              <Badge tone="info">{preview.update} updated</Badge>
              {preview.remove > 0 && <Badge tone="danger">{preview.remove} removed first</Badge>}
              {preview.errors.length > 0 && <Badge tone="warning">{preview.errors.length} rows skipped</Badge>}
              {preview.years.length > 0 && <span className="text-xs text-muted-foreground">Years: {preview.years.join(", ")}</span>}
            </div>
            {preview.remove > 0 && (
              <p className="flex items-start gap-2 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Replace removes {preview.remove} existing holiday{preview.remove === 1 ? "" : "s"}, along with people&apos;s optional-holiday picks.
              </p>
            )}
            {preview.errors.length > 0 && (
              <div className="rounded-lg border border-warning/40 p-3">
                <p className="mb-1 text-sm font-medium">These rows will be skipped</p>
                <ul className="max-h-32 overflow-y-auto text-sm text-muted-foreground">
                  {preview.errors.map(item => (
                    <li key={item.line}>
                      Line {item.line}: {item.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {preview.preview.length > 0 && (
              <div className="max-h-64 overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.preview.map(item => (
                      <tr key={item.line}>
                        <td className="whitespace-nowrap px-3 py-1.5 tabular-nums">{formatDay(item.date)}</td>
                        <td className="px-3 py-1.5">{item.name}</td>
                        <td className="px-3 py-1.5">
                          <Badge tone={HOLIDAY_TYPES[item.type].tone}>{HOLIDAY_TYPES[item.type].short}</Badge>
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">{item.action === "update" ? "Update" : "Add"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {changes > preview.preview.length && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    Showing the first {preview.preview.length} of {changes}.
                  </p>
                )}
              </div>
            )}
            {!changes && <p className="text-sm text-muted-foreground">Nothing in this file can be imported.</p>}
          </div>
        )}
      </div>
    </Dialog>
  );
}
