"use client";
// My deliveries: a driver's open shipments as big, phone-friendly cards with one-tap status updates.
import Link from "@/components/navigation/Link";
import { useState } from "react";
import { Banknote, MapPin, Package, Phone, Truck } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { useCan } from "@/features/auth";
import { cn } from "@/lib/cn";
import { formatDay, formatMoney } from "@/lib/format";
import { useSetShipmentStatus, useShipments } from "../hooks/useLogistics";
import type { Shipment, ShipmentStatus } from "../services/logisticsService";
import { SHIPMENT_STATUSES, nextStatuses } from "../utils/logisticsMeta";
import { ShipmentStatusBadge } from "./ShipmentStatusBadge";
import { StatusDialog } from "./StatusDialog";

/** Shipments still on the driver's round; finished ones fold away below. */
const ACTIVE_STATUSES: ShipmentStatus[] = ["pending", "picked_up", "in_transit", "out_for_delivery", "failed"];
const ONE_TAP: ShipmentStatus[] = ["picked_up", "in_transit", "out_for_delivery"];

export function MyDeliveriesPanel() {
  const [page, setPage] = useState(1);
  const { data, isPending, isFetching, error, refetch } = useShipments({ mine: true, page, pageSize: 50 });
  const dispatcher = useCan("logistics.dispatch");
  const [dialog, setDialog] = useState<{ shipment: Shipment; status: ShipmentStatus } | null>(null);

  if (isPending) return <LoadingState label="Loading your deliveries…" />;
  if (error) return <ErrorState message="Unable to load your deliveries." onRetry={() => void refetch()} />;

  const open = data.items.filter(shipment => ACTIVE_STATUSES.includes(shipment.status));
  const done = data.items.filter(shipment => !ACTIVE_STATUSES.includes(shipment.status));

  return (
    <div className="flex flex-col gap-4" aria-busy={isFetching}>
      {open.length === 0 ? (
        <EmptyState icon={Truck} title="No deliveries assigned to you" message="New assignments show up here and in your notifications." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Open deliveries">
          {open.map(shipment => (
            <li key={shipment.id}>
              <DeliveryCard shipment={shipment} allowed={nextStatuses(shipment.status, { dispatcher })} onChoose={status => setDialog({ shipment, status })} />
            </li>
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <details className="rounded-xl border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium">Finished ({done.length})</summary>
          <ul className="mt-3 divide-y text-sm">
            {done.map(shipment => (
              <li key={shipment.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/logistics/${shipment.id}`} className="font-mono font-medium text-primary hover:underline">
                  {shipment.number}
                </Link>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{shipment.recipientName}</span>
                <ShipmentStatusBadge status={shipment.status} />
              </li>
            ))}
          </ul>
        </details>
      )}
      <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} disabled={isFetching} />
      {dialog && (
        <StatusDialog
          key={`${dialog.shipment.id}-${dialog.status}`}
          shipment={dialog.shipment}
          allowed={[dialog.status]}
          initialStatus={dialog.status}
          compact
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function DeliveryCard({ shipment, allowed, onChoose }: { shipment: Shipment; allowed: ShipmentStatus[]; onChoose: (status: ShipmentStatus) => void }) {
  const toast = useToast();
  const mutation = useSetShipmentStatus();

  function choose(status: ShipmentStatus) {
    // Moving along the route is one tap; delivered, failed, cancelled, and returned ask for details.
    if (!ONE_TAP.includes(status)) return onChoose(status);
    mutation.mutate(
      { id: shipment.id, input: { status } },
      {
        onSuccess: () => toast.success(`${shipment.number} marked ${SHIPMENT_STATUSES[status].label.toLowerCase()}`),
        onError: error => toast.error("Couldn't update the status", error.message),
      }
    );
  }

  return (
    <article aria-labelledby={`delivery-${shipment.id}`} className={cn("flex h-full flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm", shipment.isOverdue && "border-destructive/50")}>
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`delivery-${shipment.id}`} className="truncate text-base font-semibold">
            {shipment.recipientName ?? "Recipient"}
          </h3>
          <Link href={`/logistics/${shipment.id}`} className="font-mono text-xs text-primary hover:underline">
            {shipment.number}
          </Link>
        </div>
        <ShipmentStatusBadge status={shipment.status} />
      </header>
      <dl className="flex flex-col gap-2 text-sm">
        {shipment.recipientPhone && (
          <div className="flex items-center gap-2">
            <dt>
              <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Phone</span>
            </dt>
            <dd>
              <a href={`tel:${shipment.recipientPhone.replace(/[^\d+]/g, "")}`} className="font-medium text-primary underline-offset-4 hover:underline">
                {shipment.recipientPhone}
              </a>
            </dd>
          </div>
        )}
        <div className="flex items-start gap-2">
          <dt>
            <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Address</span>
          </dt>
          <dd className="whitespace-pre-line">
            {shipment.recipientAddress ?? "—"}
            {shipment.destinationCity && <span className="block text-muted-foreground">{shipment.destinationCity}</span>}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt>
            <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Packages</span>
          </dt>
          <dd>
            {shipment.packages} package{shipment.packages === 1 ? "" : "s"}
            {shipment.weightKg ? ` · ${shipment.weightKg} kg` : ""}
            {shipment.expectedOn && <span className={cn("ml-2", shipment.isOverdue ? "font-medium text-destructive" : "text-muted-foreground")}>· due {formatDay(shipment.expectedOn)}</span>}
          </dd>
        </div>
        {shipment.codAmount ? (
          <div className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
            <dt>
              <Banknote className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Cash on delivery</span>
            </dt>
            <dd className="font-semibold">Collect {formatMoney(shipment.codAmount)}</dd>
          </div>
        ) : null}
      </dl>
      {allowed.length > 0 && (
        <div className="mt-auto grid gap-2 pt-1 sm:grid-cols-2">
          {allowed.map(status => (
            <Button
              key={status}
              size="lg"
              variant={status === "failed" || status === "cancelled" || status === "returned" ? "secondary" : "primary"}
              className={cn("w-full", allowed.length === 1 && "sm:col-span-2")}
              onClick={() => choose(status)}
              loading={mutation.isPending && mutation.variables?.input.status === status}
              disabled={mutation.isPending}
            >
              {SHIPMENT_STATUSES[status].label}
            </Button>
          ))}
        </div>
      )}
    </article>
  );
}
