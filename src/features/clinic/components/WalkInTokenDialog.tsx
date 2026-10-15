"use client";
// "Issue walk-in token": pick (or quickly register) a patient, pick a doctor, give a reason. The server creates a
// checked-in appointment starting now with the doctor's next token; the slip is shown straight after.
import { useState, type FormEvent } from "react";
import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { useModuleSettings } from "@/features/auth";
import { fieldErrorsOf } from "@/lib/apiClient";
import type { AppointmentType } from "@/types/session";
import { useClinicAccess, useProviders, useWalkIn } from "../hooks/useClinic";
import type { Appointment } from "../services/clinicService";
import { typeLabel } from "../utils/clinicMeta";
import { toastFormError } from "../utils/formErrors";
import { ClinicFormAlert } from "./ClinicBadges";
import { PatientFormDialog } from "./PatientFormDialog";
import { PatientPicker, type PickedPatient } from "./PatientPicker";

const SHOWN = ["patientId", "providerId", "type", "reason"];

export function WalkInTokenDialog({ defaultProviderId, onClose, onIssued }: { defaultProviderId?: number | null; onClose: () => void; onIssued: (appointment: Appointment) => void }) {
  const toast = useToast();
  const access = useClinicAccess();
  const settings = useModuleSettings("clinic");
  const types: AppointmentType[] = settings.appointmentTypes?.length ? settings.appointmentTypes : ["consultation"];
  const { data: providers = [] } = useProviders();
  const walkIn = useWalkIn();

  const [patient, setPatient] = useState<PickedPatient | null>(null);
  const [providerId, setProviderId] = useState<number | null>(defaultProviderId ?? null);
  const [type, setType] = useState<AppointmentType>(types.includes("consultation") ? "consultation" : types[0]);
  const [reason, setReason] = useState("");
  const [registering, setRegistering] = useState<string | null>(null);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const errors: Record<string, string | undefined> = { ...fieldErrorsOf(walkIn.error), ...localErrors };

  const clear = (key: string) =>
    setLocalErrors(current => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });

  function validate() {
    const found: Record<string, string> = {};
    if (!patient) found.patientId = "Choose a patient, or register a new one.";
    if (!providerId) found.providerId = "Choose a doctor.";
    else if (!providers.some(item => item.userId === providerId && item.isActive)) found.providerId = "Choose a doctor who is set up in the clinic.";
    if (!types.includes(type)) found.type = "Pick an appointment type.";
    if (reason.trim().length > 300) found.reason = "At most 300 characters.";
    return found;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const found = validate();
    setLocalErrors(found);
    if (Object.keys(found).length || !patient || !providerId) return;
    walkIn.mutate(
      { patientId: patient.id, providerId, type, reason: reason.trim() || null },
      {
        onSuccess: appointment => {
          toast.success(`Token ${appointment.token} issued`, `${appointment.patient.name} · ${appointment.provider.name}${appointment.provider.room ? ` · ${appointment.provider.room}` : ""}`);
          onIssued(appointment);
        },
        onError: error => toastFormError(toast, error),
      }
    );
  }

  return (
    <>
      <Dialog
        open={registering === null}
        onClose={onClose}
        size="lg"
        title="Issue walk-in token"
        description="The patient joins the doctor's queue now and gets the next token."
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={walkIn.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="clinic-walkin-form" loading={walkIn.isPending}>
              <Ticket className="h-4 w-4" aria-hidden="true" />
              Issue token
            </Button>
          </>
        }
      >
        <form id="clinic-walkin-form" noValidate onSubmit={submit} className="flex flex-col gap-5">
          {Object.keys(localErrors).length ? <FormAlert message="Please fix the highlighted fields." /> : <ClinicFormAlert error={walkIn.error} shown={SHOWN} />}
          <PatientPicker
            value={patient}
            onChange={value => {
              setPatient(value);
              clear("patientId");
            }}
            onRegister={access.managePatients ? search => setRegistering(search) : undefined}
            error={errors.patientId}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Doctor"
              required
              value={providerId ? String(providerId) : ""}
              onChange={event => {
                setProviderId(event.target.value ? Number(event.target.value) : null);
                clear("providerId");
              }}
              error={errors.providerId}
              options={[
                { value: "", label: providers.length ? "Choose a doctor" : "No practitioners set up" },
                ...providers.map(item => ({ value: String(item.userId), label: `${item.name} — ${item.specialty}${item.room ? ` (${item.room})` : ""}` })),
              ]}
            />
            <SelectField label="Type" value={type} onChange={event => setType(event.target.value as AppointmentType)} error={errors.type} options={types.map(value => ({ value, label: typeLabel(value) }))} />
          </div>
          <TextField
            label="Reason"
            value={reason}
            onChange={event => {
              setReason(event.target.value);
              clear("reason");
            }}
            error={errors.reason}
            maxLength={300}
            placeholder="e.g. Fever since morning"
          />
        </form>
      </Dialog>
      {registering !== null && (
        <PatientFormDialog
          initialName={registering}
          onClose={() => setRegistering(null)}
          onSaved={saved => {
            setPatient(saved);
            clear("patientId");
          }}
          onUseExisting={setPatient}
        />
      )}
    </>
  );
}
