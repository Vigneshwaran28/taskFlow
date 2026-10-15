"use client";
import { useState, type ReactNode } from "react";
import { Plus, Receipt } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { useCan } from "@/features/auth";
import { useOrders } from "../hooks/useSales";
import type { OrderStatus } from "../services/salesService";
import { ORDER_STATUSES } from "../utils/salesMeta";
import { OrderDetailDialog } from "./OrderDetailDialog";
import { OrderEditorDialog } from "./OrderEditorDialog";

const FILTERS: { value: OrderStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  ...(Object.entries(ORDER_STATUSES) as [OrderStatus, { label: string }][]).map(([value, meta]) => ({ value, label: meta.label })),
];

/** Feature component: sales orders with a status filter, create, and open. */
export function OrdersPanel() {
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [page, setPage] = useState(1);
  const { data, isPending, isFetching, isPlaceholderData, error, refetch } = useOrders({ status: status || undefined, page });
  const [openId, setOpenId] = useState<number | null>(null);
  const [creatingKey, setCreatingKey] = useState(0);
  const canEdit = useCan("sales.edit");

  // Deleting the last order on the last page would leave an empty page: step back to the last one there is.
  if (data && !isPlaceholderData && page > data.totalPages) setPage(data.totalPages);

  let body: ReactNode;
  if (isPending) body = <LoadingState label="Loading orders…" />;
  else if (error) body = <ErrorState message="Unable to load orders." onRetry={() => void refetch()} />;
  else if (!data.items.length) {
    body = (
      <EmptyState
        title={status ? `No ${ORDER_STATUSES[status].label.toLowerCase()} orders` : "No orders yet"}
        message="Create an order, confirm it when the customer agrees, and mark it fulfilled when delivered."
        icon={Receipt}
      />
    );
  } else {
    body = (
      <div className="flex flex-col gap-2" aria-busy={isFetching}>
        <div className={cn("relative overflow-x-auto rounded-xl border bg-card", isPlaceholderData && "opacity-60")}>
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Sales orders</caption>
            <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2.5 font-semibold">Order</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Customer</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Lines</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Total</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map(order => {
                const meta = ORDER_STATUSES[order.status];
                return (
                  <tr key={order.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => setOpenId(order.id)} className="font-mono font-medium hover:underline focus-visible:underline focus-visible:outline-none">
                        {order.key}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">{order.customer?.company ?? order.customer?.name ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{order.itemCount}</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatMoney(order.total)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-muted-foreground">{formatDateTime(order.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} disabled={isFetching} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div role="radiogroup" aria-label="Order status" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {FILTERS.map(filter => (
            <button
              key={filter.value}
              type="button"
              role="radio"
              aria-checked={status === filter.value}
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                status === filter.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        {canEdit && (
          <Button variant="secondary" onClick={() => setCreatingKey(Date.now())}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New order
          </Button>
        )}
      </div>
      {body}
      {openId && <OrderDetailDialog key={openId} orderId={openId} onClose={() => setOpenId(null)} />}
      {creatingKey > 0 && <OrderEditorDialog key={creatingKey} onClose={() => setCreatingKey(0)} onSaved={saved => setOpenId(saved.id)} />}
    </div>
  );
}
