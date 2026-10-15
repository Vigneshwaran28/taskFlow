"use client";
// The patient's portal card: patient number, PIN and where to sign in. The PIN is shown only here, once (right after
// registering, or after issuing / resetting portal access); the server keeps only a hash of it.
import { KeyRound, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useModuleSettings, useSiteTitle } from "@/features/auth";
import type { PortalCredentials } from "../services/clinicService";
import { formatPatientNumber } from "../utils/clinicMeta";

/** The full sign-in address for a login path, built on the client (the page's own origin). */
export function portalLoginUrl(loginPath: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${loginPath}`;
}

// Printing from a modal: only the card goes on paper (rendered only while the dialog is open).
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  .portal-card, .portal-card * { visibility: visible !important; }
  .portal-card { position: fixed; inset: 0 auto auto 0; width: 86mm; margin: 0; }
  dialog::backdrop { background: transparent !important; }
}`;

export interface PortalCredentialsDialogProps {
  patient: { name: string; mrn: string };
  credentials: PortalCredentials;
  /** "issued" after registering or first access, "reset" after a PIN reset */
  reason?: "issued" | "reset";
  onClose: () => void;
}

export function PortalCredentialsDialog({ patient, credentials, reason = "issued", onClose }: PortalCredentialsDialogProps) {
  const company = useModuleSettings("company");
  const siteTitle = useSiteTitle();
  const clinicName = company.legalName?.trim() || siteTitle;
  const url = portalLoginUrl(credentials.loginPath);

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={reason === "reset" ? "New portal PIN" : "Patient portal access"}
      description={`${patient.name} · ${patient.mrn}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print card
          </Button>
        </>
      }
    >
      <style>{PRINT_CSS}</style>
      <div className="flex flex-col gap-4">
        <p role="note" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Give the PIN to the patient now: it is shown only once. {reason === "reset" ? "Their old PIN no longer works." : "If they lose it, reset it from their record."}
          </span>
        </p>
        <article aria-label="Patient portal card" className="portal-card print-area mx-auto flex w-full max-w-xs flex-col gap-3 rounded-xl border bg-white p-5 text-slate-900">
          <div>
            <p className="text-sm font-semibold">{clinicName}</p>
            <p className="text-xs uppercase tracking-widest text-slate-500">Patient portal</p>
          </div>
          <p className="text-base font-semibold">{patient.name}</p>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs text-slate-500">Patient number</dt>
              <dd className="font-mono text-xl font-bold tabular-nums">{formatPatientNumber(credentials.patientNumber)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">PIN</dt>
              <dd className="font-mono text-xl font-bold tracking-widest tabular-nums">{credentials.pin}</dd>
            </div>
          </dl>
          <div className="border-t border-dashed pt-2">
            <p className="text-xs text-slate-600">Sign in to see your token, your turn, and your prescriptions:</p>
            <p className="break-all font-mono text-sm font-semibold">{url.replace(/^https?:\/\//, "")}</p>
          </div>
          <p className="text-[11px] text-slate-500">Keep your PIN private. Ask at reception if you forget it.</p>
        </article>
      </div>
    </Dialog>
  );
}
