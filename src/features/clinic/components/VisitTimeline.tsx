// A patient's visits, newest first: vitals chips, diagnosis, plan and prescriptions.
import { CalendarClock, Pencil, Pill, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDay } from "@/lib/format";
import type { Visit } from "../services/clinicService";
import { routeLabel, vitalChips } from "../utils/clinicMeta";

export interface VisitTimelineProps {
  visits: Visit[];
  /** The signed-in user's id: visits they wrote can be edited */
  editorId?: number | null;
  onPrint: (visit: Visit) => void;
  onEdit: (visit: Visit) => void;
}

export function VisitTimeline({ visits, editorId, onPrint, onEdit }: VisitTimelineProps) {
  if (!visits.length) return <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No visits recorded yet.</p>;
  return (
    <ol className="relative flex flex-col gap-4 border-l pl-5">
      {visits.map(visit => {
        const chips = vitalChips(visit.vitals, visit.bmi);
        return (
          <li key={visit.id} className="relative">
            <span aria-hidden="true" className="absolute -left-[1.6rem] top-5 h-3 w-3 rounded-full border-2 border-card bg-primary" />
            <article className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
              <header className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{formatDay(visit.visitDate)}</h3>
                  <p className="text-xs text-muted-foreground">
                    {visit.provider?.name ?? "Unknown practitioner"}
                    {visit.appointmentId ? "" : " · Walk-in"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {editorId != null && visit.provider?.userId === editorId && (
                    <Button variant="ghost" size="sm" onClick={() => onEdit(visit)} aria-label={`Edit visit on ${formatDay(visit.visitDate)}`}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => onPrint(visit)} aria-label={`Print prescription from ${formatDay(visit.visitDate)}`}>
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    Print prescription
                  </Button>
                </div>
              </header>

              {visit.chiefComplaint && <p className="text-sm">{visit.chiefComplaint}</p>}
              {chips.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="Vitals">
                  {chips.map(chip => (
                    <li
                      key={chip.label}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs tabular-nums",
                        chip.flagged ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {chip.label}
                    </li>
                  ))}
                </ul>
              )}

              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                {visit.diagnosis && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diagnosis</dt>
                    <dd className="font-medium">{visit.diagnosis}</dd>
                  </div>
                )}
                {visit.followUpOn && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Follow-up</dt>
                    <dd className="flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatDay(visit.followUpOn)}
                    </dd>
                  </div>
                )}
                {visit.examination && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Examination</dt>
                    <dd className="whitespace-pre-line">{visit.examination}</dd>
                  </div>
                )}
                {visit.plan && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan</dt>
                    <dd className="whitespace-pre-line">{visit.plan}</dd>
                  </div>
                )}
              </dl>

              {visit.prescriptions.length > 0 && (
                <div>
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Pill className="h-3.5 w-3.5" aria-hidden="true" />
                    Prescriptions
                  </p>
                  <ul className="divide-y rounded-lg border text-sm">
                    {visit.prescriptions.map(item => (
                      <li key={item.id} className="flex flex-wrap gap-x-3 px-3 py-1.5">
                        <span className="font-medium">{item.medicine}</span>
                        <span className="text-muted-foreground">{[item.dosage, item.frequency, item.duration, routeLabel(item.route) || null, item.instructions].filter(Boolean).join(" · ")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
