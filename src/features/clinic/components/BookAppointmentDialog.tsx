"use client";
// Book an appointment: patient, practitioner, a free slot from /availability, duration, type, reason and notes.
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/shared/Toaster";
import { useModuleSettings } from "@/features/auth";
import { fieldErrorsOf } from "@/lib/apiClient";
import { formatClock, formatDay, localDay } from "@/lib/format";
import type { AppointmentType } from "@/types/session";
import { useBookAppointment, useClinicAccess, useProviders } from "../hooks/useClinic";
import type { Appointment } from "../services/clinicService";
import { typeLabel } from "../utils/clinicMeta";
import { stampOf } from "../utils/time";
import { ClinicFormAlert } from "./ClinicBadges";
import { PatientFormDialog } from "./PatientFormDialog";
import { PatientPicker, type PickedPatient } from "./PatientPicker";
import { SlotPicker } from "./SlotPicker";

export interface BookingDefaults {
  patient?: PickedPatient | null;
  providerId?: number | null;
  date?: string;
  time?: string | null;
}

const SHOWN = ["patientId", "providerId", "start", "durationMinutes", "type", "reason", "notes"];

export function BookAppointmentDialog({ defaults, onClose, onBooked }: { defaults?: BookingDefaults; onClose: () => void; onBooked?: (appointment: Appointment) => void }) {
  const toast = useToast();
  const access = useClinicAccess();
  const settings = useModuleSettings("clinic");
  const types: AppointmentType[] = settings.appointmentTypes?.length ? settings.appointmentTypes : ["consultation"];
  const { data: providers = [] } = useProviders();
  const book = useBookAppointment();
  const errors = fieldErrorsOf(book.error);

  const [patient, setPatient] = useState<PickedPatient | null>(defaults?.patient ?? null);
  const [providerId, setProviderId] = useState<number | null>(defaults?.providerId ?? null);
  const [slot, setSlot] = useState<{ date: string; time: string | null }>({ date: defaults?.date ?? localDay(), time: defaults?.time ?? null });
  const [duration, setDuration] = useState<string | null>(null); // null = the practitioner's slot length
  const [type, setType] = useState<AppointmentType>(types[0]);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [force, setForce] = useState(false);
  const [registering, setRegistering] = useState<string | null>(null);

  const provider = providers.find(item => item.userId === providerId) ?? null;
  const choices = providers.filter(item => item.isAccepting || item.userId === providerId || force);
  const durationValue = duration ?? (provider ? String(provider.slotMinutes) : String(settings.defaultSlotMinutes ?? 15));

  function submit() {
    if (!patient || !providerId || !slot.time) return;
    book.mutate(
      {
        patientId: patient.id,
        providerId,
        start: stampOf(slot.date, slot.time),
        durationMinutes: Number(durationValue) || undefined,
        type,
        reason: reason.trim() || null,
        notes: notes.trim() || null,
        force: force || undefined,
      },
      {
        onSuccess: appointment => {
          toast.success("Appointment booked", `${appointment.patient.name} · ${formatDay(appointment.date)} at ${formatClock(appointment.startTime)} with ${appointment.provider.name}`);
          onBooked?.(appointment);
          onClose();
        },
      }
    );
  }

  const missing = !patient ? "Choose a patient." : !providerId ? "Choose a practitioner." : !slot.time ? "Pick a time." : null;

  return (
    <>
      <Dialog
        open={registering === null}
        onClose={onClose}
        size="lg"
        title="Book appointment"
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={book.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} loading={book.isPending} disabled={Boolean(missing)} title={missing ?? undefined}>
              {slot.time ? `Book ${formatClock(slot.time)}` : "Book"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <ClinicFormAlert error={book.error} shown={SHOWN} />
          <PatientPicker value={patient} onChange={setPatient} onRegister={access.managePatients ? search => setRegistering(search) : undefined} error={errors.patientId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Practitioner"
              required
              value={providerId ? String(providerId) : ""}
              onChange={event => {
                setProviderId(event.target.value ? Number(event.target.value) : null);
                setSlot(current => ({ ...current, time: null }));
                setDuration(null);
              }}
              error={errors.providerId}
              options={[
                { value: "", label: choices.length ? "Choose a practitioner" : "No practitioners accepting appointments" },
                ...choices.map(item => ({ value: String(item.userId), label: `${item.name} — ${item.specialty}${item.isAccepting ? "" : " (not accepting)"}` })),
              ]}
            />
            <SelectField label="Type" value={type} onChange={event => setType(event.target.value as AppointmentType)} error={errors.type} options={types.map(value => ({ value, label: typeLabel(value) }))} />
          </div>

          <SlotPicker providerId={providerId} date={slot.date} time={slot.time} onChange={setSlot} allowCustomTime={force} timeError={errors.start} />

          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <TextField
              label="Duration (minutes)"
              type="number"
              min={5}
              max={480}
              step={5}
              value={durationValue}
              onChange={event => setDuration(event.target.value)}
              error={errors.durationMinutes}
              hint={provider ? `Default ${provider.slotMinutes} min` : undefined}
            />
            <TextField label="Reason for visit" value={reason} onChange={event => setReason(event.target.value)} error={errors.reason} maxLength={300} placeholder="e.g. Fever for 3 days" />
          </div>
          <TextAreaField label="Notes" rows={2} value={notes} onChange={event => setNotes(event.target.value)} error={errors.notes} maxLength={1000} />

          {access.manageAppointments && (
            <label className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-sm">
              <input type="checkbox" checked={force} onChange={event => setForce(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-input accent-primary" />
              <span>
                <span className="font-medium">Book anyway</span>
                <span className="block text-xs text-muted-foreground">Overrides clashes, holidays and the practitioner&apos;s hours. Past times and the booking window still apply.</span>
              </span>
            </label>
          )}
        </div>
      </Dialog>
      {registering !== null && <PatientFormDialog initialName={registering} onClose={() => setRegistering(null)} onSaved={setPatient} onUseExisting={setPatient} />}
    </>
  );
}
