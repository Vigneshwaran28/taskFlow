import { formatDateTime } from "@/lib/dates";
import type { Ticket } from "../services/ticketService";
import { isActive } from "../utils/ticketMeta";
import { DeadlineBadge } from "./TicketBadges";

/** Presentational: first-response and resolution targets with their state. */
export function TicketDeadlines({ ticket }: { ticket: Ticket }) {
  const resolvedAt = isActive(ticket) ? null : (ticket.resolvedAt ?? ticket.closedAt);
  const rows = [
    { label: "First response", dueAt: ticket.responseDueAt, doneAt: ticket.firstResponseAt, doneLabel: "Replied" },
    { label: "Resolution", dueAt: ticket.resolutionDueAt, doneAt: resolvedAt, doneLabel: "Resolved" },
  ];

  return (
    <section aria-labelledby="ticket-deadlines-heading" className="rounded-xl border bg-card p-4">
      <h2 id="ticket-deadlines-heading" className="mb-3 text-sm font-semibold">
        Service targets
      </h2>
      <dl className="flex flex-col gap-3">
        {rows.map(row => (
          <div key={row.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd>
                <DeadlineBadge dueAt={row.dueAt} doneAt={row.doneAt} />
              </dd>
            </div>
            <p className="text-xs tabular-nums text-muted-foreground">
              Target {formatDateTime(row.dueAt)}
              {row.doneAt && ` · ${row.doneLabel} ${formatDateTime(row.doneAt)}`}
            </p>
          </div>
        ))}
      </dl>
    </section>
  );
}
