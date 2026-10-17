"use client";
import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ExternalLink, Info, Send, Trash2, Users, Video } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import { useDeleteMessage, useMarkConversationRead, useMessages, useOlderMessages, useSendMessage } from "../hooks/useMessaging";
import type { ChatMessage, Conversation } from "../services/messagingService";
import { GroupInfoDialog } from "./GroupInfoDialog";

const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" });
const dayKey = (iso: string) => new Date(iso).toDateString();

export interface ChatThreadProps {
  conversation: Conversation;
  currentUserId: number | null;
  onBack: () => void;
  onLeft: () => void;
}

/** Feature component: one conversation's messages and the composer. */
export function ChatThread({ conversation, currentUserId, onBack, onLeft }: ChatThreadProps) {
  const toast = useToast();
  const { data, isPending, error, refetch } = useMessages(conversation.id);
  const send = useSendMessage();
  const markRead = useMarkConversationRead();
  const deleteMessage = useDeleteMessage();
  const [body, setBody] = useState("");
  const olderPage = useOlderMessages();
  const [older, setOlder] = useState<{ messages: ChatMessage[]; hasMore: boolean | null }>({ messages: [], hasMore: null });
  const [infoOpen, setInfoOpen] = useState(false);
  const [deleting, setDeleting] = useState<ChatMessage | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestId = data?.messages.at(-1)?.id;

  const [meetMenuOpen, setMeetMenuOpen] = useState(false);

  function insertMeeting(type: "google_meet" | "zoom" | "teams") {
    setMeetMenuOpen(false);
    let link = "";
    if (type === "google_meet") {
      link = "Join my Google Meet: https://meet.google.com/new";
      window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer");
    } else if (type === "zoom") {
      link = "Join my Zoom meeting: https://zoom.us/start/videomeeting";
      window.open("https://zoom.us/start/videomeeting", "_blank", "noopener,noreferrer");
    } else {
      link = "Join my Microsoft Teams call: https://teams.microsoft.com";
      window.open("https://teams.microsoft.com", "_blank", "noopener,noreferrer");
    }
    setBody(curr => (curr ? `${curr}\n${link}` : link));
  }

  function renderMessageBody(text: string, isMine: boolean) {
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
    if (!urlMatch) return <p className="whitespace-pre-wrap break-words">{text}</p>;
    const url = urlMatch[1];
    const isMeet = url.includes("meet.google.com");
    const isZoom = url.includes("zoom.us");
    const isTeams = url.includes("teams.microsoft.com") || url.includes("teams.live.com");
    const isVideoMeeting = isMeet || isZoom || isTeams;

    return (
      <div className="flex flex-col gap-1.5">
        <p className="whitespace-pre-wrap break-words">{text}</p>
        {isVideoMeeting && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "mt-1 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold shadow-xs transition",
              isMine
                ? "bg-white/20 text-white hover:bg-white/30"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <Video className="h-3 w-3" aria-hidden="true" />
            <span>Join {isMeet ? "Google Meet" : isZoom ? "Zoom" : "Teams"}</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </div>
    );
  }

  const messages = [...older.messages, ...(data?.messages ?? [])];
  const hasMore = older.hasMore ?? data?.hasMore;

  // Scrolling the list is a DOM side effect; follow new messages as they arrive.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [latestId]);

  // Reading the open thread clears its unread count (server state, synced when new messages land).
  const markShownAsRead = useEffectEvent(() => {
    if (!markRead.isPending) markRead.mutate(conversation.id);
  });
  useEffect(() => {
    if (latestId && conversation.unread > 0) markShownAsRead();
  }, [latestId, conversation.unread]);

  function loadOlder() {
    const before = messages[0]?.id;
    if (!before || olderPage.isPending) return;
    olderPage.mutate(
      { id: conversation.id, before },
      {
        onSuccess: page => setOlder(current => ({ messages: [...page.messages, ...current.messages], hasMore: page.hasMore })),
        onError: () => toast.error("Couldn't load older messages"),
      }
    );
  }

  function handleSend(event?: FormEvent) {
    event?.preventDefault();
    const text = body.trim();
    if (!text || send.isPending) return;
    send.mutate({ id: conversation.id, body: text }, { onSuccess: () => setBody(""), onError: err => toast.error("Message not sent", err.message) });
  }

  const others = conversation.members.filter(member => member.id !== currentUserId);
  const subtitle =
    conversation.type === "group" ? `${conversation.members.length} members` : (others[0]?.jobTitle ?? (others[0]?.isActive === false ? "No longer in the workspace" : ""));

  return (
    <section aria-label={`Conversation with ${conversation.name}`} className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onBack} aria-label="Back to conversations">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        {conversation.type === "group" ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
            <Users className="h-4 w-4" />
          </span>
        ) : (
          <Avatar name={conversation.name} imageUrl={conversation.avatarUrl} />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{conversation.name}</h2>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {conversation.type === "group" && (
          <Button variant="ghost" size="icon" onClick={() => setInfoOpen(true)} aria-label="Group details">
            <Info className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite" aria-relevant="additions">
        {isPending ? (
          <LoadingState label="Loading messages…" />
        ) : error ? (
          <ErrorState message="Unable to load messages." onRetry={() => void refetch()} />
        ) : (
          <ol className="flex flex-col gap-1.5">
            {hasMore && (
              <li className="flex justify-center pb-2">
                <Button variant="ghost" size="sm" onClick={loadOlder} loading={olderPage.isPending}>
                  Load older messages
                </Button>
              </li>
            )}
            {!messages.length && <li className="py-10 text-center text-sm text-muted-foreground">No messages yet. Say hello!</li>}
            {messages.map((message, index) => {
              const previous = messages[index - 1];
              const newDay = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt);
              const mine = message.sender?.id === currentUserId;
              const showName =
                conversation.type === "group" && !mine && message.kind === "text" && (newDay || previous?.sender?.id !== message.sender?.id || previous?.kind !== "text");
              return (
                <li key={message.id} className="flex flex-col gap-1.5">
                  {newDay && (
                    <p className="my-2 text-center text-xs font-medium text-muted-foreground">
                      <span className="rounded-full bg-muted px-3 py-1">{dayFormat.format(new Date(message.createdAt))}</span>
                    </p>
                  )}
                  {message.kind === "system" ? (
                    <p className="text-center text-xs text-muted-foreground">
                      {message.body} · {formatTime(message.createdAt)}
                    </p>
                  ) : (
                    <div className={cn("group flex max-w-[85%] flex-col gap-0.5 sm:max-w-[70%]", mine ? "items-end self-end" : "items-start self-start")}>
                      {showName && <span className="px-1 text-xs font-medium text-muted-foreground">{message.sender?.name ?? "Former colleague"}</span>}
                      <div className="flex items-center gap-1.5">
                        {mine && !message.deleted && (
                          <button
                            type="button"
                            onClick={() => setDeleting(message)}
                            aria-label="Delete message"
                            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                        <div
                          className={cn(
                            "rounded-2xl px-3.5 py-2 text-sm",
                            message.deleted
                              ? "border border-dashed italic text-muted-foreground"
                              : mine
                                ? "rounded-br-md bg-primary text-primary-foreground"
                                : "rounded-bl-md bg-muted text-foreground"
                          )}
                        >
                          {message.deleted ? (
                            <p className="italic">Message deleted</p>
                          ) : (
                            renderMessageBody(message.body || "", mine)
                          )}
                        </div>
                      </div>
                      <time dateTime={message.createdAt} className="px-1 text-[11px] text-muted-foreground">
                        {formatTime(message.createdAt)}
                      </time>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-end gap-2 border-t p-3 relative">
        <label htmlFor="chat-composer" className="sr-only">
          Message {conversation.name}
        </label>

        {/* Video Meet Dropdown in Composer */}
        <div className="relative">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => setMeetMenuOpen(c => !c)}
            title="Share a Google Meet, Zoom, or Teams link"
            aria-label="Share meeting link"
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-primary"
          >
            <Video className="h-4 w-4" aria-hidden="true" />
          </Button>

          {meetMenuOpen && (
            <div
              onMouseLeave={() => setMeetMenuOpen(false)}
              className="absolute bottom-full left-0 z-30 mb-2 w-48 overflow-hidden rounded-xl border bg-card p-1 shadow-lg animate-in fade-in"
            >
              <div className="px-2 py-1 text-[11px] font-semibold uppercase text-muted-foreground">
                Share Meeting Link
              </div>
              <button
                type="button"
                onClick={() => insertMeeting("google_meet")}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-muted"
              >
                <span>Google Meet</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={() => insertMeeting("zoom")}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-muted"
              >
                <span>Zoom</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={() => insertMeeting("teams")}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-muted"
              >
                <span>Teams</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>

        <textarea
          id="chat-composer"
          rows={1}
          maxLength={4000}
          value={body}
          onChange={event => setBody(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder={`Message ${conversation.name}…  (Enter to send, Shift+Enter for a new line)`}
          className="max-h-40 min-h-10 flex-1 resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" size="icon" className="h-10 w-10" loading={send.isPending} disabled={!body.trim()} aria-label="Send message">
          {!send.isPending && <Send className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </form>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this message?"
        message="Everyone in the chat will see “Message deleted” instead."
        pending={deleteMessage.isPending}
        onConfirm={() =>
          deleting &&
          deleteMessage.mutate(
            { messageId: deleting.id },
            { onSuccess: () => setDeleting(null), onError: err => toast.error("Couldn't delete", err.message) }
          )
        }
        onCancel={() => setDeleting(null)}
      />

      {infoOpen && <GroupInfoDialog conversation={conversation} currentUserId={currentUserId} onClose={() => setInfoOpen(false)} onLeft={onLeft} />}
    </section>
  );
}
