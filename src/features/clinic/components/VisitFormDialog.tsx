"use client";
// The practitioner's visit notes: complaint, vitals (live BMI, gentle range flags), examination, diagnosis,
// plan, follow-up and prescriptions. Used for an appointment (after check-in), a walk-in, or editing a visit.
// The patient's allergies stay in view while prescribing; vitals and the complaint a nurse recorded fill the form.
import { useId, useState } from "react";
import { AlertTriangle, HeartPulse, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { controlClass } from "@/components/ui/FieldShell";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { fieldErrorsOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { formatTime, localDay } from "@/lib/format";
import { useCreateWalkInVisit, useSaveAppointmentVisit, useSetAppointmentStatus, useUpdateVisit, useVisit } from "../hooks/useClinic";
import type { Appointment, PrescriptionInput, Triage, Visit, VisitInput, Vitals } from "../services/clinicService";
import { bmiCategory, bmiOf, MAX_PRESCRIPTIONS, ROUTE_OPTIONS, VITALS, vitalFlag, type VitalKey } from "../utils/clinicMeta";
import { toastFormError } from "../utils/formErrors";
import { ClinicFormAlert } from "./ClinicBadges";

export type VisitTarget =
  | { kind: "appointment"; appointment: Appointment }
  | { kind: "walkin"; patient: { id: number; name: string; mrn: string; allergies?: string | null; chronicConditions?: string | null } }
  | { kind: "edit"; visit: Visit };

interface Row extends Record<keyof PrescriptionInput, string> {
  key: number;
}

interface FormState {
  chiefComplaint: string;
  vitals: Record<VitalKey, string>;
  examination: string;
  diagnosis: string;
  plan: string;
  followUpOn: string;
  visitDate: string;
  rows: Row[];
}

let rowKey = 1;
const emptyRow = (): Row => ({ key: rowKey++, medicine: "", dosage: "", frequency: "", duration: "", route: "oral", instructions: "" });

/** The form from a saved visit; blanks are filled from the nurse's triage (vitals and complaint), if any. */
function toForm(visit: Visit | null | undefined, triage?: Triage | null): FormState {
  const recorded = visit?.vitals ?? triage?.vitals ?? null;
  const vitals = Object.fromEntries(VITALS.map(meta => [meta.key, recorded?.[meta.key] != null ? String(recorded[meta.key]) : ""])) as Record<VitalKey, string>;
  return {
    chiefComplaint: visit?.chiefComplaint ?? triage?.chiefComplaint ?? "",
    vitals,
    examination: visit?.examination ?? "",
    diagnosis: visit?.diagnosis ?? "",
    plan: visit?.plan ?? "",
    followUpOn: visit?.followUpOn ?? "",
    visitDate: visit?.visitDate ?? localDay(),
    rows: visit?.prescriptions.length
      ? visit.prescriptions.map(item => ({
          key: rowKey++,
          medicine: item.medicine,
          dosage: item.dosage ?? "",
          frequency: item.frequency ?? "",
          duration: item.duration ?? "",
          route: item.route ?? "",
          instructions: item.instructions ?? "",
        }))
      : [],
  };
}

const num = (value: string) => (value.trim() === "" ? null : Number(value));

/** Loads an existing visit (when the appointment already has notes) before showing the form. */
export function VisitFormDialog({ target, onClose }: { target: VisitTarget; onClose: () => void }) {
  const visitId = target.kind === "appointment" ? target.appointment.visitId : null;
  const { data: visit, isPending, error, refetch } = useVisit(visitId);
  const title = target.kind === "walkin" ? `Walk-in visit · ${target.patient.name}` : target.kind === "edit" ? `Edit visit · ${target.visit.patient.name}` : `Visit · ${target.appointment.patient.name}`;

  if (visitId && (isPending || error)) {
    return (
      <Dialog open onClose={onClose} title={title} size="xl">
        {error ? <ErrorState message="Unable to load the visit notes." onRetry={() => void refetch()} /> : <LoadingState label="Loading visit notes…" />}
      </Dialog>
    );
  }
  return <VisitForm key={visit?.id ?? "new"} target={target} initial={target.kind === "edit" ? target.visit : visit} title={title} onClose={onClose} />;
}

function VisitForm({ target, initial, title, onClose }: { target: VisitTarget; initial: Visit | null | undefined; title: string; onClose: () => void }) {
  const toast = useToast();
  const formId = useId();
  const triage = target.kind === "appointment" ? (target.appointment.triage ?? null) : null;
  const [form, setForm] = useState<FormState>(() => toForm(initial, triage));
  const fromTriage = Boolean(triage && (!initial?.vitals || !initial?.chiefComplaint));
  const safety =
    target.kind === "appointment"
      ? { allergies: target.appointment.patient.allergies, chronic: target.appointment.patient.chronicConditions }
      : target.kind === "walkin"
        ? { allergies: target.patient.allergies ?? null, chronic: target.patient.chronicConditions ?? null }
        : { allergies: null, chronic: null };
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const saveForAppointment = useSaveAppointmentVisit();
  const createWalkIn = useCreateWalkInVisit();
  const updateVisit = useUpdateVisit();
  const complete = useSetAppointmentStatus();
  const mutation = target.kind === "appointment" ? saveForAppointment : target.kind === "walkin" ? createWalkIn : updateVisit;
  const serverErrors = fieldErrorsOf(mutation.error);
  const errors = { ...serverErrors, ...localErrors };
  const pending = mutation.isPending || complete.isPending;

  const bmi = bmiOf(num(form.vitals.weightKg), num(form.vitals.heightCm));
  const bmiInfo = bmiCategory(bmi);
  const canComplete = target.kind === "appointment" && ["checked_in", "in_progress"].includes(target.appointment.status);

  const setField = (key: "chiefComplaint" | "examination" | "diagnosis" | "plan" | "followUpOn" | "visitDate") => (event: { target: { value: string } }) =>
    setForm(current => ({ ...current, [key]: event.target.value }));
  const setVital = (key: VitalKey, value: string) => setForm(current => ({ ...current, vitals: { ...current.vitals, [key]: value } }));
  const setRow = (key: number, field: keyof PrescriptionInput, value: string) => setForm(current => ({ ...current, rows: current.rows.map(row => (row.key === key ? { ...row, [field]: value } : row)) }));

  function validate(): { input: VisitInput } | { errors: Record<string, string> } {
    const found: Record<string, string> = {};
    const vitals: Vitals = {};
    for (const meta of VITALS) {
      const value = num(form.vitals[meta.key]);
      if (value == null) continue;
      if (Number.isNaN(value) || vitalFlag(meta.key, value) === "invalid") found[`vital.${meta.key}`] = `${meta.label} must be between ${meta.min} and ${meta.max} ${meta.unit}.`;
      else vitals[meta.key] = value;
    }
    const sys = vitals.bpSystolic;
    const dia = vitals.bpDiastolic;
    if ((sys == null) !== (dia == null) && !found["vital.bpSystolic"] && !found["vital.bpDiastolic"]) found.vitals = "Enter both systolic and diastolic blood pressure.";
    else if (sys != null && dia != null && dia >= sys) found.vitals = "Diastolic pressure must be lower than systolic.";

    const filled = form.rows.filter(row => Object.entries(row).some(([key, value]) => key !== "key" && key !== "route" && String(value).trim()));
    filled.forEach(row => {
      if (!row.medicine.trim()) found[`row.${row.key}`] = "Name the medicine.";
    });
    if (filled.length > MAX_PRESCRIPTIONS) found.prescriptions = `At most ${MAX_PRESCRIPTIONS} medicines per prescription.`;
    if (target.kind === "walkin") {
      // A walk-in visit has no appointment to explain it: it needs at least a complaint or a diagnosis.
      if (!form.chiefComplaint.trim() && !form.diagnosis.trim()) {
        found.chiefComplaint = "Enter a chief complaint or a diagnosis.";
        found.diagnosis = "Enter a diagnosis or a chief complaint.";
      }
      if (!form.visitDate) found.visitDate = "Pick the visit date.";
      else if (form.visitDate > localDay()) found.visitDate = "A visit can't be in the future.";
    }
    if (form.followUpOn && form.followUpOn < (target.kind === "walkin" ? form.visitDate : target.kind === "edit" ? target.visit.visitDate : target.appointment.date)) {
      found.followUpOn = "The follow-up can't be before the visit.";
    }
    if (Object.keys(found).length) return { errors: found };

    const text = (value: string) => value.trim() || null;
    return {
      input: {
        chiefComplaint: text(form.chiefComplaint),
        vitals: Object.keys(vitals).length ? vitals : null,
        examination: text(form.examination),
        diagnosis: text(form.diagnosis),
        plan: text(form.plan),
        followUpOn: form.followUpOn || null,
        prescriptions: filled.map(row => ({
          medicine: row.medicine.trim(),
          dosage: text(row.dosage),
          frequency: text(row.frequency),
          duration: text(row.duration),
          route: text(row.route),
          instructions: text(row.instructions),
        })),
      },
    };
  }

  function save(andComplete: boolean) {
    const result = validate();
    if ("errors" in result) {
      setLocalErrors(result.errors);
      return;
    }
    setLocalErrors({});
    const { input } = result;
    const done = (message: string) => {
      toast.success(message);
      onClose();
    };
    if (target.kind === "appointment") {
      saveForAppointment.mutate(
        { appointmentId: target.appointment.id, ...input },
        {
          onSuccess: () => {
            if (!andComplete) return done("Visit notes saved");
            complete.mutate({ id: target.appointment.id, status: "completed" }, { onSuccess: () => done("Visit saved and completed"), onError: err => toast.error("Saved, but couldn't complete the appointment", err.message) });
          },
        }
      );
    } else if (target.kind === "walkin") {
      createWalkIn.mutate({ patientId: target.patient.id, ...input, visitDate: form.visitDate || undefined }, { onSuccess: () => done("Walk-in visit saved"), onError: err => toastFormError(toast, err) });
    } else {
      updateVisit.mutate({ id: target.visit.id, ...input }, { onSuccess: () => done("Visit updated") });
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title={title}
      description={target.kind === "appointment" ? `${target.appointment.patient.mrn} · ${target.appointment.reason ?? "No reason given"}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant={canComplete ? "secondary" : "primary"} onClick={() => save(false)} loading={mutation.isPending && !complete.isPending}>
            Save
          </Button>
          {canComplete && (
            <Button onClick={() => save(true)} loading={complete.isPending}>
              Save &amp; complete
            </Button>
          )}
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={event => {
          event.preventDefault();
          save(false);
        }}
        className="flex flex-col gap-6"
      >
        <ClinicFormAlert error={mutation.error ?? complete.error} shown={["chiefComplaint", "examination", "diagnosis", "plan", "followUpOn", "visitDate", "vitals", "prescriptions"]} />
        {Object.keys(localErrors).length > 0 && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Please fix the highlighted fields.
          </p>
        )}

        {(safety.allergies || safety.chronic) && (
          <div role="note" aria-label="Safety information" className="flex flex-col gap-1 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
            {safety.allergies && (
              <p className="flex items-start gap-2 font-medium">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                <span>
                  <strong className="uppercase tracking-wide">Allergies:</strong> {safety.allergies}
                </span>
              </p>
            )}
            {safety.chronic && (
              <p className="pl-6">
                <strong>Chronic conditions:</strong> {safety.chronic}
              </p>
            )}
          </div>
        )}
        {fromTriage && triage && (
          <p className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
            <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Vitals and complaint from the nurse{triage.recordedBy?.name ? ` (${triage.recordedBy.name}, ${formatTime(triage.recordedAt)})` : ` (${formatTime(triage.recordedAt)})`}. Check them and correct anything before saving.
            </span>
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <TextAreaField label="Chief complaint" rows={2} value={form.chiefComplaint} onChange={setField("chiefComplaint")} error={errors.chiefComplaint} maxLength={500} autoFocus />
          {target.kind === "walkin" && <TextField label="Visit date" type="date" max={localDay()} value={form.visitDate} onChange={setField("visitDate")} error={errors.visitDate} />}
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold">
            Vitals
            <span aria-live="polite" className="inline-flex items-center gap-2 font-normal">
              {bmi != null ? (
                <>
                  <span className="tabular-nums">BMI {bmi}</span>
                  {bmiInfo && <Badge tone={bmiInfo.tone}>{bmiInfo.label}</Badge>}
                </>
              ) : (
                <span className="text-xs text-muted-foreground">BMI appears when weight and height are entered</span>
              )}
            </span>
          </legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {VITALS.map(meta => {
              const value = num(form.vitals[meta.key]);
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
                    value={form.vitals[meta.key]}
                    onChange={event => setVital(meta.key, event.target.value)}
                    aria-invalid={Boolean(error) || flag === "invalid"}
                    aria-describedby={flag || error ? `${id}-flag` : undefined}
                    className={controlClass(error, cn("h-9 tabular-nums", flag === "abnormal" && "border-amber-400 dark:border-amber-500/60"))}
                  />
                  {(error || flag) && (
                    <p id={`${id}-flag`} className={cn("flex items-center gap-1 text-xs", error || flag === "invalid" ? "text-destructive" : "text-amber-700 dark:text-amber-300")}>
                      {flag === "abnormal" && !error && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
                      {error ?? (flag === "invalid" ? `Accepted ${meta.min}–${meta.max}` : `Outside typical ${meta.normal[0]}–${meta.normal[1]}`)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {errors.vitals && <p className="text-sm text-destructive">{errors.vitals}</p>}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextAreaField label="Examination" rows={3} value={form.examination} onChange={setField("examination")} error={errors.examination} />
          <TextAreaField label="Diagnosis" rows={3} value={form.diagnosis} onChange={setField("diagnosis")} error={errors.diagnosis} maxLength={500} />
          <TextAreaField label="Plan" rows={3} value={form.plan} onChange={setField("plan")} error={errors.plan} className="sm:col-span-2" />
          <TextField label="Follow-up on" type="date" min={localDay()} value={form.followUpOn} onChange={setField("followUpOn")} error={errors.followUpOn} className="sm:w-48" />
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-semibold">
            Prescription <span className="font-normal text-muted-foreground">({form.rows.length}/{MAX_PRESCRIPTIONS})</span>
          </legend>
          {form.rows.length === 0 && <p className="text-sm text-muted-foreground">No medicines prescribed.</p>}
          <ol className="flex flex-col gap-3">
            {form.rows.map((row, index) => (
              <li key={row.key} className="rounded-lg border p-3">
                <div className="grid gap-2 sm:grid-cols-6">
                  <TextField
                    label={`Medicine ${index + 1}`}
                    className="sm:col-span-2"
                    value={row.medicine}
                    onChange={event => setRow(row.key, "medicine", event.target.value)}
                    error={errors[`row.${row.key}`]}
                    maxLength={160}
                    placeholder="e.g. Paracetamol 500 mg"
                  />
                  <TextField label="Dosage" value={row.dosage} onChange={event => setRow(row.key, "dosage", event.target.value)} maxLength={60} placeholder="1 tablet" />
                  <TextField label="Frequency" value={row.frequency} onChange={event => setRow(row.key, "frequency", event.target.value)} maxLength={60} placeholder="e.g. 1-0-1" />
                  <TextField label="Duration" value={row.duration} onChange={event => setRow(row.key, "duration", event.target.value)} maxLength={60} placeholder="5 days" />
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${formId}-route-${row.key}`} className="text-sm font-medium">
                      Route
                    </label>
                    <select id={`${formId}-route-${row.key}`} value={row.route} onChange={event => setRow(row.key, "route", event.target.value)} className={controlClass(null, "h-10")}>
                      <option value="">—</option>
                      {ROUTE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <TextField
                    label="Instructions"
                    className="sm:col-span-5"
                    value={row.instructions}
                    onChange={event => setRow(row.key, "instructions", event.target.value)}
                    maxLength={300}
                    placeholder="e.g. After food"
                  />
                  <div className="flex items-end">
                    <Button variant="ghost" onClick={() => setForm(current => ({ ...current, rows: current.rows.filter(item => item.key !== row.key) }))} aria-label={`Remove medicine ${index + 1}${row.medicine ? ` (${row.medicine})` : ""}`}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div>
            <Button variant="secondary" size="sm" onClick={() => setForm(current => ({ ...current, rows: [...current.rows, emptyRow()] }))} disabled={form.rows.length >= MAX_PRESCRIPTIONS}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add medicine
            </Button>
          </div>
          {errors.prescriptions && <p className="text-sm text-destructive">{errors.prescriptions}</p>}
        </fieldset>
      </form>
    </Dialog>
  );
}
