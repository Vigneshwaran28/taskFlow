"use client";
// /logistics/[shipmentId]: details, tracking history, the actions this person may take, and a printable label.
import Link from "@/components/navigation/Link";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/navigation";
import { useState, type ReactNode } from "react";
import { Copy, ExternalLink, MessageSquarePlus, PackageX, Pencil, Printer, RefreshCw, Trash2, UserCog } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useCan, useCurrentUser, useModuleSettings, useSiteTitle } from "@/features/auth";
import { ApiError } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import { formatDate, formatMoney } from "@/lib/format";
import { AssignDialog } from "../components/AssignDialog";
import { EventDialog } from "../components/EventDialog";
import { EventTimeline } from "../components/EventTimeline";
import { ShipmentFormDialog } from "../components/ShipmentFormDialog";
import { ShipmentStatusBadge } from "../components/ShipmentStatusBadge";
import { ShippingLabel } from "../components/ShippingLabel";
import { StatusDialog } from "../components/StatusDialog";
import { useDeleteShipment, useShipment } from "../hooks/useLogistics";
import type { ShipmentDetail } from "../services/logisticsService";
import { DIRECTIONS, SERVICES, SHIPMENT_STATUSES, trackingLink } from "../utils/logisticsMeta";

type DialogName = "status" | "event" | "assign" | "edit" | "delete";

export function ShipmentPage() {
  const params = useParams<{ shipmentId: string }>();
  const id = Number(params.shipmentId);
  const { data: shipment, isPending, error, refetch } = useShipment(id);

  if (!Number.isInteger(id) || id <= 0 || (error instanceof ApiError && error.status === 404)) {
    return (
      <EmptyState
        icon={PackageX}
        title="Shipment not found"
        message="It may have been deleted, or it isn't assigned to you."
        action={
          <Link href="/logistics" className="text-sm font-medium text-primary hover:underline">
            Back to logistics
          </Link>
        }
      />
    );
  }
  if (isPending) return <LoadingState label="Loading shipment…" />;
  if (error) return <ErrorState message="Unable to load this shipment." onRetry={() => void refetch()} />;
  return <ShipmentView shipment={shipment} />;
}

function ShipmentView({ shipment }: { shipment: ShipmentDetail }) {
  const router = useRouter();
  const toast = useToast();
  const company = useSiteTitle();
  const { data: user } = useCurrentUser();
  const settings = useModuleSettings("logistics");
  const canEdit = useCan("logistics.edit");
  const canDispatch = useCan("logistics.dispatch");
  const delivers = useCan("logistics.deliver");
  const remove = useDeleteShipment();
  const [dialog, setDialog] = useState<DialogName | null>(null);
  const close = () => setDialog(null);

  const final = SHIPMENT_STATUSES[shipment.status].final;
  const canAddNote = canEdit || canDispatch || (delivers && Boolean(user) && shipment.driver?.id === user?.id);
  const canDelete = canDispatch && (shipment.status === "pending" || shipment.status === "cancelled");
  const publicTracking = settings.publicTracking !== false;

  async function copyLink() {
    const link = trackingLink(shipment.trackingCode);
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Tracking link copied", link);
    } catch {
      toast.error("Couldn't copy the link", link);
    }
  }

  function confirmDelete() {
    remove.mutate(shipment.id, {
      onSuccess: () => {
        toast.success(`${shipment.number} deleted`);
        router.replace("/logistics?tab=shipments");
      },
      onError: err => {
        toast.error("Couldn't delete the shipment", err.message);
        close();
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-semibold tracking-tight">{shipment.number}</h1>
              <ShipmentStatusBadge status={shipment.status} className="px-3 py-1 text-sm" />
              {shipment.isOverdue && <Badge tone="danger">Overdue</Badge>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span>
                <span className="text-muted-foreground">Tracking code </span>
                <span className="font-mono font-semibold tracking-wider">{shipment.trackingCode}</span>
              </span>
              {publicTracking && (
                <Button variant="secondary" size="sm" onClick={() => void copyLink()}>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copy tracking link
                </Button>
              )}
              {shipment.trackingUrl && (
                <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  Track on {shipment.carrier?.name ?? "carrier"} site
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {shipment.allowedStatuses.length > 0 && (
              <Button onClick={() => setDialog("status")}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Update status
              </Button>
            )}
            {canAddNote && (
              <Button variant="secondary" onClick={() => setDialog("event")}>
                <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                Add tracking note
              </Button>
            )}
            {canDispatch && !final && (
              <Button variant="secondary" onClick={() => setDialog("assign")}>
                <UserCog className="h-4 w-4" aria-hidden="true" />
                Assign
              </Button>
            )}
            {canEdit && !final && (
              <Button variant="secondary" onClick={() => setDialog("edit")}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
            )}
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print label
            </Button>
            {canDelete && (
              <Button variant="ghost" onClick={() => setDialog("delete")} aria-label={`Delete ${shipment.number}`}>
                <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="no-print grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card title="Details">
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <Field label="Recipient">
                <p className="font-medium">{shipment.recipientName ?? "—"}</p>
                {shipment.recipientPhone && (
                  <a href={`tel:${shipment.recipientPhone.replace(/[^\d+]/g, "")}`} className="text-primary hover:underline">
                    {shipment.recipientPhone}
                  </a>
                )}
                {shipment.recipientAddress && <p className="whitespace-pre-line text-muted-foreground">{shipment.recipientAddress}</p>}
              </Field>
              <Field label="Sender">
                <p className="font-medium">{shipment.senderName || "—"}</p>
                {shipment.senderAddress && <p className="whitespace-pre-line text-muted-foreground">{shipment.senderAddress}</p>}
              </Field>
              <Field label="Route">
                {shipment.originCity || "—"} <span aria-hidden="true">→</span>
                <span className="sr-only">to</span> {shipment.destinationCity || "—"}
              </Field>
              <Field label="Direction and service">
                {DIRECTIONS[shipment.direction].label} · {SERVICES[shipment.service].label}
              </Field>
              <Field label="Packages and weight">
                {shipment.packages} package{shipment.packages === 1 ? "" : "s"}
                {shipment.weightKg ? ` · ${shipment.weightKg} kg` : ""}
              </Field>
              <Field label="Values">
                <span className="block">Declared {shipment.declaredValue != null ? formatMoney(shipment.declaredValue) : "—"}</span>
                <span className="block">Shipping cost {shipment.shippingCost != null ? formatMoney(shipment.shippingCost) : "—"}</span>
              </Field>
              <Field label="Cash on delivery">{shipment.codAmount ? <span className="font-semibold">{formatMoney(shipment.codAmount)}</span> : "None"}</Field>
              <Field label="Dates">
                <span className="block">Ship date {shipment.shipDate ? formatDate(shipment.shipDate) : "—"}</span>
                <span className={cn("block", shipment.isOverdue && "font-medium text-destructive")}>Expected {shipment.expectedOn ? formatDate(shipment.expectedOn) : "—"}</span>
                {shipment.deliveredAt && <span className="block">Delivered {formatDateTime(shipment.deliveredAt)}</span>}
              </Field>
              {shipment.receivedBy && <Field label="Received by">{shipment.receivedBy}</Field>}
              {shipment.order && (
                <Field label="Sales order">
                  <Link href="/sales?tab=orders" className="font-mono text-primary hover:underline">
                    {shipment.order.number}
                  </Link>
                  <span className="text-muted-foreground">
                    {" "}
                    · {shipment.order.status} · {formatMoney(shipment.order.total)}
                  </span>
                </Field>
              )}
              {shipment.customer && (
                <Field label="Customer">
                  <p className="font-medium">{shipment.customer.company || shipment.customer.name}</p>
                  {shipment.customer.company && <p className="text-muted-foreground">{shipment.customer.name}</p>}
                  {shipment.customer.email && (
                    <a href={`mailto:${shipment.customer.email}`} className="text-primary hover:underline">
                      {shipment.customer.email}
                    </a>
                  )}
                </Field>
              )}
            </dl>
            {shipment.notes && (
              <div className="mt-4 border-t pt-4 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-line">{shipment.notes}</p>
              </div>
            )}
          </Card>
          <Card title="Tracking history">
            <EventTimeline events={shipment.events} label={`Tracking history of ${shipment.number}`} />
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Assignment">
            <dl className="flex flex-col gap-3 text-sm">
              <Field label="Carrier">
                {shipment.carrier?.name ?? "Own fleet"}
                {shipment.carrierReference && <span className="block font-mono text-xs text-muted-foreground">Ref. {shipment.carrierReference}</span>}
              </Field>
              <Field label="Driver">{shipment.driver?.name ?? <span className="text-muted-foreground">Unassigned</span>}</Field>
              <Field label="Vehicle">{shipment.vehicle ? <span className="font-mono">{shipment.vehicle.registration}</span> : <span className="text-muted-foreground">None</span>}</Field>
              <Field label="Booked">
                {formatDateTime(shipment.createdAt)}
                {shipment.createdBy && <span className="block text-muted-foreground">by {shipment.createdBy.name}</span>}
              </Field>
            </dl>
          </Card>
        </div>
      </div>

      <div className="hidden print:block">
        <ShippingLabel shipment={shipment} company={company} />
      </div>
      <details className="no-print rounded-xl border bg-card p-4">
        <summary className="cursor-pointer text-sm font-medium">Preview delivery note</summary>
        <div className="mt-4">
          <ShippingLabel shipment={shipment} company={company} />
        </div>
      </details>

      {dialog === "status" && <StatusDialog shipment={shipment} allowed={shipment.allowedStatuses} onClose={close} />}
      {dialog === "event" && <EventDialog shipment={shipment} onClose={close} />}
      {dialog === "assign" && <AssignDialog shipment={shipment} onClose={close} />}
      {dialog === "edit" && <ShipmentFormDialog shipment={shipment} onClose={close} />}
      <ConfirmDialog
        open={dialog === "delete"}
        title={`Delete ${shipment.number}?`}
        message="The shipment and its tracking history are removed for good, and its tracking link stops working."
        pending={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={close}
      />
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
