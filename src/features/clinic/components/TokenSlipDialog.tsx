"use client";
// Printable token slip: big token number, doctor, room, date and time, patients ahead, and a short link the
// patient opens on their phone (/q/<code>) to follow the queue live, plus their patient number and the portal's
// sign-in address (/<workspace>/patient/login) for their tokens, alerts and prescriptions.
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useModuleSettings, useSiteTitle } from "@/features/auth";
import { formatDay, formatTime } from "@/lib/format";
import { useTenantSlug } from "@/lib/navigation";
import { useQueue } from "../hooks/useClinic";
import type { Appointment } from "../services/clinicService";
import { formatPatientNumber } from "../utils/clinicMeta";
import { portalLoginUrl } from "./PortalCredentialsDialog";

/** The patient's link for a public code. Built on the client (the page's own origin). */
export function tokenLink(code: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/q/${code}`;
}

// Printing from a modal: show only the slip on paper (rendered only while the slip is open).
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  .token-slip, .token-slip * { visibility: visible !important; }
  .token-slip { position: fixed; inset: 0 auto auto 0; width: 80mm; margin: 0; }
  dialog::backdrop { background: transparent !important; }
}`;

export function TokenSlipDialog({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const company = useModuleSettings("company");
  const siteTitle = useSiteTitle();
  const clinicName = company.legalName?.trim() || siteTitle;
  const { data } = useQueue({ date: appointment.tokenDate ?? undefined, providerId: appointment.provider.userId });
  const queue = data?.providers.find(item => item.provider.userId === appointment.provider.userId);
  const ahead = queue && appointment.token != null ? queue.waiting.filter(item => item.token != null && item.token < appointment.token! && !item.calledAt).length : null;
  const link = appointment.publicCode ? tokenLink(appointment.publicCode) : null;
  const slug = useTenantSlug();
  const portal = slug && appointment.patient.patientNumber ? portalLoginUrl(`/${slug}/patient/login`) : null;

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={`Token ${appointment.token ?? "—"}`}
      description={`${appointment.patient.name} · ${appointment.provider.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print slip
          </Button>
        </>
      }
    >
      <style>{PRINT_CSS}</style>
      <article aria-label="Token slip" className="token-slip print-area mx-auto flex w-full max-w-xs flex-col items-center gap-2 rounded-xl border border-dashed bg-white p-5 text-center text-slate-900">
        <p className="text-sm font-semibold">{clinicName}</p>
        <p className="text-xs uppercase tracking-widest text-slate-500">Your token</p>
        <p className="text-7xl font-black leading-none tabular-nums">{appointment.token ?? "—"}</p>
        <div className="mt-1 text-sm">
          <p className="font-semibold">{appointment.provider.name}</p>
          {appointment.provider.specialty && <p className="text-slate-600">{appointment.provider.specialty}</p>}
          {appointment.provider.room && <p className="text-base font-bold">{appointment.provider.room}</p>}
        </div>
        <p className="text-xs text-slate-600">
          {formatDay(appointment.tokenDate ?? appointment.date)}
          {appointment.checkedInAt ? ` · ${formatTime(appointment.checkedInAt)}` : ""}
        </p>
        <p className="text-sm">{ahead == null ? "Please wait to be called." : ahead === 0 ? "You're next in line." : `${ahead} ${ahead === 1 ? "patient" : "patients"} ahead of you`}</p>
        {link && (
          <div className="mt-2 w-full border-t border-dashed pt-2">
            <p className="text-xs text-slate-600">Follow your turn on your phone:</p>
            <p className="break-all font-mono text-sm font-semibold">{link.replace(/^https?:\/\//, "")}</p>
          </div>
        )}
        {portal && (
          <div className="w-full border-t border-dashed pt-2">
            <p className="text-xs text-slate-600">Patient portal (your PIN is on your patient card)</p>
            <p className="text-sm">
              Patient number <span className="font-mono font-bold tabular-nums">{formatPatientNumber(appointment.patient.patientNumber)}</span>
            </p>
            <p className="break-all font-mono text-xs font-semibold">{portal.replace(/^https?:\/\//, "")}</p>
          </div>
        )}
      </article>
    </Dialog>
  );
}
