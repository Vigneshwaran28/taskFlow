"use client";
// The patient's past visits and prescriptions in the portal (read-only). Each visit prints on its own as a
// prescription sheet with the clinic, the doctor and the patient.
import { useState } from "react";
import { FileText, Pill, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { cn } from "@/lib/cn";
import { formatDate, formatDay } from "@/lib/format";
import { usePortalVisits } from "../../hooks/usePatientPortal";
import type { PortalVisit, PortalVisits as PortalVisitsData } from "../../services/patientPortalService";
import { formatPatientNumber, genderLabel, routeLabel, vitalChips } from "../../utils/clinicMeta";

// Only the visit being printed goes on paper.
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  .portal-visit-print, .portal-visit-print * { visibility: visible !important; }
  .portal-visit-print { position: absolute; inset: 0 auto auto 0; width: 100%; border: 0 !important; box-shadow: none !important; }
}`;

export function PortalVisits() {
  const { data, isPending, error, refetch } = usePortalVisits();
  const [printing, setPrinting] = useState<number | null>(null);

  function print(visit: PortalVisit) {
    setPrinting(visit.id);
    // Let the print styles apply to this visit first.
    window.setTimeout(() => {
      window.print();
      setPrinting(null);
    }, 50);
  }

  if (isPending) return <LoadingState label="Loading your visits…" />;
  if (error) return <ErrorState message="Unable to load your visits." onRetry={() => void refetch()} />;
  if (!data.visits.length) return <EmptyState title="No visits yet" message="After you see a doctor, your visit and prescription appear here." icon={FileText} />;

  return (
    <>
      {printing !== null && <style>{PRINT_CSS}</style>}
      <ol className="flex flex-col gap-4">
        {data.visits.map(visit => (
          <li key={visit.id}>
            <VisitCard visit={visit} data={data} printing={printing === visit.id} onPrint={() => print(visit)} />
          </li>
        ))}
      </ol>
    </>
  );
}

function VisitCard({ visit, data, printing, onPrint }: { visit: PortalVisit; data: PortalVisitsData; printing: boolean; onPrint: () => void }) {
  const chips = vitalChips(visit.vitals, visit.bmi);
  return (
    <article aria-label={`Visit on ${formatDay(visit.visitDate)}`} className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm", printing && "portal-visit-print bg-white text-slate-900")}>
      {/* Print header: the clinic and the patient */}
      <div className="hidden border-b pb-3 print:block">
        <p className="text-lg font-semibold">{data.clinic.name}</p>
        <p className="text-xs">{[data.clinic.address, data.clinic.phone, data.clinic.email].filter(Boolean).join(" · ")}</p>
        <p className="mt-2 text-sm">
          {data.patient.name} · {[visit.age != null ? `${data.patient.ageEstimated ? "~" : ""}${visit.age} yrs` : null, genderLabel(data.patient.gender) || null, `Patient no. ${formatPatientNumber(data.patient.patientNumber)}`, data.patient.mrn].filter(Boolean).join(" · ")}
        </p>
        {data.patient.allergies && <p className="text-sm font-semibold">Allergies: {data.patient.allergies}</p>}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{formatDate(visit.visitDate)}</h3>
          {visit.provider && (
            <p className="text-sm text-muted-foreground">
              {visit.provider.name}
              {visit.provider.qualification ? `, ${visit.provider.qualification}` : ""}
              {visit.provider.specialty ? ` · ${visit.provider.specialty}` : ""}
              {visit.provider.registrationNo ? ` · Reg. ${visit.provider.registrationNo}` : ""}
            </p>
          )}
        </div>
        <Button size="sm" variant="secondary" onClick={onPrint} className="no-print print:hidden" aria-label={`Print the prescription of ${formatDay(visit.visitDate)}`}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print
        </Button>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {visit.chiefComplaint && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Complaint</dt>
            <dd>{visit.chiefComplaint}</dd>
          </div>
        )}
        {visit.diagnosis && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diagnosis</dt>
            <dd>{visit.diagnosis}</dd>
          </div>
        )}
        {visit.plan && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Advice</dt>
            <dd className="whitespace-pre-line">{visit.plan}</dd>
          </div>
        )}
        {visit.followUpOn && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Follow-up</dt>
            <dd>{formatDate(visit.followUpOn)}</dd>
          </div>
        )}
      </dl>
      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Vitals">
          {chips.map(chip => (
            <li key={chip.label} className="rounded-md border px-2 py-0.5 text-xs tabular-nums">
              {chip.label}
            </li>
          ))}
        </ul>
      )}

      <div>
        <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
          <Pill className="h-4 w-4" aria-hidden="true" />
          Prescription
        </h4>
        {visit.prescriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No medicines prescribed.</p>
        ) : (
          <ol className="divide-y rounded-xl border">
            {visit.prescriptions.map((item, index) => (
              <li key={item.id} className="px-3 py-2 text-sm">
                <p className="font-medium">
                  {index + 1}. {item.medicine}
                </p>
                <p className="text-muted-foreground">
                  {[item.dosage, item.frequency, item.duration, routeLabel(item.route) || null].filter(Boolean).join(" · ")}
                  {item.instructions ? ` — ${item.instructions}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </article>
  );
}
