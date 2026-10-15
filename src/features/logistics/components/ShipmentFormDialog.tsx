"use client";
// Book a shipment, or edit one that's still on its way. Assignment fields appear only for dispatchers.
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { canOpenModule } from "@/app-shell/modules";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { useCan, useCurrentUser } from "@/features/auth";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { formatMoney } from "@/lib/format";
import { useCreateShipment, useSalesOrderOptions, useUpdateShipment } from "../hooks/useLogistics";
import type { ShipmentDetail, ShipmentDirection, ShipmentInput, ShipmentService } from "../services/logisticsService";
import { DIRECTIONS, SERVICES, idOrNull, numberOrNull, textOrNull, toOptions } from "../utils/logisticsMeta";
import { validateShipment, without, type Errors } from "../utils/validateLogistics";
import { AssignmentFields, type AssignmentValues } from "./AssignmentFields";

interface FormValues extends AssignmentValues {
  direction: ShipmentDirection;
  service: ShipmentService;
  orderId: string;
  senderName: string;
  senderAddress: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  originCity: string;
  destinationCity: string;
  packages: string;
  weightKg: string;
  declaredValue: string;
  shippingCost: string;
  codAmount: string;
  shipDate: string;
  expectedOn: string;
  notes: string;
}

const str = (value: string | number | null | undefined) => (value === null || value === undefined ? "" : String(value));

function initialValues(shipment?: ShipmentDetail): FormValues {
  return {
    direction: shipment?.direction ?? "outbound",
    service: shipment?.service ?? "standard",
    orderId: str(shipment?.orderId),
    carrierId: str(shipment?.carrier?.id),
    carrierReference: str(shipment?.carrierReference),
    vehicleId: str(shipment?.vehicle?.id),
    driverId: str(shipment?.driver?.id),
    senderName: str(shipment?.senderName),
    senderAddress: str(shipment?.senderAddress),
    recipientName: str(shipment?.recipientName),
    recipientPhone: str(shipment?.recipientPhone),
    recipientAddress: str(shipment?.recipientAddress),
    originCity: str(shipment?.originCity),
    destinationCity: str(shipment?.destinationCity),
    packages: str(shipment?.packages ?? 1),
    weightKg: str(shipment?.weightKg),
    declaredValue: str(shipment?.declaredValue),
    shippingCost: str(shipment?.shippingCost),
    codAmount: str(shipment?.codAmount),
    shipDate: str(shipment?.shipDate),
    expectedOn: str(shipment?.expectedOn),
    notes: str(shipment?.notes),
  };
}

export interface ShipmentFormDialogProps {
  /** Edit this shipment; books a new one when absent */
  shipment?: ShipmentDetail;
  onClose: () => void;
  onSaved?: (shipment: ShipmentDetail) => void;
}

export function ShipmentFormDialog({ shipment, onClose, onSaved }: ShipmentFormDialogProps) {
  const toast = useToast();
  const formId = useId();
  const { data: user } = useCurrentUser();
  const canDispatch = useCan("logistics.dispatch");
  const salesEnabled = canOpenModule(user, "sales");
  const orders = useSalesOrderOptions(salesEnabled);
  const create = useCreateShipment();
  const update = useUpdateShipment();
  const mutation = shipment ? update : create;
  const [values, setValues] = useState<FormValues>(() => initialValues(shipment));
  const [localErrors, setLocalErrors] = useState<Errors>({});
  const [editedFields, setEditedFields] = useState<string[]>([]);
  // Server errors stay until the field is edited; client checks win over them.
  const errors: Errors = { ...without(fieldErrorsOf(mutation.error), editedFields), ...localErrors };
  const set = (patch: Partial<FormValues>) => {
    const keys = Object.keys(patch);
    // Changing the ship date can fix (or cause) the expected-date error.
    if (keys.includes("shipDate")) keys.push("expectedOn");
    if (keys.includes("orderId")) keys.push("recipientName", "recipientAddress");
    setValues(current => ({ ...current, ...patch }));
    setLocalErrors(current => without(current, keys));
    setEditedFields(current => [...new Set([...current, ...keys])]);
  };
  const linkedOrder = Boolean(values.orderId);

  function submit(event: FormEvent) {
    event.preventDefault();
    const found = validateShipment(values);
    setLocalErrors(found);
    if (Object.keys(found).length) return;
    setEditedFields([]);
    const input: ShipmentInput = {
      direction: values.direction,
      service: values.service,
      ...(salesEnabled || !shipment ? { orderId: idOrNull(values.orderId) } : {}),
      senderName: textOrNull(values.senderName),
      senderAddress: textOrNull(values.senderAddress),
      recipientName: textOrNull(values.recipientName),
      recipientPhone: textOrNull(values.recipientPhone),
      recipientAddress: textOrNull(values.recipientAddress),
      originCity: textOrNull(values.originCity),
      destinationCity: textOrNull(values.destinationCity),
      packages: numberOrNull(values.packages) ?? 1,
      weightKg: numberOrNull(values.weightKg),
      declaredValue: numberOrNull(values.declaredValue),
      shippingCost: numberOrNull(values.shippingCost),
      codAmount: numberOrNull(values.codAmount),
      shipDate: values.shipDate || null,
      expectedOn: values.expectedOn || null,
      notes: textOrNull(values.notes),
    };
    if (canDispatch) {
      Object.assign(input, {
        carrierId: idOrNull(values.carrierId),
        carrierReference: textOrNull(values.carrierReference),
        vehicleId: idOrNull(values.vehicleId),
        driverId: idOrNull(values.driverId),
      });
    }
    const options = {
      onSuccess: (saved: ShipmentDetail) => {
        toast.success(shipment ? `${saved.number} updated` : `${saved.number} booked`, shipment ? undefined : `Tracking code ${saved.trackingCode}`);
        onSaved?.(saved);
        onClose();
      },
    };
    if (shipment) update.mutate({ id: shipment.id, input }, options);
    else create.mutate(input, options);
  }

  const orderOptions = [
    { value: "", label: orders.isPending && salesEnabled ? "Loading orders…" : "No sales order" },
    ...(orders.data?.items ?? [])
      .filter(order => order.status !== "cancelled" || String(order.id) === values.orderId)
      .map(order => ({
        value: String(order.id),
        label: `${order.key} · ${order.customer?.company || order.customer?.name || "No customer"} · ${formatMoney(order.total)}`,
      })),
  ];
  if (values.orderId && !orderOptions.some(option => option.value === values.orderId)) {
    orderOptions.push({ value: values.orderId, label: shipment?.order?.number ?? `Order #${values.orderId}` });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title={shipment ? `Edit ${shipment.number}` : "Book shipment"}
      description={shipment ? undefined : "The shipment starts as pending and gets a public tracking code."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={mutation.isPending}>
            {shipment ? "Save changes" : "Book shipment"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-6" noValidate>
        <FormAlert message={formErrorOf(mutation.error)} />

        <Section title="Shipment">
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              label="Direction"
              value={values.direction}
              onChange={event => set({ direction: event.target.value as ShipmentDirection })}
              options={toOptions(DIRECTIONS)}
              error={errors.direction}
            />
            <SelectField
              label="Service"
              value={values.service}
              onChange={event => set({ service: event.target.value as ShipmentService })}
              options={toOptions(SERVICES)}
              error={errors.service}
            />
            {salesEnabled && (
              <SelectField
                label="Sales order"
                value={values.orderId}
                onChange={event => set({ orderId: event.target.value })}
                options={orderOptions}
                hint="Optional. Empty recipient details are taken from the order's customer."
                error={errors.orderId}
              />
            )}
          </div>
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Sender">
            <TextField label="Name" value={values.senderName} onChange={event => set({ senderName: event.target.value })} maxLength={160} error={errors.senderName} />
            <TextAreaField label="Address" rows={2} value={values.senderAddress} onChange={event => set({ senderAddress: event.target.value })} maxLength={500} error={errors.senderAddress} />
            <TextField label="Origin city" value={values.originCity} onChange={event => set({ originCity: event.target.value })} maxLength={80} error={errors.originCity} />
          </Section>
          <Section title="Recipient">
            <TextField
              label="Name"
              required={!linkedOrder}
              value={values.recipientName}
              onChange={event => set({ recipientName: event.target.value })}
              maxLength={160}
              autoComplete="off"
              error={errors.recipientName}
            />
            <TextField
              label="Phone"
              type="tel"
              value={values.recipientPhone}
              onChange={event => set({ recipientPhone: event.target.value })}
              maxLength={40}
              autoComplete="off"
              error={errors.recipientPhone}
            />
            <TextAreaField
              label="Address"
              required={!linkedOrder}
              rows={2}
              value={values.recipientAddress}
              onChange={event => set({ recipientAddress: event.target.value })}
              maxLength={500}
              error={errors.recipientAddress}
            />
            <TextField label="Destination city" value={values.destinationCity} onChange={event => set({ destinationCity: event.target.value })} maxLength={80} error={errors.destinationCity} />
          </Section>
        </div>

        <Section title="Contents and charges">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Packages" type="number" inputMode="numeric" required min={1} max={10000} step={1} value={values.packages} onChange={event => set({ packages: event.target.value })} error={errors.packages} />
            <TextField label="Weight (kg)" type="number" inputMode="decimal" min={0.01} step="0.01" value={values.weightKg} onChange={event => set({ weightKg: event.target.value })} error={errors.weightKg} />
            <TextField
              label="Declared value"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={values.declaredValue}
              onChange={event => set({ declaredValue: event.target.value })}
              error={errors.declaredValue}
            />
            <TextField
              label="Shipping cost"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={values.shippingCost}
              onChange={event => set({ shippingCost: event.target.value })}
              error={errors.shippingCost}
            />
            <TextField
              label="Cash on delivery"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={values.codAmount}
              onChange={event => set({ codAmount: event.target.value })}
              hint="Amount the driver collects."
              error={errors.codAmount}
            />
          </div>
        </Section>

        <Section title="Dates">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Ship date" type="date" value={values.shipDate} onChange={event => set({ shipDate: event.target.value })} error={errors.shipDate} />
            <TextField
              label="Expected delivery"
              type="date"
              min={values.shipDate || undefined}
              value={values.expectedOn}
              onChange={event => set({ expectedOn: event.target.value })}
              error={errors.expectedOn}
            />
          </div>
        </Section>

        {canDispatch && (
          <Section title="Assignment">
            <AssignmentFields values={values} onChange={set} errors={errors} current={shipment ? { carrier: shipment.carrier, vehicle: shipment.vehicle, driver: shipment.driver } : {}} />
          </Section>
        )}

        <TextAreaField label="Notes" rows={3} value={values.notes} onChange={event => set({ notes: event.target.value })} maxLength={5000} hint="Internal: not shown on public tracking." error={errors.notes} />
      </form>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}
