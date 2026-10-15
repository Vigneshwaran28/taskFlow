"use client";
import { useState, type ReactNode } from "react";
import { useActionParam } from "@/lib/actionParam";
import { Palmtree, Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { formatDay, localDay } from "@/lib/format";
import { useLeaves, useUpdateLeave } from "../hooks/useAttendance";
import type { LeaveRequest } from "../services/attendanceService";
import { LeaveList } from "./LeaveList";
import { LeaveRequestDialog } from "./LeaveRequestDialog";

/** Feature component: the signed-in user's leave requests, with request and cancel. */
export function MyLeave() {
  const toast = useToast();
  const { data: leaves, isPending, error, refetch } = useLeaves({ scope: "mine" });
  const updateLeave = useUpdateLeave();
  const [dialogKey, setDialogKey] = useState(0);
  useActionParam("new", () => setDialogKey(Date.now()));
  const [cancelling, setCancelling] = useState<LeaveRequest | null>(null);
  const today = localDay();

  function cancel() {
    if (!cancelling) return;
    updateLeave.mutate(
      { id: cancelling.id, status: "cancelled" },
      {
        onSuccess: () => {
          toast.success("Leave request cancelled");
          setCancelling(null);
        },
        onError: err => toast.error("Couldn't cancel", err.message),
      }
    );
  }

  const newButton = (
    <Button onClick={() => setDialogKey(Date.now())}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      Request leave
    </Button>
  );

  let body: ReactNode;
  if (isPending) body = <LoadingState label="Loading leave…" />;
  else if (error) body = <ErrorState message="Unable to load your leave requests." onRetry={() => void refetch()} />;
  else if (!leaves.length) body = <EmptyState title="No leave requested" message="Plan time off and your admin approves it here." icon={Palmtree} action={newButton} />;
  else {
    body = (
      <LeaveList
        leaves={leaves}
        renderActions={leave =>
          (leave.status === "pending" || (leave.status === "approved" && leave.startDate > today)) && (
            <Button variant="ghost" size="sm" onClick={() => setCancelling(leave)} disabled={updateLeave.isPending}>
              Cancel request
            </Button>
          )
        }
      />
    );
  }

  return (
    <section aria-labelledby="my-leave-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="my-leave-heading" className="font-semibold">
          My leave
        </h2>
        {leaves && leaves.length > 0 && newButton}
      </div>
      {body}
      {dialogKey > 0 && <LeaveRequestDialog key={dialogKey} onClose={() => setDialogKey(0)} />}
      <ConfirmDialog
        open={Boolean(cancelling)}
        title="Cancel this leave request?"
        message={
          cancelling
            ? `${formatDay(cancelling.startDate)}${cancelling.endDate !== cancelling.startDate ? ` to ${formatDay(cancelling.endDate)}` : ""} will no longer be booked as leave. You can request it again later.`
            : ""
        }
        confirmLabel="Cancel request"
        pending={updateLeave.isPending}
        onConfirm={cancel}
        onCancel={() => setCancelling(null)}
      />
    </section>
  );
}
