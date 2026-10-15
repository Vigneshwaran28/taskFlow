"use client";
import { useState } from "react";
import { Banknote, CheckCircle2, Clock, Inbox, Wallet, XCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";
import { useCan, useCurrentUser } from "@/features/auth";
import { useClaims, useExpenseSummary, useUpdateClaim } from "../hooks/useExpenses";
import type { ClaimUpdate, ExpenseClaim } from "../services/expenseService";
import { ClaimList } from "./ClaimList";

/** Feature component (approvers / payers): review pending claims, pay approved ones, see recent history. */
export function ExpenseApprovals() {
  const toast = useToast();
  const { data: me } = useCurrentUser();
  const { data: claims, isPending, error, refetch } = useClaims({ scope: "all" });
  const { data: summary } = useExpenseSummary();
  const update = useUpdateClaim();
  const canApprove = useCan("expenses.approve");
  const canPay = useCan("expenses.pay");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [rejecting, setRejecting] = useState<ExpenseClaim | null>(null);

  if (isPending) return <LoadingState label="Loading claims…" />;
  if (error) return <ErrorState message="Unable to load claims." onRetry={() => void refetch()} />;

  function act(claim: ExpenseClaim, status: ClaimUpdate["status"]) {
    update.mutate(
      // Review notes only apply to approve / reject.
      { id: claim.id, status, reviewNote: status === "paid" ? null : notes[claim.id]?.trim() || null },
      {
        onSuccess: () => {
          toast.success(`${claim.key} ${status}`, `${claim.user.name} has been notified.`);
          setRejecting(null);
          setNotes(current => {
            const next = { ...current };
            delete next[claim.id];
            return next;
          });
        },
        onError: err => toast.error("Couldn't update the claim", err.message),
      }
    );
  }

  const pending = claims.filter(claim => claim.status === "pending");
  const toPay = claims.filter(claim => claim.status === "approved");
  const history = claims.filter(claim => !["pending", "approved"].includes(claim.status)).slice(0, 20);
  const own = (claim: ExpenseClaim) => claim.user.id === me?.id;

  return (
    <div className="flex flex-col gap-6">
      {summary?.team && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={`To review (${summary.team.pending.count})`} value={formatMoney(summary.team.pending.amount)} icon={Clock} tone="warning" />
          <StatCard label={`Approved, to pay (${summary.team.toPay.count})`} value={formatMoney(summary.team.toPay.amount)} icon={Banknote} />
          <StatCard label={`Paid this month (${summary.team.paidThisMonth.count})`} value={formatMoney(summary.team.paidThisMonth.amount)} icon={Wallet} tone="success" />
        </div>
      )}

      <section aria-labelledby="to-review-heading" className="flex flex-col gap-3">
        <h2 id="to-review-heading" className="font-semibold">
          To review <span className="text-sm font-normal tabular-nums text-muted-foreground">({pending.length})</span>
        </h2>
        {pending.length ? (
          <ClaimList
            claims={pending}
            showPerson
            renderActions={claim =>
              !canApprove ? (
                <p className="text-xs text-muted-foreground">Waiting for an approver.</p>
              ) : own(claim) ? (
                <p className="text-xs text-muted-foreground">Someone else reviews your own claim.</p>
              ) : (
                <>
                  <label htmlFor={`claim-note-${claim.id}`} className="sr-only">
                    Note to {claim.user.name} (optional)
                  </label>
                  <input
                    id={`claim-note-${claim.id}`}
                    value={notes[claim.id] ?? ""}
                    maxLength={300}
                    placeholder="Note (optional)"
                    onChange={event => setNotes(current => ({ ...current, [claim.id]: event.target.value }))}
                    className="h-8 w-40 rounded-lg border border-input bg-card px-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button size="sm" onClick={() => act(claim, "approved")} disabled={update.isPending}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Approve
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setRejecting(claim)} disabled={update.isPending}>
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    Reject
                  </Button>
                </>
              )
            }
          />
        ) : (
          <EmptyState title="Nothing to review" message="New claims appear here, and you get a notification." icon={Inbox} />
        )}
      </section>

      {toPay.length > 0 && (
        <section aria-labelledby="to-pay-heading" className="flex flex-col gap-3">
          <h2 id="to-pay-heading" className="font-semibold">
            Approved, waiting for payment <span className="text-sm font-normal tabular-nums text-muted-foreground">({toPay.length})</span>
          </h2>
          <ClaimList
            claims={toPay}
            showPerson
            renderActions={claim =>
              canPay &&
              !own(claim) && (
                <Button size="sm" variant="secondary" onClick={() => act(claim, "paid")} disabled={update.isPending}>
                  <Banknote className="h-4 w-4" aria-hidden="true" />
                  Mark paid
                </Button>
              )
            }
          />
        </section>
      )}

      {history.length > 0 && (
        <section aria-labelledby="claim-history-heading" className="flex flex-col gap-3">
          <h2 id="claim-history-heading" className="font-semibold">
            Recent history
          </h2>
          <ClaimList claims={history} showPerson />
        </section>
      )}

      <ConfirmDialog
        open={Boolean(rejecting)}
        title="Reject this claim?"
        message={rejecting ? `${rejecting.key} from ${rejecting.user.name} (${formatMoney(rejecting.amount)}) won't be paid, and ${rejecting.user.name} is notified. This can't be undone.` : ""}
        confirmLabel="Reject"
        pending={update.isPending}
        onConfirm={() => rejecting && act(rejecting, "rejected")}
        onCancel={() => setRejecting(null)}
      />
    </div>
  );
}
