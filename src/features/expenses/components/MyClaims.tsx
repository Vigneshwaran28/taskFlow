"use client";
import { useState, type ReactNode } from "react";
import { useActionParam } from "@/lib/actionParam";
import { CheckCircle2, Clock, Plus, ReceiptText, Wallet } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";
import { useClaims, useExpenseSummary, useUpdateClaim } from "../hooks/useExpenses";
import type { ExpenseClaim } from "../services/expenseService";
import { ClaimDialog } from "./ClaimDialog";
import { ClaimList } from "./ClaimList";

/** Feature component: the signed-in user's claims, totals, submit, and cancel. */
export function MyClaims() {
  const toast = useToast();
  const { data: claims, isPending, error, refetch } = useClaims({ scope: "mine" });
  const { data: summary } = useExpenseSummary();
  const update = useUpdateClaim();
  const [dialogKey, setDialogKey] = useState(0);
  useActionParam("new", () => setDialogKey(key => key + 1));
  const [cancelling, setCancelling] = useState<ExpenseClaim | null>(null);

  function cancel() {
    if (!cancelling) return;
    const claim = cancelling;
    update.mutate(
      { id: claim.id, status: "cancelled" },
      {
        onSuccess: () => {
          toast.success(`${claim.key} cancelled`);
          setCancelling(null);
        },
        onError: err => toast.error("Couldn't cancel", err.message),
      }
    );
  }

  const newButton = (
    <Button onClick={() => setDialogKey(key => key + 1)}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      New claim
    </Button>
  );

  let body: ReactNode;
  if (isPending) body = <LoadingState label="Loading claims…" />;
  else if (error) body = <ErrorState message="Unable to load your claims." onRetry={() => void refetch()} />;
  else if (!claims.length) body = <EmptyState title="No claims yet" message="Spent money for work? Submit it here and track it until it's paid." icon={ReceiptText} action={newButton} />;
  else {
    body = (
      <ClaimList
        claims={claims}
        renderActions={claim =>
          claim.status === "pending" && (
            <Button
              variant="ghost"
              size="sm"
              disabled={update.isPending}
              onClick={() => setCancelling(claim)}
            >
              Cancel
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={`Waiting for approval (${summary.mine.pending.count})`} value={formatMoney(summary.mine.pending.amount)} icon={Clock} tone="warning" />
          <StatCard label={`Approved, to be paid (${summary.mine.approved.count})`} value={formatMoney(summary.mine.approved.amount)} icon={CheckCircle2} />
          <StatCard label={`Paid to you (${summary.mine.paid.count})`} value={formatMoney(summary.mine.paid.amount)} icon={Wallet} tone="success" />
        </div>
      )}
      {claims && claims.length > 0 && <div className="flex justify-end">{newButton}</div>}
      {body}
      {dialogKey > 0 && <ClaimDialog key={dialogKey} onClose={() => setDialogKey(0)} />}
      <ConfirmDialog
        open={Boolean(cancelling)}
        title="Cancel this claim?"
        message={cancelling ? `${cancelling.key} (${cancelling.title}, ${formatMoney(cancelling.amount)}) is withdrawn and won't be reviewed. Submit a new claim if you need to.` : ""}
        confirmLabel="Cancel claim"
        pending={update.isPending}
        onConfirm={cancel}
        onCancel={() => setCancelling(null)}
      />
    </div>
  );
}
