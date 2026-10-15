"use client";
// Vitals (nurses, clinic.vitals.record): every checked-in patient in today's queues, those still needing vitals
// first, with "Record vitals" / "Update". Live with the queues.
import { useMemo, useState } from "react";
import { HeartPulse, Search, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { controlClass } from "@/components/ui/FieldShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useQueue } from "../hooks/useClinic";
import type { QueueEntry } from "../services/clinicService";
import { ageGender } from "../utils/clinicMeta";
import { ProviderDot, StatusBadge } from "./ClinicBadges";
import { TriageDialog } from "./TriageDialog";

export function VitalsPanel() {
  const queue = useQueue();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<QueueEntry | null>(null);

  const patients = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = (queue.data?.providers ?? []).flatMap(item => [...(item.nowServing ? [item.nowServing] : []), ...item.waiting]);
    return all
      .filter(item => !term || item.patient.name.toLowerCase().includes(term) || item.patient.mrn.toLowerCase().includes(term) || String(item.token ?? "") === term)
      .sort((a, b) => Number(a.triageRecorded) - Number(b.triageRecorded) || String(a.checkedInAt).localeCompare(String(b.checkedInAt)));
  }, [queue.data, search]);
  const pending = patients.filter(item => !item.triageRecorded).length;

  if (queue.isPending) return <LoadingState label="Loading checked-in patients…" />;
  if (queue.error) return <ErrorState message="Unable to load the queues." onRetry={() => void queue.refetch()} />;

  return (
    <section aria-labelledby="vitals-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="vitals-heading" className="flex items-center gap-2 font-semibold">
          <HeartPulse className="h-4 w-4" aria-hidden="true" />
          Checked-in patients <span className="text-sm font-normal text-muted-foreground">({pending} need vitals)</span>
        </h2>
        <div className="relative w-full sm:w-72">
          <label htmlFor="vitals-search" className="sr-only">
            Search checked-in patients
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input id="vitals-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, MRN or token" className={controlClass(null, "h-10 pl-9")} />
        </div>
      </div>
      {patients.length === 0 ? (
        <EmptyState title={search ? "No checked-in patients match" : "Nobody is checked in"} message="Patients appear here once reception checks them in or issues a walk-in token." icon={Stethoscope} />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {patients.map(item => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="flex h-10 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-lg font-bold tabular-nums" aria-label={`Token ${item.token}`}>
                {item.token ?? "—"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.patient.name}</span>
                <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <ProviderDot color={item.provider.color} />
                  {[ageGender(item.patient.age, item.patient.gender, item.patient.ageEstimated), item.provider.name, item.reason].filter(Boolean).join(" · ")}
                </span>
                {item.patient.allergies && <span className="block truncate text-xs font-medium text-red-700 dark:text-red-300">Allergies: {item.patient.allergies}</span>}
              </span>
              <StatusBadge status={item.status} />
              {item.triageRecorded ? <Badge tone="success">Vitals taken</Badge> : <Badge tone="warning">Needs vitals</Badge>}
              <Button size="sm" variant={item.triageRecorded ? "secondary" : "primary"} onClick={() => setOpen(item)} aria-label={`${item.triageRecorded ? "Update" : "Record"} vitals for ${item.patient.name}`}>
                <HeartPulse className="h-4 w-4" aria-hidden="true" />
                {item.triageRecorded ? "Update" : "Record vitals"}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {open && <TriageDialog key={open.id} appointment={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
