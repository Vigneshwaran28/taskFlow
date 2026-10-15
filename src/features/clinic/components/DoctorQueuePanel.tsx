"use client";
// "My queue" for a practitioner: the patient being served (token, details, allergies, the nurse's vitals) and the
// primary "Complete & call next" button, which completes the current patient and calls the next token in one step.
// "Not here" moves a called patient who never came in to the back of the line. Recall / Skip / Start consultation /
// Visit notes / Complete and the plain Call next stay available, and the waiting list shows token numbers and waits.
import { useState } from "react";
import { BellRing, CheckCircle2, Clock, HeartPulse, Megaphone, Play, SkipForward, StepForward, Stethoscope, UserX, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { ApiError } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import { useCallNext, useCompleteAndNext, useProviders, useQueue, useRecallToken, useSetAppointmentStatus, useSkipToken } from "../hooks/useClinic";
import type { Appointment, NextResult, QueueEntry } from "../services/clinicService";
import { ageGender } from "../utils/clinicMeta";
import { StatusBadge } from "./ClinicBadges";
import { PatientSnapshot } from "./PatientSnapshot";
import { TriageDialog } from "./TriageDialog";
import { VisitFormDialog } from "./VisitFormDialog";

const waitingLabel = (minutes: number | null) => (minutes == null ? "" : minutes < 1 ? "just now" : minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`);

/** "Token 4 completed · Token 3 to the back of the line" */
function describeNext(result: NextResult) {
  const parts = [
    ...result.completed.map(item => `Token ${item.token} completed`),
    ...result.requeued.map(item => `${item.patient.name} moved to the back (token ${item.token})`),
    ...result.noShow.map(item => `Token ${item.token} marked no-show`),
  ];
  return parts.join(" · ");
}

export function DoctorQueuePanel() {
  const { data: providers, isPending: loadingProviders } = useProviders();
  const me = providers?.find(item => item.isMe) ?? null;
  if (loadingProviders) return <LoadingState label="Loading your queue…" />;
  if (!me) return <EmptyState title="Your practitioner profile isn't set up" message="Set up your profile in the Practitioners tab to get a token queue." icon={Stethoscope} />;
  return <MyQueue providerId={me.userId} />;
}

function MyQueue({ providerId }: { providerId: number }) {
  const toast = useToast();
  const { data, isPending, error, refetch } = useQueue({ providerId });
  const next = useCompleteAndNext();
  const callNext = useCallNext();
  const recall = useRecallToken();
  const skip = useSkipToken();
  const setStatus = useSetAppointmentStatus();
  const [visitFor, setVisitFor] = useState<Appointment | null>(null);
  const [vitalsFor, setVitalsFor] = useState<Appointment | null>(null);

  if (isPending) return <LoadingState label="Loading your queue…" />;
  if (error) return <ErrorState message="Unable to load your queue." onRetry={() => void refetch()} />;
  const queue = data.providers.find(item => item.provider.userId === providerId);
  if (!queue) return <EmptyState title="No queue today" message="Your practitioner profile is inactive." icon={Users} />;
  const current = queue.nowServing;
  const calledNotStarted = current?.status === "checked_in";
  const busy = next.isPending || callNext.isPending || recall.isPending || skip.isPending || setStatus.isPending;
  const nothingToDo = !current && queue.waiting.length === 0;

  const fail = (title: string) => (err: Error) => toast.error(err instanceof ApiError && err.code === "QUEUE_EMPTY" ? "Nobody is waiting" : title, err.message);
  const called = (appointment: Appointment) => toast.info(`Token ${appointment.token} called`, `${appointment.patient.name}${appointment.provider.room ? ` · ${appointment.provider.room}` : ""}`);

  function completeAndNext(missed: boolean) {
    next.mutate(
      { providerId, missed },
      {
        onSuccess: result => {
          const summary = describeNext(result);
          if (result.called) toast.info(`Token ${result.called.token} called`, [result.called.patient.name, summary].filter(Boolean).join(" · "));
          else toast.success(summary || "Done", "Nobody else is waiting.");
        },
        onError: fail("Couldn't move to the next patient"),
      }
    );
  }
  function start(appointment: Appointment) {
    setStatus.mutate({ id: appointment.id, status: "in_progress" }, { onSuccess: started => setVisitFor({ ...started, triage: appointment.triage }), onError: fail("Couldn't start the consultation") });
  }
  function complete(appointment: Appointment) {
    setStatus.mutate({ id: appointment.id, status: "completed" }, { onSuccess: () => toast.success(`Token ${appointment.token} completed`), onError: fail("Couldn't complete the visit") });
  }
  function skipToken(appointment: QueueEntry | Appointment) {
    skip.mutate(appointment.id, { onSuccess: moved => toast.info(`${moved.patient.name} moved to the end`, `New token ${moved.token}`), onError: fail("Couldn't skip the token") });
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="my-queue-now" className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-5">
            <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground sm:h-28 sm:w-28">
              <span className="text-xs uppercase tracking-wide opacity-80">Token</span>
              <span className="text-5xl font-black leading-none tabular-nums" aria-live="polite">
                {current?.token ?? "—"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="my-queue-now" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Now serving
              </h2>
              {current ? (
                <>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-2xl font-semibold">{current.patient.name}</span>
                    <StatusBadge status={current.status} />
                  </p>
                  {calledNotStarted && current.calledAt && (
                    <p className="text-sm text-muted-foreground">
                      Called {formatTime(current.calledAt)}
                      {current.callCount > 1 ? ` · ${current.callCount}×` : ""}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">{queue.waiting.length ? "Call the next token when you're ready." : "Nobody is waiting."}</p>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Waiting</dt>
              <dd className="text-xl font-semibold tabular-nums">{queue.waiting.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Done</dt>
              <dd className="text-xl font-semibold tabular-nums">{queue.done}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Avg consult</dt>
              <dd className="text-xl font-semibold tabular-nums">{queue.averageConsultMinutes == null ? "—" : `${Math.round(queue.averageConsultMinutes)}m`}</dd>
            </div>
          </dl>
        </div>

        {current && <PatientSnapshot appointment={current} className="mt-4 border-t pt-4" />}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => completeAndNext(false)} loading={next.isPending && !next.variables?.missed} disabled={busy || nothingToDo}>
            {current ? <StepForward className="h-4 w-4" aria-hidden="true" /> : <Megaphone className="h-4 w-4" aria-hidden="true" />}
            {current ? (queue.waiting.length ? "Complete & call next" : "Complete") : "Call next patient"}
          </Button>
          {calledNotStarted && current && (
            <>
              <Button variant="secondary" onClick={() => completeAndNext(true)} loading={next.isPending && next.variables?.missed} disabled={busy} title="The patient didn't come in: they go to the back of the line (a no-show after two missed calls)">
                <UserX className="h-4 w-4" aria-hidden="true" />
                Not here, call next
              </Button>
              <Button variant="secondary" onClick={() => recall.mutate(current.id, { onSuccess: called, onError: fail("Couldn't recall the token") })} loading={recall.isPending} disabled={busy}>
                <BellRing className="h-4 w-4" aria-hidden="true" />
                Recall
              </Button>
              <Button variant="secondary" onClick={() => skipToken(current)} loading={skip.isPending} disabled={busy}>
                <SkipForward className="h-4 w-4" aria-hidden="true" />
                Skip
              </Button>
              <Button variant="secondary" onClick={() => start(current)} loading={setStatus.isPending} disabled={busy}>
                <Play className="h-4 w-4" aria-hidden="true" />
                Start consultation
              </Button>
            </>
          )}
          {current?.status === "in_progress" && (
            <>
              <Button variant="secondary" onClick={() => setVisitFor(current)} disabled={busy}>
                <Stethoscope className="h-4 w-4" aria-hidden="true" />
                Visit notes &amp; prescription
              </Button>
              {queue.waiting.length > 0 && (
                <Button variant="ghost" onClick={() => complete(current)} loading={setStatus.isPending} disabled={busy}>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Complete only
                </Button>
              )}
            </>
          )}
          {current && (
            <Button variant="ghost" onClick={() => setVitalsFor(current)} disabled={busy}>
              <HeartPulse className="h-4 w-4" aria-hidden="true" />
              {current.triageRecorded ? "Update vitals" : "Record vitals"}
            </Button>
          )}
          {current && queue.waiting.length > 0 && (
            <Button variant="ghost" onClick={() => callNext.mutate(providerId, { onSuccess: called, onError: fail("Couldn't call the next token") })} loading={callNext.isPending} disabled={busy} title="Call the next token without completing the current patient">
              <Megaphone className="h-4 w-4" aria-hidden="true" />
              Call next only
            </Button>
          )}
        </div>
      </section>

      <section aria-labelledby="my-queue-waiting" className="flex flex-col gap-3">
        <h2 id="my-queue-waiting" className="flex items-center gap-2 font-semibold">
          <Users className="h-4 w-4" aria-hidden="true" />
          Waiting <span className="text-sm font-normal text-muted-foreground">({queue.waiting.length})</span>
        </h2>
        {queue.waiting.length === 0 ? (
          <EmptyState title="Nobody is waiting" message="Checked-in patients and walk-ins appear here in token order." icon={Clock} />
        ) : (
          <ol className="divide-y rounded-xl border bg-card">
            {queue.waiting.map(item => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className={cn("flex h-10 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold tabular-nums", item.calledAt ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" : "bg-muted")} aria-label={`Token ${item.token}`}>
                  {item.token}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.patient.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{[ageGender(item.patient.age, item.patient.gender, item.patient.ageEstimated), item.patient.mrn, item.reason].filter(Boolean).join(" · ")}</span>
                  {item.patient.allergies && <span className="block truncate text-xs font-medium text-red-700 dark:text-red-300">Allergies: {item.patient.allergies}</span>}
                </span>
                {item.triageRecorded && <Badge tone="info">Vitals taken</Badge>}
                {item.calledAt && <Badge tone="warning">Called</Badge>}
                <span className={cn("flex items-center gap-1 whitespace-nowrap text-sm tabular-nums", (item.waitingMinutes ?? 0) >= 30 ? "font-semibold text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    <span className="sr-only">Waiting </span>
                    {waitingLabel(item.waitingMinutes)}
                  </span>
                </span>
                <span className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => recall.mutate(item.id, { onSuccess: called, onError: fail("Couldn't call the token") })} disabled={busy} aria-label={`Call token ${item.token} (${item.patient.name})`}>
                    <Megaphone className="h-4 w-4" aria-hidden="true" />
                    Call
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => skipToken(item)} disabled={busy} aria-label={`Skip token ${item.token} (${item.patient.name}) to the end`}>
                    <SkipForward className="h-4 w-4" aria-hidden="true" />
                    Skip
                  </Button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {visitFor && <VisitFormDialog target={{ kind: "appointment", appointment: visitFor }} onClose={() => setVisitFor(null)} />}
      {vitalsFor && <TriageDialog key={vitalsFor.id} appointment={vitalsFor} onClose={() => setVitalsFor(null)} />}
    </div>
  );
}
