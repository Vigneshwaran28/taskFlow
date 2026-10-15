import { Timer } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { TicketStatus } from "../services/ticketService";
import { DEADLINE_META, deadlineState, formatDue, TICKET_STATUSES } from "../utils/ticketMeta";

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const meta = TICKET_STATUSES[status] ?? TICKET_STATUSES.open;
  const Icon = meta.icon;
  return (
    <Badge tone={meta.tone}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}

/** Deadline state with time left (or how late). Icon + text, never color alone. */
export function DeadlineBadge({ dueAt, doneAt = null, compact = false }: { dueAt: string; doneAt?: string | null; compact?: boolean }) {
  const state = deadlineState(dueAt, doneAt);
  const meta = DEADLINE_META[state];
  const pending = state === "breached" || state === "due_soon" || state === "on_track";
  const text = pending ? (state === "breached" ? `Overdue ${formatDue(dueAt).replace(" ago", "")}` : `Due ${formatDue(dueAt)}`) : meta.label;
  return (
    <Badge tone={meta.tone} className="whitespace-nowrap">
      <Timer className="h-3 w-3" aria-hidden="true" />
      {compact ? text : pending ? text : `${meta.label} target`}
    </Badge>
  );
}
