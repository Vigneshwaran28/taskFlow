"use client";
// Reception: check in today's booked patients (each gets a token), issue walk-in tokens, watch every doctor's
// queue live, and print token slips. Opens the waiting-room display board in a new tab.
import Link from "@/components/navigation/Link";
import { useMemo, useState } from "react";
import { ExternalLink, Hourglass, MonitorPlay, Search, Ticket, UserCheck } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/Button";
import { controlClass } from "@/components/ui/FieldShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { ApiError } from "@/lib/apiClient";
import { formatClock, formatDay } from "@/lib/format";
import { useAppointments, useClinicAccess, useQueue, useSetAppointmentStatus } from "../hooks/useClinic";
import type { Appointment, ProviderQueue } from "../services/clinicService";
import { toastFormError } from "../utils/formErrors";
import { ProviderDot, StatusBadge } from "./ClinicBadges";
import { TokenSlipDialog } from "./TokenSlipDialog";
import { WalkInTokenDialog } from "./WalkInTokenDialog";

const matches = (appointment: Appointment, term: string) => {
  if (!term) return true;
  const needle = term.toLowerCase();
  const digits = term.replace(/\D/g, "");
  return (
    appointment.patient.name.toLowerCase().includes(needle) ||
    appointment.patient.mrn.toLowerCase().includes(needle) ||
    appointment.provider.name.toLowerCase().includes(needle) ||
    (digits.length >= 3 && (appointment.patient.phone ?? "").replace(/\D/g, "").includes(digits))
  );
};

export function ReceptionPanel() {
  const toast = useToast();
  const access = useClinicAccess();
  const [search, setSearch] = useState("");
  const [walkIn, setWalkIn] = useState(false);
  const [slip, setSlip] = useState<Appointment | null>(null);
  const booked = useAppointments({ status: "scheduled,confirmed" });
  const queue = useQueue();
  const checkIn = useSetAppointmentStatus();
  const [checkingId, setCheckingId] = useState<number | null>(null);

  const toCheckIn = useMemo(() => (booked.data ?? []).filter(item => matches(item, search.trim())), [booked.data, search]);

  function checkInPatient(appointment: Appointment) {
    setCheckingId(appointment.id);
    checkIn.mutate(
      { id: appointment.id, status: "checked_in" },
      {
        onSuccess: updated => {
          toast.success(`${updated.patient.name} checked in`, `Token ${updated.token} · ${updated.provider.name}`);
          setSlip(updated);
        },
        onError: error => {
          if (error instanceof ApiError && (error.status === 409 || error.status === 422)) toastFormError(toast, error);
          else toast.error("Couldn't check in", error.message);
        },
        onSettled: () => setCheckingId(null),
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{queue.data ? formatDay(queue.data.date) : ""} · queues update live</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/clinic-display" target="_blank" rel="noopener" className={buttonClass("secondary")}>
            <MonitorPlay className="h-4 w-4" aria-hidden="true" />
            Display board
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </Link>
          {access.manageAppointments && (
            <Button onClick={() => setWalkIn(true)}>
              <Ticket className="h-4 w-4" aria-hidden="true" />
              Issue walk-in token
            </Button>
          )}
        </div>
      </div>

      <section aria-labelledby="reception-queues-heading" className="flex flex-col gap-3">
        <h2 id="reception-queues-heading" className="font-semibold">
          Live queues
        </h2>
        {queue.isPending ? (
          <LoadingState label="Loading queues…" />
        ) : queue.error ? (
          <ErrorState message="Unable to load the queues." onRetry={() => void queue.refetch()} />
        ) : queue.data.providers.length === 0 ? (
          <EmptyState title="No practitioners set up" message="Set up practitioners in the Practitioners tab to start queues." />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {queue.data.providers.map(item => (
              <QueueCard key={item.provider.userId} queue={item} onSlip={setSlip} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="reception-checkin-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="reception-checkin-heading" className="flex items-center gap-2 font-semibold">
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            Check in today&apos;s patients <span className="text-sm font-normal text-muted-foreground">({booked.data?.length ?? 0} booked)</span>
          </h2>
          <div className="relative w-full sm:w-72">
            <label htmlFor="reception-search" className="sr-only">
              Search booked patients
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input id="reception-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, MRN, phone or doctor" className={controlClass(null, "h-10 pl-9")} />
          </div>
        </div>
        {booked.isPending ? (
          <LoadingState label="Loading today's appointments…" />
        ) : booked.error ? (
          <ErrorState message="Unable to load today's appointments." onRetry={() => void booked.refetch()} />
        ) : toCheckIn.length === 0 ? (
          <EmptyState title={search ? "No booked patients match" : "Everyone booked today is checked in"} message={search ? "Try another name, MRN or phone number." : "Walk-ins can get a token with “Issue walk-in token”."} icon={Hourglass} />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {toCheckIn.map(item => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="w-16 shrink-0 text-sm font-medium tabular-nums">{formatClock(item.startTime)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.patient.name}</span>
                  <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <ProviderDot color={item.provider.color} />
                    {item.patient.mrn} · {item.provider.name}
                    {item.provider.room ? ` · ${item.provider.room}` : ""}
                  </span>
                </span>
                <StatusBadge status={item.status} />
                {access.manageAppointments && (
                  <Button size="sm" onClick={() => checkInPatient(item)} loading={checkingId === item.id} disabled={checkingId !== null && checkingId !== item.id} aria-label={`Check in ${item.patient.name}`}>
                    <UserCheck className="h-4 w-4" aria-hidden="true" />
                    Check in
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {walkIn && (
        <WalkInTokenDialog
          onClose={() => setWalkIn(false)}
          onIssued={appointment => {
            setWalkIn(false);
            setSlip(appointment);
          }}
        />
      )}
      {slip && <TokenSlipDialog key={slip.id} appointment={slip} onClose={() => setSlip(null)} />}
    </div>
  );
}

function QueueCard({ queue, onSlip }: { queue: ProviderQueue; onSlip: (appointment: Appointment) => void }) {
  const { provider, nowServing, waiting } = queue;
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-medium">
            <ProviderDot color={provider.color} />
            {provider.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">{[provider.specialty, provider.room].filter(Boolean).join(" · ") || "No room set"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Now serving</p>
          <p className="text-3xl font-bold leading-none tabular-nums" aria-label={nowServing ? `Now serving token ${nowServing.token}` : "Nobody being served"}>
            {nowServing?.token ?? "—"}
          </p>
        </div>
      </div>
      <p className="text-sm">
        <span className="font-semibold tabular-nums">{waiting.length}</span> waiting · {queue.done} done
        {queue.averageConsultMinutes != null && <span className="text-muted-foreground"> · ~{Math.round(queue.averageConsultMinutes)} min each</span>}
      </p>
      {waiting.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">Next tokens (select one for its slip)</p>
          <ul className="flex flex-wrap gap-1.5">
            {waiting.slice(0, 8).map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSlip(item)}
                  title={`${item.patient.name}${item.calledAt ? " (called)" : ""}`}
                  aria-label={`Token ${item.token}, ${item.patient.name}${item.calledAt ? ", called" : ""}: print slip`}
                  className="min-w-10 rounded-md border bg-muted/40 px-2 py-1 text-sm font-semibold tabular-nums hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[called=true]:border-amber-400 data-[called=true]:text-amber-800 dark:data-[called=true]:text-amber-300"
                  data-called={Boolean(item.calledAt)}
                >
                  {item.token}
                </button>
              </li>
            ))}
            {waiting.length > 8 && <li className="self-center text-xs text-muted-foreground">+{waiting.length - 8} more</li>}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Next token: {queue.nextToken}</p>
      )}
      {nowServing && (
        <button type="button" onClick={() => onSlip(nowServing)} className="self-start text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Slip for token {nowServing.token} ({nowServing.patient.name})
        </button>
      )}
    </li>
  );
}
