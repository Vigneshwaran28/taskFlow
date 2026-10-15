"use client";
import { useState } from "react";
import { CheckCircle2, Inbox, XCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { useCurrentUser } from "@/features/auth";
import { useLeaves, useUpdateLeave } from "../hooks/useAttendance";
import type { LeaveRequest } from "../services/attendanceService";
import { LeaveList } from "./LeaveList";

/** Feature component (leave approvers): pending leave to approve or reject, then recent decisions. */
export function LeaveApprovals() {
  const toast = useToast();
  const { data: me } = useCurrentUser();
  const { data: leaves, isPending, error, refetch } = useLeaves({ scope: "all" });
  const updateLeave = useUpdateLeave();
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [rejecting, setRejecting] = useState<LeaveRequest | null>(null);

  if (isPending) return <LoadingState label="Loading leave requests…" />;
  if (error) return <ErrorState message="Unable to load leave requests." onRetry={() => void refetch()} />;

  const pending = leaves.filter(leave => leave.status === "pending");
  const decided = leaves.filter(leave => leave.status !== "pending").slice(0, 20);

  function decide(leave: LeaveRequest, status: "approved" | "rejected") {
    updateLeave.mutate(
      { id: leave.id, status, reviewNote: notes[leave.id]?.trim() || null },
      {
        onSuccess: () => {
          toast.success(status === "approved" ? `Approved for ${leave.user.name}` : `Rejected for ${leave.user.name}`, `${leave.user.name} has been notified.`);
          setRejecting(null);
          setNotes(current => {
            const next = { ...current };
            delete next[leave.id];
            return next;
          });
        },
        onError: err => toast.error("Couldn't save the decision", err.message),
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="pending-leave-heading" className="flex flex-col gap-3">
        <h2 id="pending-leave-heading" className="font-semibold">
          Waiting for a decision <span className="text-sm font-normal tabular-nums text-muted-foreground">({pending.length})</span>
        </h2>
        {pending.length ? (
          <LeaveList
            leaves={pending}
            showPerson
            renderActions={leave =>
              leave.user.id === me?.id ? (
                <p className="text-xs text-muted-foreground">Another admin decides your own leave.</p>
              ) : (
                <>
                  <label htmlFor={`leave-note-${leave.id}`} className="sr-only">
                    Note to {leave.user.name} (optional)
                  </label>
                  <input
                    id={`leave-note-${leave.id}`}
                    value={notes[leave.id] ?? ""}
                    onChange={event => setNotes(current => ({ ...current, [leave.id]: event.target.value }))}
                    maxLength={300}
                    placeholder="Note (optional)"
                    className="h-8 w-44 rounded-lg border border-input bg-card px-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button size="sm" onClick={() => decide(leave, "approved")} disabled={updateLeave.isPending}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Approve
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setRejecting(leave)} disabled={updateLeave.isPending}>
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    Reject
                  </Button>
                </>
              )
            }
          />
        ) : (
          <EmptyState title="Nothing to approve" message="New leave requests appear here, and you get a notification." icon={Inbox} />
        )}
      </section>
      {decided.length > 0 && (
        <section aria-labelledby="decided-leave-heading" className="flex flex-col gap-3">
          <h2 id="decided-leave-heading" className="font-semibold">
            Recent decisions
          </h2>
          <LeaveList leaves={decided} showPerson />
        </section>
      )}
      <ConfirmDialog
        open={Boolean(rejecting)}
        title="Reject this leave request?"
        message={rejecting ? `${rejecting.user.name} is notified that their ${rejecting.days}-day request was rejected${notes[rejecting.id]?.trim() ? ", with your note" : ""}. This can't be undone.` : ""}
        confirmLabel="Reject"
        pending={updateLeave.isPending}
        onConfirm={() => rejecting && decide(rejecting, "rejected")}
        onCancel={() => setRejecting(null)}
      />
    </div>
  );
}
