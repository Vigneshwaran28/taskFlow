"use client";
// /clinic/patients/[patientId]: demographics, safety banner, appointments and (with record access) the medical record.
// Reception issues portal access or resets the portal PIN here (the new PIN is shown once).
import Link from "@/components/navigation/Link";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AlertTriangle, CalendarPlus, Droplet, HeartPulse, KeyRound, Lock, Mail, Pencil, Phone, Power, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { useCurrentUser } from "@/features/auth";
import { ApiError } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/dates";
import { formatClock, formatDay } from "@/lib/format";
import { AppointmentDialog } from "../components/AppointmentDialog";
import { BookAppointmentDialog } from "../components/BookAppointmentDialog";
import { ProviderDot, StatusBadge, TypeBadge } from "../components/ClinicBadges";
import { PatientFormDialog } from "../components/PatientFormDialog";
import { PortalCredentialsDialog } from "../components/PortalCredentialsDialog";
import { PrescriptionPrint } from "../components/PrescriptionPrint";
import { VisitFormDialog, type VisitTarget } from "../components/VisitFormDialog";
import { VisitTimeline } from "../components/VisitTimeline";
import { useClinicAccess, useIssuePortalPin, usePatient, useSetPatientActive } from "../hooks/useClinic";
import type { Appointment, PatientDetail, PortalCredentials } from "../services/clinicService";
import { ageGender, formatPatientNumber } from "../utils/clinicMeta";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function AppointmentList({ title, items, empty, onOpen }: { title: string; items: Appointment[]; empty: string; onOpen: (id: number) => void }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">
        {title} <span className="font-normal text-muted-foreground">({items.length})</span>
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {items.map(item => (
            <li key={item.id}>
              <button type="button" onClick={() => onOpen(item.id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left text-sm hover:bg-muted/50 focus-visible:bg-muted focus-visible:outline-none">
                <span className="w-36 shrink-0 tabular-nums">
                  {formatDay(item.date)}, {formatClock(item.startTime)}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <ProviderDot color={item.provider.color} />
                  <span className="truncate">{item.provider.name}</span>
                </span>
                <TypeBadge type={item.type} />
                <StatusBadge status={item.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PatientPage() {
  const params = useParams<{ patientId: string }>();
  const patientId = Number(params.patientId) || null;
  const { data: patient, isPending, error, refetch } = usePatient(patientId);

  if (!patientId) return <EmptyState title="Patient not found" />;
  if (isPending) return <LoadingState label="Loading patient…" />;
  if (error || !patient) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <EmptyState
          title="Patient not found"
          message="The record doesn't exist or isn't shared with you."
          action={
            <Link href="/clinic?tab=patients" className="text-sm font-medium text-primary hover:underline">
              Back to patients
            </Link>
          }
        />
      );
    }
    return <ErrorState message="Unable to load the patient." onRetry={() => void refetch()} />;
  }
  return <PatientView patient={patient} />;
}

function PatientView({ patient }: { patient: PatientDetail }) {
  const toast = useToast();
  const access = useClinicAccess();
  const { data: user } = useCurrentUser();
  const setActive = useSetPatientActive();
  const issuePin = useIssuePortalPin();
  const [confirmPin, setConfirmPin] = useState(false);
  const [credentials, setCredentials] = useState<{ value: PortalCredentials; reason: "issued" | "reset" } | null>(null);
  const [editing, setEditing] = useState(false);
  const [booking, setBooking] = useState(false);
  const [confirmActive, setConfirmActive] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [visitTarget, setVisitTarget] = useState<VisitTarget | null>(null);
  const [printVisitId, setPrintVisitId] = useState<number | null>(null);

  const hasSafety = Boolean(patient.allergies || patient.chronicConditions);

  return (
    <div className="flex flex-col gap-6">
      {printVisitId !== null && <PrescriptionPrint key={printVisitId} patientId={patient.id} visitId={printVisitId} onClose={() => setPrintVisitId(null)} />}

      <div className={printVisitId !== null ? "no-print flex flex-col gap-6" : "flex flex-col gap-6"}>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
              {patient.name}
              {!patient.isActive && <Badge tone="neutral">Deactivated</Badge>}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="font-mono">{patient.mrn}</span>
              {patient.patientNumber && (
                <span>
                  Patient no. <span className="font-mono">{formatPatientNumber(patient.patientNumber)}</span>
                </span>
              )}
              {ageGender(patient.age, patient.gender, patient.dobEstimated) && <span>{ageGender(patient.age, patient.gender, patient.dobEstimated)}</span>}
              {patient.bloodGroup && (
                <span className="inline-flex items-center gap-1">
                  <Droplet className="h-3.5 w-3.5 text-red-600 dark:text-red-400" aria-hidden="true" />
                  <span className="sr-only">Blood group </span>
                  {patient.bloodGroup}
                </span>
              )}
              {patient.phone && (
                <a href={`tel:${patient.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  {patient.phone}
                </a>
              )}
              {patient.email && (
                <a href={`mailto:${patient.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  {patient.email}
                </a>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {access.manageAppointments && patient.isActive && (
              <Button onClick={() => setBooking(true)}>
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                Book
              </Button>
            )}
            {access.managePatients && (
              <>
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edit
                </Button>
                {patient.isActive && (
                  <Button variant="secondary" onClick={() => setConfirmPin(true)}>
                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                    {patient.hasPortalAccess ? "Reset portal PIN" : "Issue portal access"}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setConfirmActive(true)}>
                  <Power className="h-4 w-4" aria-hidden="true" />
                  {patient.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </>
            )}
          </div>
        </header>

        {hasSafety && (
          <div role="note" aria-label="Safety information" className="grid gap-3 sm:grid-cols-2">
            {patient.allergies && (
              <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide">Allergies</p>
                  <p className="whitespace-pre-line text-sm font-medium">{patient.allergies}</p>
                </div>
              </div>
            )}
            {patient.chronicConditions && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                <HeartPulse className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide">Chronic conditions</p>
                  <p className="whitespace-pre-line text-sm font-medium">{patient.chronicConditions}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <section aria-labelledby="patient-details-heading" className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 id="patient-details-heading" className="mb-4 font-semibold">
            Details
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Date of birth">{patient.dateOfBirth ? (patient.dobEstimated ? `Not known (about ${patient.age ?? "?"} years old)` : formatDay(patient.dateOfBirth)) : null}</Detail>
            <Detail label="Patient portal">
              {patient.hasPortalAccess
                ? `Access issued${patient.portalPinSetAt ? ` ${formatDay(patient.portalPinSetAt.slice(0, 10))}` : ""}${patient.portalLastLoginAt ? ` · last signed in ${formatDateTime(patient.portalLastLoginAt)}` : " · not signed in yet"}`
                : "Not issued"}
            </Detail>
            <Detail label="Address">{patient.address && <span className="whitespace-pre-line">{patient.address}</span>}</Detail>
            <Detail label="Emergency contact">{[patient.emergencyContactName, patient.emergencyContactPhone].filter(Boolean).join(" · ")}</Detail>
            <Detail label="Insurance">{[patient.insuranceProvider, patient.insuranceNumber].filter(Boolean).join(" · ")}</Detail>
            <Detail label="Registered">{formatDay(patient.createdAt.slice(0, 10))}</Detail>
            {patient.notes && (
              <div className="sm:col-span-2 lg:col-span-3">
                <Detail label="Notes">
                  <span className="whitespace-pre-line">{patient.notes}</span>
                </Detail>
              </div>
            )}
          </dl>
        </section>

        <section aria-labelledby="patient-appointments-heading" className="flex flex-col gap-4">
          <h2 id="patient-appointments-heading" className="font-semibold">
            Appointments
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <AppointmentList title="Upcoming" items={patient.upcomingAppointments} empty="Nothing booked." onOpen={setOpenId} />
            <AppointmentList title="Past" items={patient.pastAppointments} empty="No past appointments." onOpen={setOpenId} />
          </div>
        </section>

        <section aria-labelledby="patient-record-heading" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="patient-record-heading" className="flex items-center gap-2 font-semibold">
              <Stethoscope className="h-4 w-4" aria-hidden="true" />
              Medical record
            </h2>
            {patient.canViewRecord && access.practitioner && (
              <Button variant="secondary" onClick={() => setVisitTarget({ kind: "walkin", patient })}>
                <Stethoscope className="h-4 w-4" aria-hidden="true" />
                Add walk-in visit
              </Button>
            )}
          </div>
          {patient.canViewRecord && patient.record ? (
            <VisitTimeline visits={patient.record.visits} editorId={access.practitioner ? user?.id : null} onPrint={visit => setPrintVisitId(visit.id)} onEdit={visit => setVisitTarget({ kind: "edit", visit })} />
          ) : (
            <p className="flex items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
              Medical records are visible to the treating practitioner.
            </p>
          )}
        </section>
      </div>

      {editing && <PatientFormDialog patient={patient} onClose={() => setEditing(false)} />}
      {booking && <BookAppointmentDialog defaults={{ patient }} onClose={() => setBooking(false)} />}
      {openId !== null && <AppointmentDialog key={openId} appointmentId={openId} onClose={() => setOpenId(null)} />}
      {visitTarget && <VisitFormDialog target={visitTarget} onClose={() => setVisitTarget(null)} />}
      <ConfirmDialog
        open={confirmPin}
        title={patient.hasPortalAccess ? "Reset the portal PIN?" : "Issue portal access?"}
        message={
          patient.hasPortalAccess
            ? `${patient.name} gets a new 6-digit PIN, shown once. The old PIN stops working and they are signed out of the portal.`
            : `${patient.name} gets a patient number and a 6-digit PIN for the patient portal, shown once.`
        }
        confirmLabel={patient.hasPortalAccess ? "Reset PIN" : "Issue access"}
        tone="primary"
        pending={issuePin.isPending}
        onCancel={() => setConfirmPin(false)}
        onConfirm={() =>
          issuePin.mutate(patient.id, {
            onSuccess: result => {
              setConfirmPin(false);
              setCredentials({ value: { patientNumber: result.patientNumber, pin: result.pin, loginPath: result.loginPath }, reason: patient.hasPortalAccess ? "reset" : "issued" });
            },
            onError: err => toast.error("Couldn't issue portal access", err.message),
          })
        }
      />
      {credentials && <PortalCredentialsDialog patient={patient} credentials={credentials.value} reason={credentials.reason} onClose={() => setCredentials(null)} />}
      <ConfirmDialog
        open={confirmActive}
        title={patient.isActive ? "Deactivate patient?" : "Reactivate patient?"}
        message={patient.isActive ? `${patient.name} won't appear in searches by default and can't be booked. The record is kept.` : `${patient.name} can be booked again.`}
        confirmLabel={patient.isActive ? "Deactivate" : "Reactivate"}
        tone={patient.isActive ? "danger" : "primary"}
        pending={setActive.isPending}
        onCancel={() => setConfirmActive(false)}
        onConfirm={() =>
          setActive.mutate(
            { id: patient.id, active: !patient.isActive },
            {
              onSuccess: saved => {
                toast.success(saved.isActive ? "Patient reactivated" : "Patient deactivated");
                setConfirmActive(false);
              },
              onError: err => toast.error("Couldn't update the patient", err.message),
            }
          )
        }
      />
    </div>
  );
}
