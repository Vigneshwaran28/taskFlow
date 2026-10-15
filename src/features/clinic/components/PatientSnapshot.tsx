"use client";
// The patient in front of the doctor: who they are (age, gender, phone, blood group), safety information (allergies
// highlighted, chronic conditions), why they came, and the vitals a nurse recorded. Links to the full record.
import Link from "@/components/navigation/Link";
import { AlertTriangle, Droplet, ExternalLink, HeartPulse, Phone } from "lucide-react";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Appointment } from "../services/clinicService";
import { ageLabel, genderLabel, vitalChips } from "../utils/clinicMeta";

export function PatientSnapshot({ appointment, className }: { appointment: Appointment; className?: string }) {
  const { patient, triage } = appointment;
  const chips = vitalChips(triage?.vitals, triage?.bmi);
  const facts = [ageLabel(patient.age, patient.ageEstimated), genderLabel(patient.gender)].filter(Boolean);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {facts.length > 0 && <span className="font-medium">{facts.join(" · ")}</span>}
        {patient.ageEstimated && <span className="sr-only">(age estimated)</span>}
        {patient.bloodGroup && (
          <span className="inline-flex items-center gap-1">
            <Droplet className="h-3.5 w-3.5 text-red-600 dark:text-red-400" aria-hidden="true" />
            <span className="sr-only">Blood group </span>
            {patient.bloodGroup}
          </span>
        )}
        {patient.phone && (
          <a href={`tel:${patient.phone}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            {patient.phone}
          </a>
        )}
        <span className="font-mono text-xs text-muted-foreground">{patient.mrn}</span>
        <Link href={`/clinic/patients/${patient.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Patient record
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {(patient.allergies || patient.chronicConditions) && (
        <div role="note" aria-label="Safety information" className="grid gap-2 sm:grid-cols-2">
          {patient.allergies && (
            <p className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
              <span>
                <strong className="font-semibold uppercase tracking-wide">Allergies:</strong> {patient.allergies}
              </span>
            </p>
          )}
          {patient.chronicConditions && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <span>
                <strong className="font-semibold">Chronic:</strong> {patient.chronicConditions}
              </span>
            </p>
          )}
        </div>
      )}

      {(appointment.reason || triage?.chiefComplaint) && (
        <dl className="grid gap-1 text-sm sm:grid-cols-2">
          {appointment.reason && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reason</dt>
              <dd>{appointment.reason}</dd>
            </div>
          )}
          {triage?.chiefComplaint && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chief complaint</dt>
              <dd>{triage.chiefComplaint}</dd>
            </div>
          )}
        </dl>
      )}

      {triage && chips.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Vitals{" "}
            <span className="font-normal normal-case tracking-normal">
              {[triage.recordedBy?.name ? `by ${triage.recordedBy.name}` : null, formatTime(triage.recordedAt)].filter(Boolean).join(" · ")}
            </span>
          </p>
          <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="Vitals">
            {chips.map(chip => (
              <li
                key={chip.label}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-xs tabular-nums",
                  chip.flagged ? "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-100" : "bg-muted/40"
                )}
              >
                {chip.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!triage && appointment.triageRecorded && <p className="text-xs text-muted-foreground">Vitals were recorded by the nurse.</p>}
    </div>
  );
}
