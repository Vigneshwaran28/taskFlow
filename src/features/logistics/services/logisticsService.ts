// Logistics API calls (server/src/routes/logistics.js and publicTracking.js) and the shapes they return.
import { apiClient, apiUrl, type RequestOptions } from "@/lib/apiClient";
import type { Page } from "@/types/session";

export type ShipmentStatus = "pending" | "picked_up" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "returned" | "cancelled";
export type ShipmentDirection = "outbound" | "inbound" | "transfer";
export type ShipmentService = "standard" | "express" | "same_day";
export type VehicleType = "bike" | "car" | "van" | "truck" | "other";
export type VehicleStatus = "available" | "in_use" | "maintenance" | "retired";

interface Ref {
  id: number;
  name: string;
}

export interface Shipment {
  id: number;
  number: string;
  trackingCode: string;
  direction: ShipmentDirection;
  status: ShipmentStatus;
  service: ShipmentService;
  carrier: Ref | null;
  carrierReference: string | null;
  trackingUrl: string | null;
  vehicle: { id: number; registration: string } | null;
  driver: Ref | null;
  orderId: number | null;
  customer: { id: number; name: string; company: string | null } | null;
  senderName: string | null;
  senderAddress: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientAddress: string | null;
  originCity: string | null;
  destinationCity: string | null;
  packages: number;
  weightKg: number | null;
  declaredValue: number | null;
  shippingCost: number | null;
  codAmount: number | null;
  shipDate: string | null;
  expectedOn: string | null;
  deliveredAt: string | null;
  receivedBy: string | null;
  notes: string | null;
  isOverdue: boolean;
  createdBy: Ref | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentEvent {
  id: number;
  status: ShipmentStatus;
  location: string | null;
  note: string | null;
  actor: Ref | null;
  occurredAt: string;
}

export interface ShipmentDetail extends Omit<Shipment, "customer"> {
  order: { id: number; number: string; status: string; total: number } | null;
  customer: { id: number; name: string; company: string | null; email: string | null; phone: string | null; address: string | null } | null;
  /** Newest first */
  events: ShipmentEvent[];
  /** The statuses this user may set next */
  allowedStatuses: ShipmentStatus[];
  currency: string;
}

export interface Carrier {
  id: number;
  name: string;
  code: string | null;
  trackingUrl: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  activeShipments: number;
  totalShipments: number;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: number;
  registration: string;
  type: VehicleType;
  capacityKg: number | null;
  status: VehicleStatus;
  driver: Ref | null;
  notes: string | null;
  activeShipments: number;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: number;
  name: string;
  email: string;
  jobTitle: string | null;
  activeShipments: number;
  vehicle: { id: number; registration: string } | null;
}

export interface Summary {
  byStatus: Record<ShipmentStatus, number>;
  total: number;
  open: number;
  dueToday: number;
  overdue: number;
  deliveredThisWeek: number;
  onTimeRate: number | null;
  codToCollect: { count: number; amount: number };
  byCarrier: { carrier: Ref | null; count: number }[];
  myDeliveries: number;
  currency: string;
}

export interface PublicTrackingEvent {
  status: ShipmentStatus;
  location: string | null;
  note: string | null;
  occurredAt: string;
}

export interface PublicTracking {
  trackingCode: string;
  number: string;
  status: ShipmentStatus;
  service: ShipmentService;
  originCity: string | null;
  destinationCity: string | null;
  expectedOn: string | null;
  deliveredAt: string | null;
  packages: number;
  carrier: { name: string } | null;
  events: PublicTrackingEvent[];
  company: string;
}

/** A sales order as listed by GET /api/sales/orders (only the fields the booking form uses). */
export interface SalesOrderOption {
  id: number;
  key: string;
  status: string;
  total: number;
  customer: { id: number; name: string; company: string | null } | null;
}

export interface ShipmentFilters {
  status?: ShipmentStatus;
  direction?: ShipmentDirection;
  carrierId?: number;
  driverId?: number;
  mine?: boolean;
  overdue?: boolean;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface ShipmentInput {
  direction?: ShipmentDirection;
  service?: ShipmentService;
  orderId?: number | null;
  carrierId?: number | null;
  carrierReference?: string | null;
  vehicleId?: number | null;
  driverId?: number | null;
  senderName?: string | null;
  senderAddress?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  recipientAddress?: string | null;
  originCity?: string | null;
  destinationCity?: string | null;
  packages?: number;
  weightKg?: number | null;
  declaredValue?: number | null;
  shippingCost?: number | null;
  codAmount?: number | null;
  shipDate?: string | null;
  expectedOn?: string | null;
  notes?: string | null;
}

export type AssignmentInput = Pick<ShipmentInput, "carrierId" | "carrierReference" | "vehicleId" | "driverId">;

export interface StatusInput {
  status: ShipmentStatus;
  location?: string | null;
  note?: string | null;
  receivedBy?: string | null;
  occurredAt?: string | null;
}

export interface EventInput {
  note: string;
  location?: string | null;
  occurredAt?: string | null;
}

export interface CarrierInput {
  name: string;
  code: string | null;
  trackingUrl: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

export interface VehicleInput {
  registration: string;
  type: VehicleType;
  capacityKg: number | null;
  status: VehicleStatus;
  driverId: number | null;
  notes: string | null;
}

const BASE = "/logistics";

function listParams(filters: ShipmentFilters) {
  return {
    status: filters.status,
    direction: filters.direction,
    carrierId: filters.carrierId,
    driverId: filters.driverId,
    mine: filters.mine ? "true" : undefined,
    overdue: filters.overdue ? "true" : undefined,
    search: filters.search,
    from: filters.from,
    to: filters.to,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export const logisticsService = {
  summary: (options?: RequestOptions) => apiClient.get<Summary>(`${BASE}/summary`, options),

  listShipments: (filters: ShipmentFilters, options?: RequestOptions) => apiClient.get<Page<Shipment>>(`${BASE}/shipments`, { ...options, params: listParams(filters) }),
  getShipment: (id: number, options?: RequestOptions) => apiClient.get<ShipmentDetail>(`${BASE}/shipments/${id}`, options),
  createShipment: (input: ShipmentInput) => apiClient.post<ShipmentDetail>(`${BASE}/shipments`, input),
  updateShipment: (id: number, input: ShipmentInput) => apiClient.patch<ShipmentDetail>(`${BASE}/shipments/${id}`, input),
  setStatus: (id: number, input: StatusInput) => apiClient.post<ShipmentDetail>(`${BASE}/shipments/${id}/status`, input),
  addEvent: (id: number, input: EventInput) => apiClient.post<ShipmentDetail>(`${BASE}/shipments/${id}/events`, input),
  deleteShipment: (id: number) => apiClient.delete(`${BASE}/shipments/${id}`),
  /** A same-origin URL the browser downloads itself (CSV). */
  exportUrl: (filters: Pick<ShipmentFilters, "from" | "to" | "status">) => apiUrl(`${BASE}/export`, { from: filters.from, to: filters.to, status: filters.status }),

  listCarriers: (status: "active" | "inactive" | "all" = "all", options?: RequestOptions) => apiClient.get<Carrier[]>(`${BASE}/carriers`, { ...options, params: { status } }),
  createCarrier: (input: CarrierInput) => apiClient.post<Carrier>(`${BASE}/carriers`, input),
  updateCarrier: (id: number, input: Partial<CarrierInput>) => apiClient.patch<Carrier>(`${BASE}/carriers/${id}`, input),
  deleteCarrier: (id: number) => apiClient.delete<{ deleted: boolean; carrier: Carrier | null }>(`${BASE}/carriers/${id}`),

  listVehicles: (options?: RequestOptions) => apiClient.get<Vehicle[]>(`${BASE}/vehicles`, options),
  createVehicle: (input: VehicleInput) => apiClient.post<Vehicle>(`${BASE}/vehicles`, input),
  updateVehicle: (id: number, input: Partial<VehicleInput>) => apiClient.patch<Vehicle>(`${BASE}/vehicles/${id}`, input),
  deleteVehicle: (id: number) => apiClient.delete<{ deleted: boolean; vehicle: Vehicle | null }>(`${BASE}/vehicles/${id}`),

  listDrivers: (options?: RequestOptions) => apiClient.get<Driver[]>(`${BASE}/drivers`, options),

  /** Recent sales orders to link a shipment to (needs access to the sales module). */
  listSalesOrders: (options?: RequestOptions) => apiClient.get<{ items: SalesOrderOption[] }>("/sales/orders", options),

  /** Public: no sign-in. The 401 handler ignores /public paths. */
  track: (code: string, options?: RequestOptions) => apiClient.get<PublicTracking>(`/public/track/${encodeURIComponent(code.trim().toUpperCase())}`, options),
};
