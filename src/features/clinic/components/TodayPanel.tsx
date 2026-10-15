"use client";
// Front desk / doctor dashboard: today's figures, the waiting room, "my next patient" and per-practitioner progress.
import { useState } from "react";
import { CalendarDays, CheckCircle2, Clock, Hourglass, Play, Plus, UserX, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useActionParam } from "@/lib/actionParam";
import { cn } from "@/lib/cn";
import { formatClock, formatDay } from "@/lib/format";
import { useClinicAccess, useClinicSummary } from "../hooks/useClinic";
import type { Appointment } from "../services/clinicService";
import { accentClasses } from "../utils/clinicMeta";
import { AppointmentDialog } from "./AppointmentDialog";
import { BookAppointmentDialog } from "./BookAppointmentDialog";
import { ProviderDot, StatusBadge, TypeBadge } from "./ClinicBadges";
import { VisitFormDialog } from "./VisitFormDialog";

const waitingLabel = (minutes: number) => (minutes < 1 ? "just now" : minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`);

export function TodayPanel() {
  const access = useClinicAccess();
  const { data, isPending, error, refetch } = useClinicSummary();
  const [openId, setOpenId] = useState<number | null>(null);
  const [visitFor, setVisitFor] = useState<Appointment | null>(null);
  const [booking, setBooking] = useState(false);
  useActionParam("book", () => setBooking(true), access.manageAppointments);

  if (isPending) return <LoadingState label="Loading today…" />;
  if (error) return <ErrorState message="Unable to load today's clinic." onRetry={() => void refetch()} />;

  const next = data.nextAppointment;
  const canStart = next && (next.status === "checked_in" || next.status === "in_progress");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {formatDay(data.date)} · updates every 30 seconds
        </p>
        {access.manageAppointments && (
          <Button onClick={() => setBooking(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Book appointment
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Appointments today" value={data.total} icon={CalendarDays} href="/clinic?tab=schedule" />
        <StatCard label="Waiting" value={data.byStatus.checked_in} icon={Hourglass} tone="warning" hint={data.byStatus.in_progress ? `${data.byStatus.in_progress} in consultation` : undefined} />
        <StatCard label="Completed" value={data.byStatus.completed} icon={CheckCircle2} tone="success" />
        <StatCard
          label="No-show rate"
          value={data.noShowRate == null ? "—" : `${data.noShowRate}%`}
          icon={UserX}
          tone="danger"
          hint={data.noShowWindow.considered ? `${data.noShowWindow.noShows} of ${data.noShowWindow.considered}, last 30 days` : "Last 30 days"}
        />
      </div>

      {access.practitioner && (
        <section aria-labelledby="clinic-next-heading" className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 id="clinic-next-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            My next patient
          </h2>
          {next ? (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{next.patient.name}</p>
                <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="tabular-nums">
                    {next.date === data.date ? "" : `${formatDay(next.date)}, `}
                    {formatClock(next.startTime)}
                  </span>
                  <StatusBadge status={next.status} />
                  <TypeBadge type={next.type} />
                  {next.reason && <span className="truncate">· {next.reason}</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setOpenId(next.id)}>
                  Details
                </Button>
                {canStart && (
                  <Button onClick={() => setVisitFor(next)}>
                    <Play className="h-4 w-4" aria-hidden="true" />
                    {next.status === "in_progress" ? "Continue" : "Start"}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No more appointments booked with you.</p>
          )}
          {next && !canStart && <p className="mt-2 text-xs text-muted-foreground">You can start once the front desk checks the patient in.</p>}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section aria-labelledby="clinic-waiting-heading" className="flex flex-col gap-3">
          <h2 id="clinic-waiting-heading" className="flex items-center gap-2 font-semibold">
            <Users className="h-4 w-4" aria-hidden="true" />
            Waiting room <span className="text-sm font-normal text-muted-foreground">({data.waitingRoom.length})</span>
          </h2>
          {data.waitingRoom.length === 0 ? (
            <EmptyState title="Nobody is waiting" message="Checked-in patients appear here in arrival order." icon={Hourglass} />
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {data.waitingRoom.map(item => (
                <li key={item.id}>
                  <button type="button" onClick={() => setOpenId(item.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 focus-visible:bg-muted focus-visible:outline-none">
                    <ProviderDot color={item.provider.color} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.patient.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {formatClock(item.startTime)} with {item.provider.name}
                        {item.provider.room ? ` · ${item.provider.room}` : ""}
                      </span>
                    </span>
                    <span className={cn("flex items-center gap-1 whitespace-nowrap text-sm tabular-nums", item.waitingMinutes >= 30 ? "font-semibold text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        <span className="sr-only">Waiting </span>
                        {waitingLabel(item.waitingMinutes)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="clinic-progress-heading" className="flex flex-col gap-3">
          <h2 id="clinic-progress-heading" className="font-semibold">
            Practitioners today
          </h2>
          {data.perProvider.length === 0 ? (
            <p className="text-sm text-muted-foreground">No practitioners set up yet.</p>
          ) : (
            <ul className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              {data.perProvider.map(item => {
                const percent = item.total ? Math.round((item.completed / item.total) * 100) : 0;
                return (
                  <li key={item.providerId} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <ProviderDot color={item.color} />
                        <span className="truncate font-medium">{item.name}</span>
                        {item.room && <span className="truncate text-xs text-muted-foreground">{item.room}</span>}
                      </span>
                      <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                        {item.completed}/{item.total} done · {item.remaining} left
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={`${item.name}: ${item.completed} of ${item.total} completed`}
                      aria-valuemin={0}
                      aria-valuemax={item.total || 1}
                      aria-valuenow={item.completed}
                      className="h-2 overflow-hidden rounded-full bg-muted"
                    >
                      <div className={cn("h-full rounded-full transition-[width]", accentClasses(item.color).dot)} style={{ width: `${percent}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {openId !== null && <AppointmentDialog key={openId} appointmentId={openId} onClose={() => setOpenId(null)} />}
      {visitFor && <VisitFormDialog target={{ kind: "appointment", appointment: visitFor }} onClose={() => setVisitFor(null)} />}
      {booking && <BookAppointmentDialog onClose={() => setBooking(false)} />}
    </div>
  );
}
