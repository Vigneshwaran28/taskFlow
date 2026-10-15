"use client";
import { useState } from "react";
import Link from "@/components/navigation/Link";
import { FileQuestion } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { ApiError } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/dates";
import { useCurrentUser } from "@/features/auth";
import { PriorityBadge } from "@/features/tasks";
import { useTicket } from "../hooks/useTickets";
import { TICKET_CATEGORIES } from "../utils/ticketMeta";
import { ReplyBox } from "./ReplyBox";
import { SatisfactionCard } from "./SatisfactionCard";
import { TicketStatusBadge } from "./TicketBadges";
import { TicketDeadlines } from "./TicketDeadlines";
import { TicketProperties } from "./TicketProperties";
import { TicketTimeline } from "./TicketTimeline";

/** Feature component: one ticket with its conversation, properties, and service targets. */
export function TicketDetail({ ticketId }: { ticketId: number }) {
  const { data: user } = useCurrentUser();
  const { data: ticket, isPending, error, refetch } = useTicket(ticketId);
  const [showActivity, setShowActivity] = useState(true);

  if (isPending) return <LoadingState label="Loading ticket…" />;
  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        title="Ticket not found"
        message="It may have been deleted, or it belongs to someone else."
        icon={FileQuestion}
        action={
          <Link href="/tickets" className="text-sm font-medium text-primary hover:underline">
            Back to the help desk
          </Link>
        }
      />
    );
  }
  if (error || !ticket) return <ErrorState message="Unable to load this ticket." onRetry={() => void refetch()} />;

  // Staff and the ticket's assignee work it (the server decides and sends canWork).
  const worker = ticket.canWork;
  const isRequester = ticket.requester.id === user?.id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-sm text-muted-foreground">{ticket.key}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{ticket.subject}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <TicketStatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <span>{TICKET_CATEGORIES[ticket.category]?.label ?? ticket.category}</span>
            <span aria-hidden="true">·</span>
            <span>Opened {formatDateTime(ticket.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Conversation</h2>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={showActivity} onChange={event => setShowActivity(event.target.checked)} className="h-4 w-4 rounded border-input accent-primary" />
              Show activity
            </label>
          </div>
          <TicketTimeline ticket={ticket} showActivity={showActivity} />
          <ReplyBox key={ticket.id} ticket={ticket} staff={worker} />
        </div>

        <aside className="flex flex-col gap-4" aria-label="Ticket details">
          <section aria-labelledby="ticket-requester-heading" className="rounded-xl border bg-card p-4">
            <h2 id="ticket-requester-heading" className="mb-3 text-sm font-semibold">
              Requester
            </h2>
            <div className="flex items-center gap-3">
              <Avatar name={ticket.requester.name} imageUrl={ticket.requester.avatarUrl} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{ticket.requester.name}</p>
                <p className="truncate text-xs text-muted-foreground">{ticket.requester.jobTitle ?? ticket.requester.email}</p>
                {ticket.requester.jobTitle && <p className="truncate text-xs text-muted-foreground">{ticket.requester.email}</p>}
              </div>
            </div>
          </section>
          <TicketProperties ticket={ticket} staff={worker} currentUserId={user?.id ?? null} />
          <TicketDeadlines ticket={ticket} />
          <SatisfactionCard key={`${ticket.id}-${ticket.satisfaction}`} ticket={ticket} isRequester={isRequester} />
        </aside>
      </div>
    </div>
  );
}
