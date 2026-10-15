"use client";
// The appointment book: one column per practitioner on a time axis taken from their schedules, with free slots
// to book and appointment blocks to open. Date and practitioner live in the URL. Small screens get a list.
import { useMemo, useState } from "react";
import { CalendarOff, ChevronLeft, ChevronRight, Plus, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { controlClass } from "@/components/ui/FieldShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { shiftDay } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { formatClock, formatDay, localDay } from "@/lib/format";
import { useSearchParamsState } from "@/lib/navigation";
import { useAppointments, useAvailabilities, useClinicAccess, useProviders } from "../hooks/useClinic";
import type { Appointment, Availability, Provider, Weekday } from "../services/clinicService";
import { accentClasses, holdsSlot, statusLabel, typeLabel } from "../utils/clinicMeta";
import { clockOf, minutesOf, weekdayOf } from "../utils/time";
import { AppointmentDialog } from "./AppointmentDialog";
import { BookAppointmentDialog, type BookingDefaults } from "./BookAppointmentDialog";
import { ProviderDot, StatusBadge, TypeBadge } from "./ClinicBadges";

const PX_PER_MIN = 1.6;
const isDay = (value: string | null): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));

interface Placed {
  appointment: Appointment;
  lane: number;
  lanes: number;
}

/** Side-by-side lanes for overlapping appointments in one column. */
function placeAppointments(items: Appointment[]): Placed[] {
  const sorted = [...items].sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end));
  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = "";
  let laneEnds: string[] = [];
  const flush = () => {
    const lanes = Math.max(1, laneEnds.length);
    cluster.forEach(item => (item.lanes = lanes));
    placed.push(...cluster);
    cluster = [];
    laneEnds = [];
  };
  for (const appointment of sorted) {
    if (cluster.length && appointment.start >= clusterEnd) flush();
    let lane = laneEnds.findIndex(end => end <= appointment.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(appointment.end);
    } else laneEnds[lane] = appointment.end;
    cluster.push({ appointment, lane, lanes: 1 });
    clusterEnd = cluster.length === 1 || appointment.end > clusterEnd ? appointment.end : clusterEnd;
  }
  if (cluster.length) flush();
  return placed;
}

export function SchedulePanel() {
  const access = useClinicAccess();
  const [params, setParams] = useSearchParamsState();
  const today = localDay();
  const date = isDay(params.get("date")) ? params.get("date")! : today;
  const providerParam = Number(params.get("provider")) || null;

  const providersQuery = useProviders();
  const allProviders = useMemo(() => providersQuery.data ?? [], [providersQuery.data]);
  const visibleProviders = useMemo(() => (access.seesSchedule ? allProviders : allProviders.filter(item => item.isMe)), [access.seesSchedule, allProviders]);
  const shown = providerParam ? visibleProviders.filter(item => item.userId === providerParam) : visibleProviders;

  const appointmentsQuery = useAppointments({ from: date, to: date, providerId: providerParam ?? undefined });
  const availability = useAvailabilities(
    shown.map(item => item.userId),
    date
  );
  const availabilityBy = new Map<number, Availability>();
  availability.forEach(query => {
    if (query.data) availabilityBy.set(query.data.providerId, query.data);
  });

  const [openId, setOpenId] = useState<number | null>(null);
  const [booking, setBooking] = useState<BookingDefaults | null>(null);

  const setParam = (key: string, value: string | null) =>
    setParams(current => {
      if (!value || (key === "date" && value === today)) current.delete(key);
      else current.set(key, value);
      return current;
    });

  const appointments = appointmentsQuery.data ?? [];
  const weekday = String(weekdayOf(date)) as Weekday;

  const toolbar = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border bg-card shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => setParam("date", shiftDay(date, -1))} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setParam("date", null)} disabled={date === today}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setParam("date", shiftDay(date, 1))} aria-label="Next day">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <label htmlFor="clinic-schedule-date" className="sr-only">
          Date
        </label>
        <input id="clinic-schedule-date" type="date" value={date} onChange={event => event.target.value && setParam("date", event.target.value)} className={controlClass(null, "h-9 w-auto")} />
        <h2 className="text-lg font-semibold" aria-live="polite">
          {formatDay(date)}
          {date === today && <span className="ml-2 text-sm font-normal text-muted-foreground">Today</span>}
        </h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {access.seesSchedule && visibleProviders.length > 1 && (
          <>
            <label htmlFor="clinic-schedule-provider" className="sr-only">
              Practitioner
            </label>
            <select id="clinic-schedule-provider" value={providerParam ?? ""} onChange={event => setParam("provider", event.target.value || null)} className={controlClass(null, "h-9 w-auto pr-8")}>
              <option value="">All practitioners</option>
              {visibleProviders.map(item => (
                <option key={item.userId} value={item.userId}>
                  {item.name}
                </option>
              ))}
            </select>
          </>
        )}
        {access.manageAppointments && (
          <Button onClick={() => setBooking({ date: date >= today ? date : today, providerId: providerParam })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Book
          </Button>
        )}
      </div>
    </div>
  );

  let body;
  if (providersQuery.isPending || appointmentsQuery.isPending) body = <LoadingState label="Loading the appointment book…" />;
  else if (providersQuery.error || appointmentsQuery.error)
    body = (
      <ErrorState
        message="Unable to load the appointment book."
        onRetry={() => {
          void providersQuery.refetch();
          void appointmentsQuery.refetch();
        }}
      />
    );
  else if (!shown.length) body = <EmptyState title="No practitioners yet" message="Add practitioners and their weekly hours in the Practitioners tab." icon={Stethoscope} />;
  else {
    const closedReasons = shown.map(item => availabilityBy.get(item.userId)?.closed ?? null);
    const allClosed = closedReasons.every(Boolean) && appointments.length === 0;
    body = (
      <>
        {allClosed && (
          <p className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
            <CalendarOff className="h-4 w-4" aria-hidden="true" />
            {new Set(closedReasons).size === 1 ? `Closed: ${closedReasons[0]}` : "No practitioner is working on this day."}
          </p>
        )}
        <div className="hidden md:block">
          <DayGrid providers={shown} weekday={weekday} appointments={appointments} availabilityBy={availabilityBy} canBook={access.manageAppointments} date={date} onOpen={setOpenId} onBook={setBooking} />
        </div>
        <div className="md:hidden">
          <DayList appointments={appointments} providers={shown} availabilityBy={availabilityBy} onOpen={setOpenId} />
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {toolbar}
      {body}
      {openId !== null && <AppointmentDialog key={openId} appointmentId={openId} onClose={() => setOpenId(null)} />}
      {booking && <BookAppointmentDialog defaults={booking} onClose={() => setBooking(null)} />}
    </div>
  );
}

interface DayGridProps {
  providers: Provider[];
  weekday: Weekday;
  appointments: Appointment[];
  availabilityBy: Map<number, Availability>;
  canBook: boolean;
  date: string;
  onOpen: (id: number) => void;
  onBook: (defaults: BookingDefaults) => void;
}

function DayGrid({ providers, weekday, appointments, availabilityBy, canBook, date, onOpen, onBook }: DayGridProps) {
  let first = Infinity;
  let last = -Infinity;
  for (const provider of providers) {
    for (const [start, end] of provider.schedule[weekday] ?? []) {
      first = Math.min(first, minutesOf(start));
      last = Math.max(last, minutesOf(end));
    }
  }
  for (const item of appointments) {
    first = Math.min(first, minutesOf(item.startTime));
    last = Math.max(last, minutesOf(item.endTime));
  }
  if (!Number.isFinite(first)) [first, last] = [9 * 60, 17 * 60];
  const axisStart = Math.floor(first / 60) * 60;
  const axisEnd = Math.min(24 * 60, Math.max(axisStart + 60, Math.ceil(last / 60) * 60));
  const height = (axisEnd - axisStart) * PX_PER_MIN;
  const hours: number[] = [];
  for (let minute = axisStart; minute <= axisEnd; minute += 60) hours.push(minute);
  const top = (minute: number) => (minute - axisStart) * PX_PER_MIN;

  return (
    // overflow-y-hidden + pb-2: the last hour label is centred on the bottom edge (-translate-y-1/2); without room for
    // it the wrapper grew a stray vertical scrollbar.
    <div className="overflow-x-auto overflow-y-hidden rounded-xl border bg-card">
      <div className="flex min-w-max pb-2">
        {/* Time axis */}
        <div className="sticky left-0 z-20 w-16 shrink-0 border-r bg-card">
          <div className="h-14 border-b" />
          <div className="relative" style={{ height }}>
            {hours.map(minute => (
              <span key={minute} className="absolute right-2 -translate-y-1/2 text-xs tabular-nums text-muted-foreground" style={{ top: top(minute) }}>
                {formatClock(clockOf(minute === 24 * 60 ? 23 * 60 + 59 : minute))}
              </span>
            ))}
          </div>
        </div>

        {providers.map(provider => {
          const color = accentClasses(provider.color);
          const ranges = provider.schedule[weekday] ?? [];
          const day = availabilityBy.get(provider.userId);
          const mine = appointments.filter(item => item.provider.userId === provider.userId);
          return (
            <div key={provider.userId} className="w-56 shrink-0 border-r last:border-r-0" role="group" aria-label={`${provider.name}, ${formatDay(date)}`}>
              <div className={cn("flex h-14 flex-col justify-center border-b border-t-4 px-3", color.header)}>
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                  <ProviderDot color={provider.color} />
                  {provider.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">{[provider.specialty, provider.room].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="relative bg-muted/40" style={{ height }}>
                {hours.map(minute => (
                  <div key={minute} aria-hidden="true" className="absolute inset-x-0 border-t border-dashed border-border" style={{ top: top(minute) }} />
                ))}
                {ranges.map(([start, end]) => (
                  <div key={start} aria-hidden="true" className="absolute inset-x-0 bg-card" style={{ top: top(minutesOf(start)), height: (minutesOf(end) - minutesOf(start)) * PX_PER_MIN }} />
                ))}
                {day?.closed && (
                  <div className="absolute inset-x-2 top-4 z-10 flex items-center gap-1.5 rounded-lg border border-dashed bg-card/90 px-2 py-1.5 text-xs text-muted-foreground">
                    <CalendarOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="first-letter:uppercase">{day.closed}</span>
                  </div>
                )}
                {canBook &&
                  day?.slots
                    .filter(slot => slot.available)
                    .map(slot => (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => onBook({ providerId: provider.userId, date, time: slot.start })}
                        aria-label={`${formatClock(slot.start)}, available — book with ${provider.name}`}
                        className="group absolute inset-x-1 z-0 flex items-center rounded-md px-2 text-xs text-transparent transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{ top: top(minutesOf(slot.start)) + 1, height: Math.max(12, (minutesOf(slot.end) - minutesOf(slot.start)) * PX_PER_MIN - 2) }}
                      >
                        <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
                        {formatClock(slot.start)}
                      </button>
                    ))}
                {placeAppointments(mine).map(({ appointment, lane, lanes }) => {
                  const start = minutesOf(appointment.startTime);
                  const blockHeight = Math.max(18, appointment.durationMinutes * PX_PER_MIN - 2);
                  const faded = !holdsSlot(appointment.status);
                  return (
                    <button
                      key={appointment.id}
                      type="button"
                      onClick={() => onOpen(appointment.id)}
                      aria-label={`${formatClock(appointment.startTime)}–${formatClock(appointment.endTime)}, ${appointment.patient.name}, ${typeLabel(appointment.type)}, ${statusLabel(appointment.status)}`}
                      className={cn(
                        "absolute z-10 overflow-hidden rounded-md border-l-4 px-2 py-1 text-left text-xs shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        color.block,
                        faded && "opacity-50 line-through",
                        appointment.status === "completed" && "opacity-75"
                      )}
                      style={{ top: top(start) + 1, height: blockHeight, left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}
                    >
                      <span className="block truncate font-semibold">{appointment.patient.name}</span>
                      {blockHeight > 30 && (
                        <span className="block truncate opacity-80">
                          {formatClock(appointment.startTime)} · {typeLabel(appointment.type)}
                        </span>
                      )}
                      {blockHeight > 46 && <span className="block truncate font-medium">{statusLabel(appointment.status)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayList({ appointments, providers, availabilityBy, onOpen }: { appointments: Appointment[]; providers: Provider[]; availabilityBy: Map<number, Availability>; onOpen: (id: number) => void }) {
  const groups = new Map<string, Appointment[]>();
  for (const item of [...appointments].sort((a, b) => a.start.localeCompare(b.start))) {
    groups.set(item.startTime, [...(groups.get(item.startTime) ?? []), item]);
  }
  const closed = providers.filter(item => availabilityBy.get(item.userId)?.closed);

  return (
    <div className="flex flex-col gap-4">
      {closed.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
          {closed.map(item => (
            <li key={item.userId} className="flex items-center gap-1.5">
              <ProviderDot color={item.color} />
              {item.name}: {availabilityBy.get(item.userId)?.closed}
            </li>
          ))}
        </ul>
      )}
      {groups.size === 0 ? (
        <EmptyState title="No appointments" message="Nothing booked for this day." />
      ) : (
        <ol className="flex flex-col gap-4">
          {[...groups.entries()].map(([time, items]) => (
            <li key={time}>
              <h3 className="mb-1.5 text-sm font-semibold tabular-nums text-muted-foreground">{formatClock(time)}</h3>
              <ul className="flex flex-col gap-2">
                {items.map(item => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(item.id)}
                      className={cn("w-full rounded-lg border-l-4 px-3 py-2 text-left text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", accentClasses(item.provider.color).block, !holdsSlot(item.status) && "opacity-60")}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">{item.patient.name}</span>
                        <StatusBadge status={item.status} />
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        {formatClock(item.startTime)}–{formatClock(item.endTime)} · {item.provider.name}
                        <TypeBadge type={item.type} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
