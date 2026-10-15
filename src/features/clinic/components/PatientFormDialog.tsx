"use client";
// Register or edit a patient. A possible duplicate (409 POSSIBLE_DUPLICATE) offers the existing record or
// "register anyway", which resends with confirmDuplicate. Without a date of birth, an age in years is saved as an
// estimate ("~N yrs"). A new registration ends on the patient's portal card (patient number + PIN, shown once).
import Link from "@/components/navigation/Link";
import { useState, type FormEvent } from "react";
import { UserRoundSearch } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { ApiError, fieldErrorsOf } from "@/lib/apiClient";
import { yearsSince } from "@/lib/dates";
import { localDay } from "@/lib/format";
import { useCreatePatient, useUpdatePatient } from "../hooks/useClinic";
import type { BloodGroup, DuplicatePatientError, Gender, Patient, PatientInput, PortalCredentials } from "../services/clinicService";
import { BLOOD_GROUPS, GENDER_OPTIONS } from "../utils/clinicMeta";
import { emailProblem, phoneProblem, toastFormError } from "../utils/formErrors";
import { ClinicFormAlert } from "./ClinicBadges";
import { PortalCredentialsDialog } from "./PortalCredentialsDialog";

type FormState = Record<keyof Required<PatientInput>, string>;

/** Fields that mirror the Patient record one to one (the age is derived). */
const FIELDS: Exclude<keyof FormState, "ageYears">[] = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "gender",
  "phone",
  "email",
  "address",
  "bloodGroup",
  "allergies",
  "chronicConditions",
  "emergencyContactName",
  "emergencyContactPhone",
  "insuranceProvider",
  "insuranceNumber",
  "notes",
];

const toForm = (patient?: Patient | null, initialName?: string): FormState => {
  const form = Object.fromEntries(FIELDS.map(key => [key, String(patient?.[key] ?? "")])) as FormState;
  form.ageYears = "";
  // An estimated date of birth is edited as the age it gives.
  if (patient?.dobEstimated) {
    form.dateOfBirth = "";
    form.ageYears = patient.age != null ? String(patient.age) : "";
  }
  if (!patient && initialName) {
    const [first, ...rest] = initialName.trim().split(/\s+/);
    form.firstName = first ?? "";
    form.lastName = rest.join(" ");
  }
  return form;
};

function toInput(form: FormState): PatientInput {
  const value = (key: keyof FormState) => form[key].trim() || null;
  return {
    firstName: form.firstName.trim(),
    lastName: value("lastName"),
    dateOfBirth: value("dateOfBirth"),
    ageYears: form.dateOfBirth.trim() || !form.ageYears.trim() ? null : Number(form.ageYears),
    gender: (value("gender") as Gender | null) ?? null,
    phone: value("phone"),
    email: value("email"),
    address: value("address"),
    bloodGroup: (value("bloodGroup") as BloodGroup | null) ?? null,
    allergies: value("allergies"),
    chronicConditions: value("chronicConditions"),
    emergencyContactName: value("emergencyContactName"),
    emergencyContactPhone: value("emergencyContactPhone"),
    insuranceProvider: value("insuranceProvider"),
    insuranceNumber: value("insuranceNumber"),
    notes: value("notes"),
  };
}

/** Client-side checks before anything is sent (the server repeats them). */
function validatePatient(form: FormState): Record<string, string> {
  const found: Record<string, string> = {};
  if (!form.firstName.trim()) found.firstName = "First name is required.";
  else if (form.firstName.trim().length > 80) found.firstName = "At most 80 characters.";
  const phone = phoneProblem(form.phone);
  if (phone) found.phone = phone;
  const emergencyPhone = phoneProblem(form.emergencyContactPhone);
  if (emergencyPhone) found.emergencyContactPhone = emergencyPhone;
  const email = emailProblem(form.email);
  if (email) found.email = email;
  if (form.dateOfBirth) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth)) found.dateOfBirth = "Use a date like 1990-04-12.";
    else if (form.dateOfBirth > localDay()) found.dateOfBirth = "The date of birth can't be in the future.";
    else if (form.dateOfBirth < "1900-01-01") found.dateOfBirth = "Check the year.";
  } else if (form.ageYears.trim()) {
    const years = Number(form.ageYears);
    if (!Number.isInteger(years)) found.ageYears = "Enter the age in whole years.";
    else if (years < 0 || years > 130) found.ageYears = "Enter an age between 0 and 130.";
  }
  return found;
}

function duplicateOf(error: unknown): Patient | null {
  if (!(error instanceof ApiError) || error.code !== "POSSIBLE_DUPLICATE") return null;
  const data = error.data as Partial<DuplicatePatientError> | undefined;
  return data?.patient ?? null;
}

export interface PatientFormDialogProps {
  patient?: Patient | null;
  /** Prefills the name when registering from a search */
  initialName?: string;
  onClose: () => void;
  /** After saving; for a new patient, once reception has closed the portal card (the PIN is shown only there) */
  onSaved?: (patient: Patient) => void;
  /** When set, the duplicate notice offers "Use this patient" (e.g. while booking) */
  onUseExisting?: (patient: Patient) => void;
}

export function PatientFormDialog({ patient, initialName, onClose, onSaved, onUseExisting }: PatientFormDialogProps) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() => toForm(patient, initialName));
  const create = useCreatePatient();
  const update = useUpdatePatient();
  const mutation = patient ? update : create;
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const errors: Record<string, string | undefined> = { ...fieldErrorsOf(mutation.error), ...localErrors };
  const duplicate = patient ? null : duplicateOf(create.error);
  const age = yearsSince(form.dateOfBirth);
  const [issued, setIssued] = useState<{ patient: Patient; credentials: PortalCredentials } | null>(null);

  const set = (key: keyof FormState) => (event: { target: { value: string } }) => {
    setForm(current => ({ ...current, [key]: event.target.value }));
    if (localErrors[key]) {
      setLocalErrors(current => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  };

  function save(confirmDuplicate = false) {
    const problems = validatePatient(form);
    setLocalErrors(problems);
    if (Object.keys(problems).length) return;
    const input = toInput(form);
    const onError = (error: unknown) => {
      if (!duplicateOf(error)) toastFormError(toast, error);
    };
    if (patient) {
      update.mutate(
        { id: patient.id, ...input },
        {
          onSuccess: saved => {
            toast.success("Patient updated");
            onSaved?.(saved);
            onClose();
          },
          onError,
        }
      );
      return;
    }
    create.mutate(
      { ...input, confirmDuplicate },
      {
        onSuccess: ({ portalCredentials, ...saved }) => {
          toast.success(`${saved.name} registered`, `MRN ${saved.mrn} · patient number ${portalCredentials.patientNumber}`);
          // The PIN is shown once: the card stays open until reception closes it, and only then does the caller move
          // on (e.g. open the new record), so nothing unmounts the card early.
          setIssued({ patient: saved, credentials: portalCredentials });
        },
        onError,
      }
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    save(false);
  }

  if (issued) {
    return (
      <PortalCredentialsDialog
        patient={issued.patient}
        credentials={issued.credentials}
        onClose={() => {
          onSaved?.(issued.patient);
          onClose();
        }}
      />
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={patient ? `Edit ${patient.name}` : "Register patient"}
      description={patient ? `MRN ${patient.mrn}` : "A medical record number, a patient number and a portal PIN are assigned automatically."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="clinic-patient-form" loading={mutation.isPending}>
            {patient ? "Save changes" : "Register"}
          </Button>
        </>
      }
    >
      <form id="clinic-patient-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {duplicate ? (
          <div role="alert" className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
            <p className="flex items-start gap-2">
              <UserRoundSearch className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Looks like <strong>{duplicate.name}</strong> ({duplicate.mrn}) is already registered — open their record, or register anyway.
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {onUseExisting ? (
                <Button
                  size="sm"
                  onClick={() => {
                    onUseExisting(duplicate);
                    onClose();
                  }}
                >
                  Use {duplicate.name}
                </Button>
              ) : (
                <Link href={`/clinic/patients/${duplicate.id}`} className={buttonClass("primary", "sm")} onClick={onClose}>
                  Open their record
                </Link>
              )}
              {onUseExisting && (
                <Link href={`/clinic/patients/${duplicate.id}`} className={buttonClass("secondary", "sm")} onClick={onClose}>
                  Open their record
                </Link>
              )}
              <Button size="sm" variant="secondary" loading={create.isPending} onClick={() => save(true)}>
                Register anyway
              </Button>
            </div>
          </div>
        ) : Object.keys(localErrors).length ? (
          <FormAlert message="Please fix the highlighted fields." />
        ) : (
          <ClinicFormAlert error={mutation.error} shown={[...FIELDS, "ageYears"]} />
        )}

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold">Personal details</legend>
          <TextField label="First name" required value={form.firstName} onChange={set("firstName")} error={errors.firstName} autoComplete="off" autoFocus />
          <TextField label="Last name" value={form.lastName} onChange={set("lastName")} error={errors.lastName} autoComplete="off" />
          <TextField
            label="Date of birth"
            type="date"
            max={localDay()}
            value={form.dateOfBirth}
            onChange={set("dateOfBirth")}
            error={errors.dateOfBirth}
            hint={age != null && age >= 0 ? `${age} years old` : "Leave empty if unknown and enter the age instead."}
          />
          <TextField
            label="Age (years)"
            type="number"
            inputMode="numeric"
            min={0}
            max={130}
            step={1}
            value={form.dateOfBirth ? (age != null && age >= 0 ? String(age) : "") : form.ageYears}
            onChange={set("ageYears")}
            disabled={Boolean(form.dateOfBirth)}
            error={errors.ageYears}
            hint={form.dateOfBirth ? "From the date of birth." : form.ageYears ? `Saved as an estimate (~${form.ageYears} yrs).` : "When the date of birth isn't known."}
          />
          <SelectField label="Gender" value={form.gender} onChange={set("gender")} error={errors.gender} options={[{ value: "", label: "Not recorded" }, ...GENDER_OPTIONS]} />
          <SelectField
            label="Blood group"
            value={form.bloodGroup}
            onChange={set("bloodGroup")}
            error={errors.bloodGroup}
            options={[{ value: "", label: "Unknown" }, ...BLOOD_GROUPS.map(group => ({ value: group, label: group }))]}
          />
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold">Contact</legend>
          <TextField label="Phone" type="tel" value={form.phone} onChange={set("phone")} error={errors.phone} autoComplete="off" />
          <TextField label="Email" type="email" value={form.email} onChange={set("email")} error={errors.email} autoComplete="off" />
          <TextAreaField label="Address" className="sm:col-span-2" rows={2} value={form.address} onChange={set("address")} error={errors.address} />
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold">Safety information</legend>
          <TextAreaField label="Allergies" rows={2} value={form.allergies} onChange={set("allergies")} error={errors.allergies} hint="Shown prominently to everyone who sees this patient." />
          <TextAreaField label="Chronic conditions" rows={2} value={form.chronicConditions} onChange={set("chronicConditions")} error={errors.chronicConditions} />
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold">Emergency contact and insurance</legend>
          <TextField label="Emergency contact name" value={form.emergencyContactName} onChange={set("emergencyContactName")} error={errors.emergencyContactName} />
          <TextField label="Emergency contact phone" type="tel" value={form.emergencyContactPhone} onChange={set("emergencyContactPhone")} error={errors.emergencyContactPhone} />
          <TextField label="Insurance provider" value={form.insuranceProvider} onChange={set("insuranceProvider")} error={errors.insuranceProvider} />
          <TextField label="Policy / member number" value={form.insuranceNumber} onChange={set("insuranceNumber")} error={errors.insuranceNumber} />
        </fieldset>

        <TextAreaField label="Notes" rows={3} value={form.notes} onChange={set("notes")} error={errors.notes} hint="Administrative notes (not clinical records)." />
      </form>
    </Dialog>
  );
}
