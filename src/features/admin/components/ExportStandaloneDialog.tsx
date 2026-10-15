"use client";
// "Export as standalone app": explains what the ZIP holds before downloading it, then shows the download's progress.
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Code2, Database, Download, KeyRound, Server, ShieldAlert } from "lucide-react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { formErrorOf } from "@/lib/apiClient";
import { useExportStandalone } from "../hooks/useAdmin";
import type { Tenant } from "../services/adminService";
import { downloadBlob } from "../utils/downloadFile";

const formatBytes = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export interface ExportStandaloneDialogProps {
  tenant: Tenant;
  onClose: () => void;
}

export function ExportStandaloneDialog({ tenant, onClose }: ExportStandaloneDialogProps) {
  const toast = useToast();
  const exportStandalone = useExportStandalone();
  const [received, setReceived] = useState(0);
  const [done, setDone] = useState<{ filename: string; size: number } | null>(null);
  const abort = useRef<AbortController | null>(null);

  // Closing the dialog cancels a running download.
  useEffect(() => () => abort.current?.abort(), []);

  function start() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setReceived(0);
    setDone(null);
    exportStandalone.mutate(
      { id: tenant.id, onProgress: setReceived, signal: controller.signal },
      {
        onSuccess: ({ blob, filename }) => {
          downloadBlob(filename, blob);
          setDone({ filename, size: blob.size });
          toast.success(`${tenant.name} exported`, `${filename} (${formatBytes(blob.size)}) is in your downloads.`);
        },
      }
    );
  }

  const pending = exportStandalone.isPending;
  const error = exportStandalone.error && !(exportStandalone.error instanceof DOMException && exportStandalone.error.name === "AbortError") ? exportStandalone.error : null;

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={`Export ${tenant.name} as a standalone app`}
      description="A ZIP the customer can host on their own server, with this workspace's data in it."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {done ? "Close" : "Cancel"}
          </Button>
          {!done && (
            <Button onClick={start} loading={pending}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {pending ? "Preparing…" : "Download ZIP"}
            </Button>
          )}
        </>
      }
    >
      <div className="flex min-w-0 flex-col gap-4 text-sm">
        <ul className="flex flex-col gap-3">
          <li className="flex gap-3">
            <Code2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="font-medium">The app.</span> <span className="text-muted-foreground">Server and web source of this version, start scripts, Docker files, and a step-by-step README.</span>
            </span>
          </li>
          <li className="flex gap-3">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="font-medium">All of {tenant.name}&apos;s data.</span>{" "}
              <span className="text-muted-foreground">Every record of its {tenant.users.total} user{tenant.users.total === 1 ? "" : "s"} and modules, including clinical records. Other tenants, the console log, and provider settings are left out.</span>
            </span>
          </li>
          <li className="flex gap-3">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="font-medium">People keep their passwords.</span> <span className="text-muted-foreground">The password hashes are included, so everyone signs in as before at /{tenant.slug}/login.</span>
            </span>
          </li>
          <li className="flex gap-3">
            <Server className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="font-medium">The customer hosts it.</span>{" "}
              <span className="text-muted-foreground">
                Their setup wizard picks SQLite or PostgreSQL and imports the data. It runs only this workspace, with its current modules fixed, no provider console, and no subscription end.
              </span>
            </span>
          </li>
        </ul>

        <p className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Treat the file like a database backup: share it only with the customer, over a secure channel. The export is recorded in the audit log.</span>
        </p>

        <FormAlert message={formErrorOf(error)} />

        <div aria-live="polite" className="min-h-5 text-muted-foreground">
          {pending && <span>{received ? `Downloading… ${formatBytes(received)} received` : "Collecting the data and packing the app…"}</span>}
          {done && (
            <span className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              Saved {done.filename} ({formatBytes(done.size)}).
            </span>
          )}
        </div>
      </div>
    </Dialog>
  );
}
