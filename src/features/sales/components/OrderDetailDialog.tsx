"use client";
import { useState, type ReactNode } from "react";
import { useRouter } from "@/lib/navigation";
import { CheckCircle2, FileText, PackageCheck, Pencil, Trash2, XCircle } from "lucide-react";
import { canOpenModule } from "@/app-shell/modules";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ApiError } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/dates";
import { formatInteger, formatMoney } from "@/lib/format";
import { useCan, useCurrentUser, useHasFeature } from "@/features/auth";
import { useCreateInvoiceFromOrder, useDeleteOrder, useOrder, useUpdateOrder } from "../hooks/useSales";
import type { OrderStatus } from "../services/salesService";
import { ORDER_STATUSES } from "../utils/salesMeta";
import { OrderEditorDialog } from "./OrderEditorDialog";

type ConfirmAction = "confirmed" | "cancelled" | "delete";

const CONFIRMS: Record<ConfirmAction, { title: string; label: string }> = {
  confirmed: { title: "Confirm this order?", label: "Confirm order" },
  cancelled: { title: "Cancel this order?", label: "Cancel order" },
  delete: { title: "Delete this draft?", label: "Delete draft" },
};

/** Feature component: one order with its lines and the next steps for its status. */
export function OrderDetailDialog({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const hasInventory = useHasFeature("inventory");
  const canEdit = useCan("sales.edit");
  const canChangeStatus = useCan("sales.orders.confirm");
  // POST /billing/from-order needs billing.edit, not just access to the billing module.
  const canEditBilling = useCan("billing.edit");
  const canInvoice = canOpenModule(user, "billing") && canEditBilling;
  const { data: order, isPending, error, refetch } = useOrder(orderId);
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();
  const createInvoice = useCreateInvoiceFromOrder();
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [editing, setEditing] = useState(false);
  const pending = updateOrder.isPending || deleteOrder.isPending || createInvoice.isPending;

  function setStatus(status: OrderStatus) {
    updateOrder.mutate(
      { id: orderId, changes: { status } },
      {
        onSuccess: saved => {
          setConfirm(null);
          toast.success(`${saved.key} ${ORDER_STATUSES[status].label.toLowerCase()}`);
        },
        onError: err => {
          setConfirm(null);
          toast.error("Order not updated", err.message);
        },
      }
    );
  }

  function handleDelete() {
    deleteOrder.mutate(orderId, {
      onSuccess: () => {
        toast.success("Draft deleted");
        onClose();
      },
      onError: err => {
        setConfirm(null);
        toast.error("Couldn't delete the draft", err.message);
      },
    });
  }

  function handleCreateInvoice() {
    createInvoice.mutate(orderId, {
      onSuccess: invoice => {
        toast.success("Draft invoice created", order ? `From ${order.key}.` : undefined);
        onClose();
        router.push(`/billing/${invoice.id}`);
      },
      onError: err => {
        // ALREADY_INVOICED carries a user-facing message naming the existing invoice.
        if (err instanceof ApiError && err.code === "ALREADY_INVOICED") toast.error("Already invoiced", err.message);
        else toast.error("Couldn't create the invoice", err.message);
      },
    });
  }

  const stockLines = order?.items?.filter(item => item.productId).length ?? 0;
  const confirmMessage: Record<ConfirmAction, string> = {
    confirmed: hasInventory && stockLines ? `This takes ${stockLines} product line${stockLines === 1 ? "" : "s"} out of stock and locks the order for editing.` : "This locks the order for editing.",
    cancelled:
      order?.status === "confirmed" && hasInventory && stockLines ? "The stock taken by this order goes back into inventory. A cancelled order can't be reopened." : "A cancelled order can't be reopened.",
    delete: "The draft and its lines are removed.",
  };

  let body: ReactNode;
  if (isPending) body = <LoadingState label="Loading order…" />;
  else if (error) body = <ErrorState message="Unable to load this order." onRetry={() => void refetch()} />;
  else {
    const status = ORDER_STATUSES[order.status];
    const stamps: [string, string | null][] = [
      ["Confirmed", order.confirmedAt],
      ["Fulfilled", order.fulfilledAt],
      ["Cancelled", order.cancelledAt],
    ];
    body = (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge tone={status.tone}>{status.label}</Badge>
          <span>{order.customer ? (order.customer.company ? `${order.customer.name} · ${order.customer.company}` : order.customer.name) : "No customer"}</span>
          <span aria-hidden="true">·</span>
          <span>Created {formatDateTime(order.createdAt)}</span>
        </div>
        <div className="relative overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Order lines</caption>
            <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Item</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Qty</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Unit price</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(order.items ?? []).map((item, index) => (
                <tr key={item.id ?? index}>
                  <td className="px-3 py-2">
                    {item.description}
                    {item.sku && <span className="block font-mono text-xs text-muted-foreground">{item.sku}</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatInteger(item.quantity)} {item.unit ?? ""}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(item.unitPrice)}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{formatMoney(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t">
              <tr>
                <th scope="row" colSpan={3} className="px-3 py-2 text-right font-semibold">
                  Order total
                </th>
                <td className="px-3 py-2 text-right text-base font-semibold tabular-nums">{formatMoney(order.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {order.notes && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{order.notes}</p>}
        <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
          {stamps
            .filter(([, at]) => at)
            .map(([label, at]) => (
              <div key={label}>
                <dt className="inline">{label}: </dt>
                <dd className="inline tabular-nums">{formatDateTime(at)}</dd>
              </div>
            ))}
        </dl>
      </div>
    );
  }

  const invoiceButton = order && canInvoice && (order.status === "confirmed" || order.status === "fulfilled") && (
    <Button variant="secondary" onClick={handleCreateInvoice} loading={createInvoice.isPending} disabled={pending}>
      <FileText className="h-4 w-4" aria-hidden="true" />
      Create invoice
    </Button>
  );

  const footer = order && (
    <>
      {order.status === "draft" && (
        <>
          {canEdit && (
            <>
              <Button variant="ghost" className="mr-auto text-destructive hover:bg-destructive/10" onClick={() => setConfirm("delete")} disabled={pending}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
              <Button variant="secondary" onClick={() => setEditing(true)} disabled={pending}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
            </>
          )}
          {canChangeStatus && (
            <Button variant="ghost" className={canEdit ? undefined : "mr-auto text-destructive hover:bg-destructive/10"} onClick={() => setConfirm("cancelled")} disabled={pending}>
              <XCircle className="h-4 w-4" aria-hidden="true" />
              Cancel order
            </Button>
          )}
          {canChangeStatus && (
            <Button onClick={() => setConfirm("confirmed")} disabled={pending}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Confirm
            </Button>
          )}
          {!canEdit && !canChangeStatus && (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          )}
        </>
      )}
      {order.status === "confirmed" && (
        <>
          {canChangeStatus && (
            <Button variant="ghost" className="mr-auto text-destructive hover:bg-destructive/10" onClick={() => setConfirm("cancelled")} disabled={pending}>
              <XCircle className="h-4 w-4" aria-hidden="true" />
              Cancel order
            </Button>
          )}
          {invoiceButton}
          {canChangeStatus ? (
            <Button onClick={() => setStatus("fulfilled")} loading={updateOrder.isPending} disabled={pending}>
              <PackageCheck className="h-4 w-4" aria-hidden="true" />
              Mark fulfilled
            </Button>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          )}
        </>
      )}
      {(order.status === "fulfilled" || order.status === "cancelled") && (
        <>
          {invoiceButton}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </>
      )}
    </>
  );

  return (
    <>
      <Dialog open={!confirm && !editing} onClose={onClose} size="lg" title={order ? order.key : "Order"} footer={footer || undefined}>
        {body}
      </Dialog>
      {confirm && (
        <ConfirmDialog
          open
          title={CONFIRMS[confirm].title}
          message={confirmMessage[confirm]}
          confirmLabel={CONFIRMS[confirm].label}
          tone={confirm === "confirmed" ? "primary" : "danger"}
          pending={pending}
          onConfirm={() => (confirm === "delete" ? handleDelete() : setStatus(confirm))}
          onCancel={() => setConfirm(null)}
        />
      )}
      {editing && order && <OrderEditorDialog order={order} onClose={() => setEditing(false)} />}
    </>
  );
}
