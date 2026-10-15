"use client";
// "Record vitals": a nurse (clinic.vitals.record) or the patient's practitioner records vitals and the chief complaint
// for a checked-in patient before the consultation. The doctor sees them in the queue and their visit form starts
// from them. Saving never starts the consultation.
import { useId, useState, type FormEvent } from "react";
import { AlertTriangle, HeartPulse } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { controlClass } from "@/components/ui/FieldShell";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { useToast } from "@/components/shared/Toaster";
import { fieldErrorsOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { useSaveTriage } from "../hooks/useClinic";
import type { Appointment, Vitals } from "../services/clinicService";
import { ageGender, bmiCategory, bmiOf, VITALS, vitalFlag, type VitalKey } from "../utils/clinicMeta";
import { toastFormError } from "../utils/formErrors";
import { ClinicFormAlert } from "./ClinicBadges";

const num = (value: string) => (value.trim() === "" ? null : Number(value));

export function TriageDialog({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const toast = useToast();
  const formId = useId();
  const save = useSaveTriage();
  const existing = appointment.triage;
  const [vitals, setVitals] = useState<Record<VitalKey, string>>(
    () => Object.fromEntries(VITALS.map(meta => [meta.key, existing?.vitals?.[meta.key] != null ? String(existing.vitals[meta.key]) : ""])) as Record<VitalKey, string>
  );
  const [complaint, setComplaint] = useState(existing?.chiefComplaint ?? appointment.reason ?? "");
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const errors: Record<string, string | undefined> = { ...fieldErrorsOf(save.error), ...localErrors };
  const bmi = bmiOf(num(vitals.weightKg), num(vitals.heightCm));
  const bmiInfo = bmiCategory(bmi);
  const { patient } = appointment;

  function submit(event: FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};
    const values: Vitals = {};
    for (const meta of VITALS) {
      const value = num(vitals[meta.key]);
      if (value == null) continue;
      if (Number.isNaN(value) || vitalFlag(meta.key, value) === "invalid") found[`vital.${meta.key}`] = `${meta.label} must be between ${meta.min} and ${meta.max} ${meta.unit}.`;
      else values[meta.key] = value;
    }
    if ((values.bpSystolic == null) !== (values.bpDiastolic == null) && !found["vital.bpSystolic"] && !found["vital.bpDiastolic"]) found.vitals = "Enter both systolic and diastolic blood pressure.";
    else if (values.bpSystolic != null && values.bpDiastolic != null && values.bpDiastolic >= values.bpSystolic) found.vitals = "Diastolic pressure must be lower than systolic.";
    if (!Object.keys(values).length && !complaint.trim() && !Object.keys(found).length) found.vitals = "Enter at least one vital sign or the chief complaint.";
    if (complaint.trim().length > 500) found.chiefComplaint = "At most 500 characters.";
    setLocalErrors(found);
    if (Object.keys(found).length) return;
    save.mutate(
      { appointmentId: appointment.id, vitals: Object.keys(values).length ? values : null, chiefComplaint: complaint.trim() || null },
      {
        onSuccess: () => {
          toast.success("Vitals recorded", `${patient.name} · token ${appointment.token ?? "—"}`);
          onClose();
        },
        onError: error => toastFormError(toast, error),
      }
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={`Record vitals · ${patient.name}`}
      description={[appointment.token != null ? `Token ${appointment.token}` : null, patient.mrn, ageGender(patient.age, patient.gender, patient.ageEstimated), appointment.provider.name].filter(Boolean).join(" · ")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={save.isPending}>
            <HeartPulse className="h-4 w-4" aria-hidden="true" />
            Save vitals
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-5">
        <ClinicFormAlert error={save.error} shown={["vitals", "chiefComplaint"]} />
        {patient.allergies && (
          <p role="note" className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
            Allergies: {patient.allergies}
          </p>
        )}
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold">
            Vitals
            <span aria-live="polite" className="inline-flex items-center gap-2 font-normal">
              {bmi != null && (
                <>
                  <span className="tabular-nums">BMI {bmi}</span>
                  {bmiInfo && <Badge tone={bmiInfo.tone}>{bmiInfo.label}</Badge>}
                </>
              )}
            </span>
          </legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {VITALS.map(meta => {
              const value = num(vitals[meta.key]);
              const flag = vitalFlag(meta.key, value);
              const error = errors[`vital.${meta.key}`];
              const id = `${formId}-${meta.key}`;
              return (
                <div key={meta.key} className="flex flex-col gap-1">
                  <label htmlFor={id} className="text-xs font-medium">
                    {meta.label} <span className="text-muted-foreground">({meta.unit})</span>
                  </label>
                  <input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    step={meta.step}
                    min={meta.min}
                    max={meta.max}
                    value={vitals[meta.key]}
                    onChange={event => setVitals(current => ({ ...current, [meta.key]: event.target.value }))}
                    aria-invalid={Boolean(error) || flag === "invalid"}
                    aria-describedby={flag || error ? `${id}-flag` : undefined}
                    className={controlClass(error, cn("h-9 tabular-nums", flag === "abnormal" && "border-amber-400 dark:border-amber-500/60"))}
                  />
                  {(error || flag) && (
                    <p id={`${id}-flag`} className={cn("text-xs", error || flag === "invalid" ? "text-destructive" : "text-amber-700 dark:text-amber-300")}>
                      {error ?? (flag === "invalid" ? `Accepted ${meta.min}–${meta.max}` : `Outside typical ${meta.normal[0]}–${meta.normal[1]}`)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {errors.vitals && <p className="text-sm text-destructive">{errors.vitals}</p>}
        </fieldset>
        <TextAreaField label="Chief complaint" rows={2} maxLength={500} value={complaint} onChange={event => setComplaint(event.target.value)} error={errors.chiefComplaint} hint="What brings the patient in, in their words." />
      </form>
    </Dialog>
  );
}
