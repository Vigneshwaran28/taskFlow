import { Activity, Lock } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { formatDateTime, formatTimeAgo } from "@/lib/dates";
import type { TicketComment, TicketDetail, TicketEvent } from "../services/ticketService";
import { describeEvent } from "../utils/ticketMeta";

interface MessageProps {
  author: { name: string; isStaff?: boolean } | null;
  body: string;
  createdAt: string;
  isInternal?: boolean;
  label?: string;
}

/** One message in the thread. */
function Message({ author, body, createdAt, isInternal = false, label }: MessageProps) {
  const name = author?.name ?? "Deleted user";
  return (
    <li className="flex gap-3">
      <Avatar name={name} />
      <div className={cn("min-w-0 flex-1 rounded-xl border px-4 py-3", isInternal ? "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10" : "bg-card")}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium">{name}</span>
          {author?.isStaff && <Badge tone="primary">Support</Badge>}
          {isInternal && (
            <Badge tone="warning">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Internal note
            </Badge>
          )}
          {label && <span className="text-xs text-muted-foreground">{label}</span>}
          <time dateTime={createdAt} title={formatDateTime(createdAt)} className="ml-auto text-xs text-muted-foreground">
            {formatTimeAgo(createdAt)}
          </time>
        </div>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{body}</p>
      </div>
    </li>
  );
}

type TimelineItem = { kind: "comment"; at: string; id: string; comment: TicketComment } | { kind: "event"; at: string; id: string; event: TicketEvent };

/** Presentational: the original request, then replies, notes, and (optionally) activity in time order. */
export function TicketTimeline({ ticket, showActivity }: { ticket: TicketDetail; showActivity: boolean }) {
  const items: TimelineItem[] = [
    ...ticket.comments.map((comment): TimelineItem => ({ kind: "comment", at: comment.createdAt, id: `c${comment.id}`, comment })),
    ...(showActivity
      ? ticket.events.filter(event => event.type !== "created").map((event): TimelineItem => ({ kind: "event", at: event.createdAt, id: `e${event.id}`, event }))
      : []),
  ].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));

  return (
    <ol className="flex flex-col gap-4" aria-label="Conversation">
      <Message author={{ name: ticket.requester.name }} body={ticket.description} createdAt={ticket.createdAt} label="opened this ticket" />
      {items.map(item =>
        item.kind === "comment" ? (
          <Message key={item.id} author={item.comment.author} body={item.comment.body} createdAt={item.comment.createdAt} isInternal={item.comment.isInternal} />
        ) : (
          <li key={item.id} className="flex items-center gap-3 pl-2 text-xs text-muted-foreground">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
              <Activity className="h-3 w-3" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="font-medium text-foreground">{item.event.actor?.name ?? "Someone"}</span> {describeEvent(item.event)}
              <span aria-hidden="true"> · </span>
              <time dateTime={item.event.createdAt} title={formatDateTime(item.event.createdAt)}>
                {formatTimeAgo(item.event.createdAt)}
              </time>
            </span>
          </li>
        )
      )}
    </ol>
  );
}
