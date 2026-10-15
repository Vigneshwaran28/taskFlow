"use client";
// One appointment: details plus the status actions the transition map and the person's permissions allow,
// rescheduling with the slot picker, and the practitioner's visit notes.
import Link from "@/components/navigation/Link";
import { useState } from "react";
import { CalendarClock, CheckCircle2, ClipboardPen, DoorOpen, ExternalLink, Play, UserCheck, UserX, XCircle } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { useCurrentUser } from "@/features/auth";
import { fieldErrorsOf } from "@/lib/apiClient";
import { formatClock, formatDay, formatTime } from "@/lib/format";
import { useAppointment, useClinicAccess, useProviders, useRescheduleAppointment, useSetAppointmentStatus } from "../hooks/useClinic";
import type { Appointment, AppointmentStatus } from "../services/clinicService";
import { canMove, isReschedulable } from "../utils/clinicMeta";
import { stampOf } from "../utils/time";
import { ClinicFormAlert, ProviderDot, StatusBadge, TypeBadge } from "./ClinicBadges";
import { SlotPicker } from "./SlotPicker";
import { VisitFormDialog } from "./VisitFormDialog";

type Mode = "details" | "cancel" | "reschedule" | "visit";

export function AppointmentDialog({ appointmentId, onClose }: { appointmentId: number; onClose: () => void }) {
  const { data: appointment, isPending, error, refetch } = useAppointment(appointmentId);
  const [mode, setMode] = useState<Mode>("details");

  if (mode === "visit" && appointment) return <VisitFormDialog target={{ kind: "appointment", appointment }} onClose={() => setMode("details")} />;

  return (
    <Dialog open onClose={onClose} title={appointment ? appointment.patient.name : "Appointment"} description={appointment ? `${appointment.patient.mrn}${appointment.patient.phone ? ` · ${appointment.patient.phone}` : ""}` : undefined} size="lg">
      {isPending ? (
        <LoadingState label="Loading appointment…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : (
        <AppointmentBody appointment={appointment} mode={mode} setMode={setMode} onClose={onClose} />
      )}
    </Dialog>
  );
}

function AppointmentBody({ appointment, mode, setMode, onClose }: { appointment: Appointment; mode: Mode; setMode: (mode: Mode) => void; onClose: () => void }) {
  const toast = useToast();
  const access = useClinicAccess();
  const { data: user } = useCurrentUser();
  const setStatus = useSetAppointmentStatus();
  const [cancelReason, setCancelReason] = useState("");

  const own = access.practitioner && appointment.provider.userId === user?.id;
  const clinical = own || access.records;
  const { status } = appointment;

  function move(next: AppointmentStatus, message: string) {
    setStatus.mutate(
      { id: appointment.id, status: next, cancelReason: next === "cancelled" ? cancelReason.trim() : undefined },
      {
        onSuccess: () => {
          toast.success(message);
          if (next === "cancelled") setMode("details");
        },
      }
    );
  }

  const deskActions: { to: AppointmentStatus; label: string; icon: typeof CheckCircle2; variant: "primary" | "secondary" | "danger"; message: string }[] = [
    { to: "confirmed", label: "Confirm", icon: CheckCircle2, variant: "secondary", message: "Appointment confirmed" },
    { to: "checked_in", label: "Check in", icon: UserCheck, variant: "primary", message: `${appointment.patient.name} checked in` },
    { to: "no_show", label: "No-show", icon: UserX, variant: "secondary", message: "Marked as no-show" },
  ];

  const details = (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-muted-foreground">When</dt>
        <dd className="font-medium">
          {formatDay(appointment.date)} · {formatClock(appointment.startTime)}–{formatClock(appointment.endTime)} <span className="text-muted-foreground">({appointment.durationMinutes} min)</span>
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Practitioner</dt>
        <dd className="flex items-center gap-2 font-medium">
          <ProviderDot color={appointment.provider.color} />
          {appointment.provider.name}
          {appointment.provider.room && <span className="font-normal text-muted-foreground">· {appointment.provider.room}</span>}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Status</dt>
        <dd className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          <TypeBadge type={appointment.type} />
        </dd>
      </div>
      {appointment.checkedInAt && (
        <div>
          <dt className="text-muted-foreground">Checked in</dt>
          <dd>{formatTime(appointment.checkedInAt)}</dd>
        </div>
      )}
      {appointment.reason && (
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Reason</dt>
          <dd>{appointment.reason}</dd>
        </div>
      )}
      {appointment.notes && (
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Notes</dt>
          <dd className="whitespace-pre-line">{appointment.notes}</dd>
        </div>
      )}
      {appointment.cancelReason && (
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Cancellation reason</dt>
          <dd>{appointment.cancelReason}</dd>
        </div>
      )}
      {appointment.createdBy && (
        <div className="sm:col-span-2 text-xs text-muted-foreground">
          Booked by {appointment.createdBy.name} · {formatDay(appointment.createdAt.slice(0, 10))}
        </div>
      )}
    </dl>
  );

  if (mode === "reschedule") return <RescheduleForm appointment={appointment} onDone={() => setMode("details")} />;

  return (
    <div className="flex flex-col gap-5">
      {details}
      <ClinicFormAlert error={setStatus.error} shown={mode === "cancel" ? ["cancelReason"] : []} />

      {mode === "cancel" ? (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 p-4">
          <TextField
            label="Reason for cancelling"
            required
            autoFocus
            value={cancelReason}
            onChange={event => setCancelReason(event.target.value)}
            maxLength={300}
            error={fieldErrorsOf(setStatus.error).cancelReason}
            placeholder="e.g. Patient called to cancel"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setMode("details")} disabled={setStatus.isPending}>
              Keep appointment
            </Button>
            <Button variant="danger" onClick={() => move("cancelled", "Appointment cancelled")} disabled={!cancelReason.trim()} loading={setStatus.isPending}>
              Cancel appointment
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 border-t pt-4">
          {own && (status === "checked_in" || status === "in_progress") && (
            <Button onClick={() => setMode("visit")}>
              {status === "checked_in" ? <Play className="h-4 w-4" aria-hidden="true" /> : <ClipboardPen className="h-4 w-4" aria-hidden="true" />}
              {status === "checked_in" ? "Start visit" : "Visit notes"}
            </Button>
          )}
          {!own && clinical && canMove(status, "in_progress") && (
            <Button variant="secondary" onClick={() => move("in_progress", "Consultation started")} loading={setStatus.isPending}>
              <Play className="h-4 w-4" aria-hidden="true" />
              Start
            </Button>
          )}
          {clinical && canMove(status, "completed") && (
            <Button variant={own ? "secondary" : "primary"} onClick={() => move("completed", "Appointment completed")} loading={setStatus.isPending}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Complete
            </Button>
          )}
          {own && status === "completed" && appointment.visitId && (
            <Button variant="secondary" onClick={() => setMode("visit")}>
              <ClipboardPen className="h-4 w-4" aria-hidden="true" />
              Edit visit notes
            </Button>
          )}
          {access.manageAppointments &&
            deskActions
              .filter(action => canMove(status, action.to))
              .map(action => (
                <Button key={action.to} variant={action.variant} onClick={() => move(action.to, action.message)} loading={setStatus.isPending && setStatus.variables?.status === action.to}>
                  <action.icon className="h-4 w-4" aria-hidden="true" />
                  {action.label}
                </Button>
              ))}
          {access.manageAppointments && isReschedulable(status) && (
            <Button variant="secondary" onClick={() => setMode("reschedule")}>
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Reschedule
            </Button>
          )}
          {access.manageAppointments && canMove(status, "cancelled") && (
            <Button variant="ghost" onClick={() => setMode("cancel")} className="text-destructive">
              <XCircle className="h-4 w-4" aria-hidden="true" />
              Cancel…
            </Button>
          )}
          <Link href={`/clinic/patients/${appointment.patient.id}`} onClick={onClose} className={buttonClass("ghost", "md", "ml-auto")}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Open patient
          </Link>
        </div>
      )}
      {status === "checked_in" && !own && !clinical && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <DoorOpen className="h-4 w-4" aria-hidden="true" />
          Waiting for {appointment.provider.name}.
        </p>
      )}
    </div>
  );
}

function RescheduleForm({ appointment, onDone }: { appointment: Appointment; onDone: () => void }) {
  const toast = useToast();
  const access = useClinicAccess();
  const { data: providers = [] } = useProviders();
  const reschedule = useRescheduleAppointment();
  const errors = fieldErrorsOf(reschedule.error);
  const [providerId, setProviderId] = useState(appointment.provider.userId);
  const [slot, setSlot] = useState<{ date: string; time: string | null }>({ date: appointment.date, time: null });
  const [force, setForce] = useState(false);

  function submit() {
    if (!slot.time) return;
    reschedule.mutate(
      { id: appointment.id, start: stampOf(slot.date, slot.time), providerId, force: force || undefined },
      {
        onSuccess: moved => {
          toast.success("Appointment rescheduled", `${formatDay(moved.date)} at ${formatClock(moved.startTime)} with ${moved.provider.name}`);
          onDone();
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Currently {formatDay(appointment.date)} at {formatClock(appointment.startTime)} with {appointment.provider.name} ({appointment.durationMinutes} min, kept when moving).
      </p>
      <ClinicFormAlert error={reschedule.error} shown={["start", "providerId"]} />
      <SelectField
        label="Practitioner"
        value={String(providerId)}
        onChange={event => {
          setProviderId(Number(event.target.value));
          setSlot(current => ({ ...current, time: null }));
        }}
        error={errors.providerId}
        options={providers.filter(item => item.isAccepting || item.userId === providerId || force).map(item => ({ value: String(item.userId), label: `${item.name} — ${item.specialty}` }))}
      />
      <SlotPicker providerId={providerId} date={slot.date} time={slot.time} onChange={setSlot} allowCustomTime={force} timeError={errors.start} />
      {access.manageAppointments && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={force} onChange={event => setForce(event.target.checked)} className="h-4 w-4 rounded border-input accent-primary" />
          <span className="font-medium">Book anyway</span>
          <span className="text-xs text-muted-foreground">(overrides clashes and hours)</span>
        </label>
      )}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="secondary" onClick={onDone} disabled={reschedule.isPending}>
          Back
        </Button>
        <Button onClick={submit} disabled={!slot.time} loading={reschedule.isPending}>
          {slot.time ? `Move to ${formatDay(slot.date)}, ${formatClock(slot.time)}` : "Pick a time"}
        </Button>
      </div>
    </div>
  );
}
