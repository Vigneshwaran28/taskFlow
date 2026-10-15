// Display metadata for shipments and the fleet. Complete class names only (Tailwind scans them).
import type { Tone } from "@/components/ui/Badge";
import type { SelectOption } from "@/components/ui/SelectField";
import type { ShipmentDirection, ShipmentService, ShipmentStatus, VehicleStatus, VehicleType } from "../services/logisticsService";

interface Meta {
  label: string;
  tone: Tone;
}

export const SHIPMENT_STATUSES: Readonly<Record<ShipmentStatus, Meta & { final: boolean; bar: string }>> = Object.freeze({
  pending: { label: "Pending", tone: "neutral", final: false, bar: "bg-slate-400 dark:bg-slate-500" },
  picked_up: { label: "Picked up", tone: "info", final: false, bar: "bg-sky-400" },
  in_transit: { label: "In transit", tone: "primary", final: false, bar: "bg-primary" },
  out_for_delivery: { label: "Out for delivery", tone: "warning", final: false, bar: "bg-amber-400" },
  delivered: { label: "Delivered", tone: "success", final: true, bar: "bg-emerald-500" },
  failed: { label: "Delivery failed", tone: "danger", final: false, bar: "bg-red-500" },
  returned: { label: "Returned", tone: "danger", final: true, bar: "bg-rose-300 dark:bg-rose-700" },
  cancelled: { label: "Cancelled", tone: "neutral", final: true, bar: "bg-slate-300 dark:bg-slate-700" },
});

export const STATUS_ORDER = Object.keys(SHIPMENT_STATUSES) as ShipmentStatus[];

/** Mirrors server/src/services/logistics.js TRANSITIONS (the server stays the authority). */
export const TRANSITIONS: Readonly<Record<ShipmentStatus, readonly ShipmentStatus[]>> = Object.freeze({
  pending: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "failed", "cancelled"],
  in_transit: ["out_for_delivery", "failed", "returned"],
  out_for_delivery: ["delivered", "failed"],
  failed: ["out_for_delivery", "returned", "in_transit"],
  delivered: [],
  cancelled: [],
  returned: [],
});

/** What a driver without dispatch permission may set on their own shipments. */
export const DRIVER_STATUSES: readonly ShipmentStatus[] = ["picked_up", "in_transit", "out_for_delivery", "delivered", "failed"];

/** Next statuses for list rows (which don't carry allowedStatuses), matching the server's rule. */
export function nextStatuses(status: ShipmentStatus, { dispatcher }: { dispatcher: boolean }) {
  const next = TRANSITIONS[status] ?? [];
  return dispatcher ? [...next] : next.filter(item => DRIVER_STATUSES.includes(item));
}

/** The happy path shown by the public tracking stepper. */
export const PROGRESS_STEPS: readonly ShipmentStatus[] = ["pending", "picked_up", "in_transit", "out_for_delivery", "delivered"];

/** Statuses that leave the happy path (shown distinctly). */
export const EXCEPTION_STATUSES: readonly ShipmentStatus[] = ["failed", "returned", "cancelled"];

export const SERVICES: Readonly<Record<ShipmentService, Meta>> = Object.freeze({
  standard: { label: "Standard", tone: "neutral" },
  express: { label: "Express", tone: "info" },
  same_day: { label: "Same day", tone: "warning" },
});

export const DIRECTIONS: Readonly<Record<ShipmentDirection, Meta>> = Object.freeze({
  outbound: { label: "Outbound", tone: "primary" },
  inbound: { label: "Inbound", tone: "info" },
  transfer: { label: "Transfer", tone: "neutral" },
});

export const VEHICLE_TYPES: Readonly<Record<VehicleType, { label: string }>> = Object.freeze({
  bike: { label: "Bike" },
  car: { label: "Car" },
  van: { label: "Van" },
  truck: { label: "Truck" },
  other: { label: "Other" },
});

export const VEHICLE_STATUSES: Readonly<Record<VehicleStatus, Meta>> = Object.freeze({
  available: { label: "Available", tone: "success" },
  in_use: { label: "In use", tone: "primary" },
  maintenance: { label: "Maintenance", tone: "warning" },
  retired: { label: "Retired", tone: "neutral" },
});

export const toOptions = <K extends string>(map: Readonly<Record<K, { label: string }>>): SelectOption[] =>
  (Object.entries(map) as [K, { label: string }][]).map(([value, meta]) => ({ value, label: meta.label }));

export const isShipmentStatus = (value: string | null | undefined): value is ShipmentStatus => Boolean(value && value in SHIPMENT_STATUSES);
export const isDirection = (value: string | null | undefined): value is ShipmentDirection => Boolean(value && value in DIRECTIONS);

/** "" -> null, trimmed text otherwise (forms send null for cleared fields). */
export const textOrNull = (value: string) => (value.trim() ? value.trim() : null);

/** "" -> null, a number otherwise. */
export const numberOrNull = (value: string) => (value.trim() === "" || Number.isNaN(Number(value)) ? null : Number(value));

/** A positive integer id from a select value, or null. */
export const idOrNull = (value: string) => (value ? Number(value) : null);

/** The public tracking page for a code on this site. */
export const trackingLink = (code: string) => (typeof window === "undefined" ? `/track/${code}` : `${window.location.origin}/track/${code}`);

export const cityRoute = (origin: string | null, destination: string | null) => [origin, destination].filter(Boolean).join(" → ");
