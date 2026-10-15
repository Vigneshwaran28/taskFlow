"use client";
// Home widget, role-aware: reception (schedule / appointments) sees today's figures and the waiting room;
// a practitioner sees their own day and their next patient. Quiet while loading.
import Link from "@/components/navigation/Link";
import { ArrowRight, Stethoscope } from "lucide-react";
import { useCan } from "@/features/auth";
import { formatClock, formatDay } from "@/lib/format";
import { useClinicSummary } from "../hooks/useClinic";
import { StatusBadge } from "./ClinicBadges";

const WAITING_SHOWN = 5;

export function ClinicOverview() {
  const { data } = useClinicSummary();
  const reception = useCan("clinic.schedule.view", "clinic.appointments.manage");
  const practitioner = useCan("clinic.practitioner");
  if (!data || (!reception && !practitioner)) return null;
  const next = data.nextAppointment;
  const figures = [
    { label: reception ? "Today" : "My patients today", value: data.total },
    { label: "With the doctor", value: data.byStatus.in_progress }, // waiting is counted in "Needs your attention"
    { label: "Completed", value: data.byStatus.completed },
  ];
  const waiting = reception ? data.waitingRoom.slice(0, WAITING_SHOWN) : [];

  return (
    <section aria-labelledby="clinic-overview-heading" className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 id="clinic-overview-heading" className="flex items-center gap-2 font-semibold">
          <Stethoscope className="h-4 w-4 text-primary" aria-hidden="true" />
          Clinic
        </h2>
        <Link href="/clinic" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Open
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {practitioner && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-accent/40 p-3 text-sm">
          {next ? (
            <>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Your next patient</p>
                <p className="truncate font-medium">
                  {next.token != null && <span className="mr-1 tabular-nums">#{next.token}</span>}
                  {next.patient.name}
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {next.date === data.date ? "" : `${formatDay(next.date)}, `}
                    {formatClock(next.startTime)}
                  </span>
                </p>
              </div>
              <StatusBadge status={next.status} />
            </>
          ) : (
            <p className="text-muted-foreground">No more patients booked with you.</p>
          )}
        </div>
      )}

      <dl className="grid grid-cols-3 gap-3 text-center">
        {figures.map(item => (
          <div key={item.label} className="rounded-lg bg-muted/60 px-2 py-3">
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="text-xl font-semibold tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>

      {reception && (
        <div className="flex flex-col gap-2 border-t pt-3">
          <h3 className="text-xs font-medium text-muted-foreground">Waiting room</h3>
          {waiting.length ? (
            <ul className="flex flex-col gap-1.5 text-sm">
              {waiting.map(item => (
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {item.token != null && <span className="mr-1.5 font-semibold tabular-nums">#{item.token}</span>}
                    {item.patient.name}
                    <span className="text-muted-foreground"> · {item.provider.name}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{item.waitingMinutes} min</span>
                </li>
              ))}
              {data.waitingRoom.length > WAITING_SHOWN && <li className="text-xs text-muted-foreground">and {data.waitingRoom.length - WAITING_SHOWN} more</li>}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nobody is waiting.</p>
          )}
        </div>
      )}
    </section>
  );
}
