import { Users } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { cn } from "@/lib/cn";
import { formatTimeAgo } from "@/lib/dates";
import type { Conversation } from "../services/messagingService";

export interface ConversationListProps {
  conversations: Conversation[];
  activeId: number | null;
  currentUserId: number | null;
  onOpen: (id: number) => void;
}

/** Presentational: conversations, newest activity first, with unread counts. */
export function ConversationList({ conversations, activeId, currentUserId, onOpen }: ConversationListProps) {
  return (
    <ul className="flex flex-col" aria-label="Conversations">
      {conversations.map(conversation => {
        const last = conversation.lastMessage;
        const preview = !last
          ? "No messages yet"
          : last.deleted
            ? "Message deleted"
            : last.kind === "system"
              ? last.body
              : `${last.sender?.id === currentUserId ? "You" : conversation.type === "group" ? (last.sender?.name.split(" ")[0] ?? "Someone") : ""}${last.sender?.id === currentUserId || conversation.type === "group" ? ": " : ""}${last.body}`;
        const active = conversation.id === activeId;
        return (
          <li key={conversation.id}>
            <button
              type="button"
              onClick={() => onOpen(conversation.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                active ? "bg-accent" : "hover:bg-muted"
              )}
            >
              {conversation.type === "group" ? (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
                  <Users className="h-4 w-4" />
                </span>
              ) : (
                <Avatar name={conversation.name} imageUrl={conversation.avatarUrl} />
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate text-sm", conversation.unread ? "font-semibold" : "font-medium")}>{conversation.name}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{formatTimeAgo(conversation.lastActivityAt)}</span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-xs", conversation.unread ? "text-foreground" : "text-muted-foreground")}>{preview}</span>
                  {conversation.unread > 0 && (
                    <span
                      className="shrink-0 rounded-full bg-primary px-1.5 text-[11px] font-semibold tabular-nums text-primary-foreground"
                      aria-label={`${conversation.unread} unread`}
                    >
                      {conversation.unread}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
