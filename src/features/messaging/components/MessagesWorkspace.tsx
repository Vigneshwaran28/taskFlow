"use client";
import { useState } from "react";
import { MessageSquarePlus, MessagesSquare, Search, UsersRound } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useCan, useCurrentUser, useModuleSettings } from "@/features/auth";
import { useConversations } from "../hooks/useMessaging";
import { ChatThread } from "./ChatThread";
import { ConversationList } from "./ConversationList";
import { NewConversationDialog } from "./NewConversationDialog";

export interface MessagesWorkspaceProps {
  conversationId: number | null;
  onOpen: (id: number | null) => void;
}

/** Feature component: conversation list and the open chat side by side (stacked on phones). */
export function MessagesWorkspace({ conversationId, onOpen }: MessagesWorkspaceProps) {
  const { data: me } = useCurrentUser();
  const settings = useModuleSettings("messaging");
  const { data: conversations, isPending, error, refetch } = useConversations();
  const [filter, setFilter] = useState("");
  const [dialog, setDialog] = useState<{ mode: "direct" | "group"; key: number } | null>(null);

  const mayCreateGroups = useCan("messaging.groups.create");
  const canCreateGroups = settings.allowGroups !== false && mayCreateGroups;
  const active = conversations?.find(conversation => conversation.id === conversationId) ?? null;
  const term = filter.trim().toLowerCase();
  const visible = (conversations ?? []).filter(conversation => !term || conversation.name.toLowerCase().includes(term));
  const openDialog = (mode: "direct" | "group") => setDialog(current => ({ mode, key: (current?.key ?? 0) + 1 }));
  const currentUserId = me?.id ?? null;

  return (
    <div className="grid h-[calc(100dvh-11rem)] min-h-[28rem] overflow-hidden rounded-xl border bg-card lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className={cn("flex min-h-0 flex-col border-r", active && "hidden lg:flex")} aria-label="Conversations">
        <div className="flex flex-col gap-2 border-b p-3">
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => openDialog("direct")}>
              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
              New message
            </Button>
            {canCreateGroups && (
              <Button size="sm" variant="secondary" onClick={() => openDialog("group")} aria-label="New group" title="New group">
                <UsersRound className="h-4 w-4" aria-hidden="true" />
                Group
              </Button>
            )}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <label htmlFor="conversation-filter" className="sr-only">
              Search conversations
            </label>
            <input
              id="conversation-filter"
              type="search"
              value={filter}
              onChange={event => setFilter(event.target.value)}
              placeholder="Search chats"
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {isPending ? (
            <LoadingState label="Loading chats…" />
          ) : error ? (
            <ErrorState message="Unable to load your chats." onRetry={() => void refetch()} />
          ) : visible.length ? (
            <ConversationList conversations={visible} activeId={conversationId} currentUserId={currentUserId} onOpen={onOpen} />
          ) : (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{term ? "No chats match." : "No chats yet. Start one with New message."}</p>
          )}
        </div>
      </aside>

      <div className={cn("min-h-0", !active && "hidden lg:block")}>
        {active ? (
          <ChatThread key={active.id} conversation={active} currentUserId={currentUserId} onBack={() => onOpen(null)} onLeft={() => onOpen(null)} />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              title={conversationId && !isPending ? "Chat not found" : "Pick a chat"}
              message={conversationId && !isPending ? "You may have left it, or it was removed." : "Choose a conversation on the left, or start a new one."}
              icon={MessagesSquare}
            />
          </div>
        )}
      </div>

      {dialog && <NewConversationDialog key={dialog.key} mode={dialog.mode} onClose={() => setDialog(null)} onOpened={onOpen} />}
    </div>
  );
}
