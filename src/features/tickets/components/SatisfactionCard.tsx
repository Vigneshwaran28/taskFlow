"use client";
import { useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { fieldErrorsOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { useRateTicket } from "../hooks/useTickets";
import type { TicketDetail } from "../services/ticketService";

const LABELS = ["", "Very poor", "Poor", "Okay", "Good", "Excellent"];

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(star => (
        <Star key={star} className={cn(size, star <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} aria-hidden="true" />
      ))}
    </span>
  );
}

/** Feature component: the requester rates a resolved ticket; everyone else sees the rating. */
export function SatisfactionCard({ ticket, isRequester }: { ticket: TicketDetail; isRequester: boolean }) {
  const toast = useToast();
  const rate = useRateTicket();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const done = ticket.status === "resolved" || ticket.status === "closed";

  if (!done || (!isRequester && !ticket.satisfaction)) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (rate.isPending) return;
    if (!rating) {
      setRatingError("Choose 1 to 5 stars.");
      return;
    }
    rate.mutate(
      { id: ticket.id, rating, comment: comment.trim() || null },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success("Thanks for the feedback");
        },
        onError: error => {
          const fieldError = fieldErrorsOf(error).rating ?? fieldErrorsOf(error).comment;
          if (fieldError) setRatingError(fieldError);
          else toast.error("Rating not saved", error.message);
        },
      }
    );
  }

  const showForm = isRequester && (!ticket.satisfaction || editing);
  const satisfaction = ticket.satisfaction ?? 0;

  return (
    <section aria-labelledby="ticket-rating-heading" className="rounded-xl border bg-card p-4">
      <h2 id="ticket-rating-heading" className="mb-3 text-sm font-semibold">
        {isRequester ? "How did we do?" : "Requester rating"}
      </h2>
      {showForm ? (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          <fieldset aria-invalid={Boolean(ratingError)} aria-describedby={ratingError ? "ticket-rating-error" : undefined}>
            <legend className="sr-only">Rating</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <label key={star} className="cursor-pointer">
                  <input
                    type="radio"
                    name="rating"
                    value={star}
                    checked={rating === star}
                    onChange={() => {
                      setRating(star);
                      setRatingError(null);
                    }}
                    className="peer sr-only"
                  />
                  <Star
                    className={cn(
                      "h-7 w-7 rounded transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                      star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/50 hover:text-amber-400"
                    )}
                    aria-hidden="true"
                  />
                  <span className="sr-only">
                    {star} star{star > 1 ? "s" : ""}, {LABELS[star]}
                  </span>
                </label>
              ))}
            </div>
            {ratingError ? (
              <p id="ticket-rating-error" role="alert" className="mt-1 text-xs text-destructive">
                {ratingError}
              </p>
            ) : (
              <p className="mt-1 h-4 text-xs text-muted-foreground" aria-live="polite">
                {LABELS[rating]}
              </p>
            )}
          </fieldset>
          <label htmlFor="ticket-rating-comment" className="sr-only">
            Comment (optional)
          </label>
          <textarea
            id="ticket-rating-comment"
            rows={2}
            maxLength={1000}
            value={comment}
            onChange={event => setComment(event.target.value)}
            placeholder="Anything we could do better? (optional)"
            className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" loading={rate.isPending}>
            Submit rating
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Stars value={satisfaction} />
            <span className="text-sm font-medium">{LABELS[satisfaction]}</span>
          </div>
          {ticket.satisfactionComment && <p className="text-sm text-muted-foreground">“{ticket.satisfactionComment}”</p>}
          {isRequester && (
            <Button
              variant="link"
              size="sm"
              className="h-auto self-start px-0"
              onClick={() => {
                setRating(satisfaction);
                setComment(ticket.satisfactionComment ?? "");
                setEditing(true);
              }}
            >
              Change rating
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
