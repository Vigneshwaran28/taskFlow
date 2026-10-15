"use client";
import { useState } from "react";
import { Receipt } from "lucide-react";
import { EmptyState, ErrorState, FormAlert, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { useModuleSettings } from "@/features/auth";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney } from "@/lib/format";
import { useInvoiceableOrders, useInvoiceFromOrder } from "../hooks/useBilling";
import type { BillingDocumentDetail } from "../services/billingService";

export interface FromOrderDialogProps {
  onClose: () => void;
  onCreated: (doc: BillingDocumentDetail) => void;
}

/** Feature component: pick a confirmed or fulfilled sales order and draft an invoice from it. */
export function FromOrderDialog({ onClose, onCreated }: FromOrderDialogProps) {
  const toast = useToast();
  const settings = useModuleSettings("billing");
  const taxLabel = settings.taxLabel || "Tax";
  const { data: orders, isPending, error, refetch } = useInvoiceableOrders();
  const fromOrder = useInvoiceFromOrder();
  const [selected, setSelected] = useState<number | null>(null);
  const [taxRate, setTaxRate] = useState(String(settings.defaultTaxRate ?? 0));
  const [taxError, setTaxError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  function create() {
    if (fromOrder.isPending) return;
    const rate = Number(taxRate);
    const badRate = taxRate.trim() === "" || Number.isNaN(rate) || rate < 0 || rate > 100;
    setOrderError(selected ? null : "Pick the sales order to invoice.");
    setTaxError(badRate ? "Use a rate from 0 to 100." : null);
    if (!selected || badRate) return;
    fromOrder.mutate(
      { orderId: selected, taxRate: rate },
      {
        onSuccess: doc => {
          toast.success(`${doc.number} drafted from ${doc.order?.key ?? "the order"}`, "Review it, then issue it.");
          onCreated(doc);
        },
      }
    );
  }

  let body;
  if (isPending) body = <LoadingState label="Loading sales orders…" className="py-10" />;
  else if (error) body = <ErrorState message="Unable to load sales orders." onRetry={() => void refetch()} />;
  else if (!orders?.length) body = <EmptyState title="No orders to invoice" message="Confirmed and fulfilled sales orders appear here." icon={Receipt} />;
  else {
    body = (
      <div role="radiogroup" aria-label="Sales order" className="max-h-80 divide-y overflow-y-auto rounded-lg border">
        {orders.map(order => (
          <button
            key={order.id}
            type="button"
            role="radio"
            aria-checked={selected === order.id}
            onClick={() => {
              setSelected(order.id);
              setOrderError(null);
              fromOrder.reset();
            }}
            className={cn(
              "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              selected === order.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
            )}
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="font-mono font-medium">{order.key}</span>
                <Badge tone={order.status === "fulfilled" ? "success" : "primary"}>{order.status === "fulfilled" ? "Fulfilled" : "Confirmed"}</Badge>
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {order.customer?.company ?? order.customer?.name ?? "No customer"} · {order.itemCount} line{order.itemCount === 1 ? "" : "s"} · {formatDate(order.confirmedAt ?? order.createdAt)}
              </span>
            </span>
            <span className="font-medium tabular-nums">{formatMoney(order.total)}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title="Invoice a sales order"
      description="Creates a draft invoice with the order's lines. Each order can be invoiced once."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={create} loading={fromOrder.isPending}>
            Create draft invoice
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormAlert message={formErrorOf(fromOrder.error)} />
        {orderError && (
          <p role="alert" className="text-sm text-destructive">
            {orderError}
          </p>
        )}
        {body}
        <TextField
          label={`${taxLabel} rate (%)`}
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          step="any"
          className="sm:max-w-[12rem]"
          hint="Applied to every line."
          value={taxRate}
          error={taxError || fieldErrorsOf(fromOrder.error).taxRate}
          onChange={event => {
            setTaxRate(event.target.value);
            setTaxError(null);
            if (fromOrder.error) fromOrder.reset();
          }}
        />
      </div>
    </Dialog>
  );
}
