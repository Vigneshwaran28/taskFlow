"use client";
// Printable prescription from the print bundle: clinic letterhead, practitioner, patient, diagnosis, ℞ table,
// follow-up and a signature line. Opens the browser's print dialog once the bundle has loaded.
import { useEffect, useRef } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { formatDate } from "@/lib/format";
import { usePrintBundle } from "../hooks/useClinic";
import { genderLabel, routeLabel, vitalChips } from "../utils/clinicMeta";

export function PrescriptionPrint({ patientId, visitId, onClose }: { patientId: number; visitId: number; onClose: () => void }) {
  const { data, isPending, error, refetch } = usePrintBundle(patientId, visitId);
  const printed = useRef(false);

  // Open the print dialog once, after the document has rendered (the print dialog is an external system).
  useEffect(() => {
    if (!data || printed.current) return;
    printed.current = true;
    const timer = window.setTimeout(() => window.print(), 100);
    return () => window.clearTimeout(timer);
  }, [data]);

  if (isPending) return <LoadingState label="Preparing the prescription…" className="no-print py-10" />;
  if (error)
    return (
      <div className="no-print">
        <ErrorState message="Unable to prepare the prescription." onRetry={() => void refetch()} />
      </div>
    );

  const { clinic, provider, patient } = data;
  const contact = [clinic.phone, clinic.email, clinic.website].filter(Boolean).join(" · ");
  const vitals = vitalChips(data.vitals, data.bmi);

  return (
    <section aria-label="Prescription preview" className="flex flex-col gap-3">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Print preview. Use your browser&apos;s print dialog to print or save as PDF.</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print
          </Button>
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
            Close preview
          </Button>
        </div>
      </div>

      <article className="print-area mx-auto w-full max-w-3xl rounded-xl border bg-white p-8 text-slate-900 shadow-sm print:max-w-none print:p-0">
        <header className="flex flex-col gap-1 border-b-2 border-slate-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{clinic.name}</h2>
            {clinic.address && <p className="whitespace-pre-line text-sm">{clinic.address}</p>}
            {contact && <p className="text-xs text-slate-600">{contact}</p>}
            {clinic.taxId && <p className="text-xs text-slate-600">Tax ID: {clinic.taxId}</p>}
          </div>
          {provider && (
            <div className="text-left sm:text-right">
              <p className="font-semibold">{provider.name}</p>
              {provider.qualification && <p className="text-sm">{provider.qualification}</p>}
              {provider.specialty && <p className="text-sm text-slate-600">{provider.specialty}</p>}
              {provider.registrationNo && <p className="text-xs text-slate-600">Reg. no. {provider.registrationNo}</p>}
            </div>
          )}
        </header>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 border-b py-3 text-sm sm:grid-cols-4">
          <div className="col-span-2">
            <dt className="text-xs uppercase text-slate-500">Patient</dt>
            <dd className="font-semibold">{patient.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Age / gender</dt>
            <dd>{[patient.age != null ? `${patient.age} y` : null, genderLabel(patient.gender) || null].filter(Boolean).join(" / ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Date</dt>
            <dd>{formatDate(data.date)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs uppercase text-slate-500">MRN</dt>
            <dd className="font-mono">{patient.mrn}</dd>
          </div>
          {patient.allergies && (
            <div className="col-span-2">
              <dt className="text-xs uppercase text-red-700">Allergies</dt>
              <dd className="font-semibold text-red-700">{patient.allergies}</dd>
            </div>
          )}
        </dl>

        <div className="flex flex-col gap-3 py-4 text-sm">
          {data.chiefComplaint && (
            <p>
              <span className="font-semibold">Complaint: </span>
              {data.chiefComplaint}
            </p>
          )}
          {vitals.length > 0 && (
            <p>
              <span className="font-semibold">Vitals: </span>
              {vitals.map(item => item.label).join(" · ")}
            </p>
          )}
          {data.diagnosis && (
            <p>
              <span className="font-semibold">Diagnosis: </span>
              {data.diagnosis}
            </p>
          )}
        </div>

        <div className="py-2">
          <p className="mb-2 font-serif text-3xl font-bold" aria-label="Prescription">
            ℞
          </p>
          {data.prescriptions.length === 0 ? (
            <p className="text-sm text-slate-600">No medicines prescribed.</p>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-400 text-xs uppercase text-slate-600">
                  <th scope="col" className="w-8 py-1.5 pr-2">
                    #
                  </th>
                  <th scope="col" className="py-1.5 pr-2">
                    Medicine
                  </th>
                  <th scope="col" className="py-1.5 pr-2">
                    Dosage
                  </th>
                  <th scope="col" className="py-1.5 pr-2">
                    Frequency
                  </th>
                  <th scope="col" className="py-1.5 pr-2">
                    Duration
                  </th>
                  <th scope="col" className="py-1.5 pr-2">
                    Route
                  </th>
                  <th scope="col" className="py-1.5">
                    Instructions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.prescriptions.map((item, index) => (
                  <tr key={item.id} className="border-b border-slate-200 align-top">
                    <td className="py-1.5 pr-2 tabular-nums">{index + 1}</td>
                    <td className="py-1.5 pr-2 font-semibold">{item.medicine}</td>
                    <td className="py-1.5 pr-2">{item.dosage ?? "—"}</td>
                    <td className="py-1.5 pr-2 font-mono">{item.frequency ?? "—"}</td>
                    <td className="py-1.5 pr-2">{item.duration ?? "—"}</td>
                    <td className="py-1.5 pr-2">{routeLabel(item.route) || "—"}</td>
                    <td className="py-1.5">{item.instructions ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data.followUpOn && (
          <p className="pt-4 text-sm">
            <span className="font-semibold">Follow-up: </span>
            {formatDate(data.followUpOn)}
          </p>
        )}

        <footer className="mt-16 flex items-end justify-between gap-6 text-sm">
          <p className="text-xs text-slate-500">Generated {formatDate(data.generatedAt)}</p>
          <div className="w-56 text-center">
            <div className="border-t border-slate-800 pt-1">{provider ? provider.name : "Signature"}</div>
            {provider?.registrationNo && <div className="text-xs text-slate-600">Reg. no. {provider.registrationNo}</div>}
          </div>
        </footer>
      </article>
    </section>
  );
}
