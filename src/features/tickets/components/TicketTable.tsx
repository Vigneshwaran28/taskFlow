import Link from "@/components/navigation/Link";
import { MessageSquareText } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { formatTimeAgo } from "@/lib/dates";
import { PriorityBadge } from "@/features/tasks";
import type { Ticket } from "../services/ticketService";
import { isActive, TICKET_CATEGORIES } from "../utils/ticketMeta";
import { DeadlineBadge, TicketStatusBadge } from "./TicketBadges";

/** Presentational: one row per ticket, linking to its page. */
export function TicketTable({ tickets, showRequester = true }: { tickets: Ticket[]; showRequester?: boolean }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {tickets.map(ticket => (
        <li key={ticket.id}>
          <Link
            href={`/tickets/${ticket.id}`}
            className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:flex-row md:items-center"
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-2">
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{ticket.key}</span>
                <span className="truncate font-medium">{ticket.subject}</span>
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {showRequester && <span>{ticket.requester.name}</span>}
                {showRequester && <span aria-hidden="true">·</span>}
                <span>{TICKET_CATEGORIES[ticket.category]?.label ?? ticket.category}</span>
                {ticket.team && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{ticket.team.name}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>Updated {formatTimeAgo(ticket.updatedAt)}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <PriorityBadge priority={ticket.priority} />
              <TicketStatusBadge status={ticket.status} />
              {isActive(ticket) && <DeadlineBadge dueAt={ticket.resolutionDueAt} compact />}
              {ticket.assignee ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground" title={`Assigned to ${ticket.assignee.name}`}>
                  <Avatar name={ticket.assignee.name} imageUrl={ticket.assignee.avatarUrl} size="sm" />
                  <span className="hidden lg:inline">{ticket.assignee.name}</span>
                  <span className="sr-only lg:hidden">Assigned to {ticket.assignee.name}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground">
                  <MessageSquareText className="h-3 w-3" aria-hidden="true" />
                  Unassigned
                </span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
