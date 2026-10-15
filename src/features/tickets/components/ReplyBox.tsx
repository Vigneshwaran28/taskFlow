"use client";
import { useId, useState, type FormEvent } from "react";
import { Lock, Send } from "lucide-react";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { fieldErrorsOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { useAddTicketComment, useUpdateTicket } from "../hooks/useTickets";
import type { TicketDetail, TicketStatus } from "../services/ticketService";

const AFTER_SEND: { value: "" | TicketStatus; label: string }[] = [
  { value: "", label: "Keep current status" },
  { value: "waiting", label: "Then: waiting on requester" },
  { value: "resolved", label: "Then: mark resolved" },
];

/**
 * Feature component: reply to the requester, or (staff / assignee) add an internal note and move the ticket on.
 * `staff`: the viewer can work this ticket.
 */
export function ReplyBox({ ticket, staff }: { ticket: TicketDetail; staff: boolean }) {
  const toast = useToast();
  const addComment = useAddTicketComment();
  const updateTicket = useUpdateTicket();
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [afterSend, setAfterSend] = useState<"" | TicketStatus>("");
  const [error, setError] = useState("");
  const id = useId();
  const pending = addComment.isPending || updateTicket.isPending;
  const closed = ticket.status === "closed";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const text = body.trim();
    if (!text) {
      setError("Write a message first.");
      return;
    }
    if (text.length > 10_000) {
      setError("The message is too long.");
      return;
    }
    addComment.mutate(
      { id: ticket.id, body: text, isInternal },
      {
        onSuccess: () => {
          setBody("");
          const nextStatus = !isInternal && afterSend && afterSend !== ticket.status ? afterSend : null;
          if (nextStatus) {
            updateTicket.mutate({ id: ticket.id, changes: { status: nextStatus } }, { onError: err => toast.error("Reply sent, but the status wasn't changed", err.message) });
          }
          toast.success(isInternal ? "Internal note added" : "Reply sent");
          setAfterSend("");
        },
        onError: err => setError(fieldErrorsOf(err).body ?? err.message),
      }
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("flex flex-col gap-3 rounded-xl border p-4", isInternal ? "border-amber-300 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-500/10" : "bg-card")}
    >
      {staff && (
        <div role="radiogroup" aria-label="Message type" className="flex gap-1 self-start rounded-lg bg-muted p-1">
          {[
            { internal: false, label: "Reply to requester", icon: Send },
            { internal: true, label: "Internal note", icon: Lock },
          ].map(option => (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={isInternal === option.internal}
              onClick={() => setIsInternal(option.internal)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isInternal === option.internal ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <option.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {option.label}
            </button>
          ))}
        </div>
      )}
      <label htmlFor={id} className="sr-only">
        {isInternal ? "Internal note" : "Reply"}
      </label>
      <textarea
        id={id}
        rows={4}
        value={body}
        maxLength={10000}
        onChange={event => {
          setBody(event.target.value);
          setError("");
        }}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : `${id}-hint`}
        placeholder={isInternal ? "Only support staff and the assignee see internal notes." : closed ? "This ticket is closed. Replying won't reopen it." : "Write a reply…"}
        className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {isInternal ? "Visible to support staff and the assignee only." : staff ? `${ticket.requester.name} will be notified.` : "The support team will be notified."}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {staff && !isInternal && (
          <>
            <label htmlFor={`${id}-after`} className="sr-only">
              After sending
            </label>
            <select
              id={`${id}-after`}
              value={afterSend}
              onChange={event => setAfterSend(event.target.value as "" | TicketStatus)}
              className="h-10 rounded-lg border border-input bg-card px-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {AFTER_SEND.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </>
        )}
        <Button type="submit" loading={pending}>
          {isInternal ? <Lock className="h-4 w-4" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {isInternal ? "Add note" : "Send reply"}
        </Button>
      </div>
    </form>
  );
}
