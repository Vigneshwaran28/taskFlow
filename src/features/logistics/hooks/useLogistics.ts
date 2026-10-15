import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/apiClient";
import { usePollInterval } from "@/realtime";
import {
  logisticsService,
  type AssignmentInput,
  type CarrierInput,
  type EventInput,
  type ShipmentFilters,
  type ShipmentInput,
  type StatusInput,
  type VehicleInput,
} from "../services/logisticsService";

export const logisticsKeys = {
  all: ["logistics"] as const,
  summary: () => [...logisticsKeys.all, "summary"] as const,
  shipments: (filters: ShipmentFilters) => [...logisticsKeys.all, "shipments", filters] as const,
  shipment: (id: number) => [...logisticsKeys.all, "shipment", id] as const,
  carriers: (status: "active" | "inactive" | "all") => [...logisticsKeys.all, "carriers", status] as const,
  vehicles: () => [...logisticsKeys.all, "vehicles"] as const,
  drivers: () => [...logisticsKeys.all, "drivers"] as const,
  salesOrders: () => [...logisticsKeys.all, "sales-orders"] as const,
  /** Public tracking is outside the session: kept under its own root so sign-in resets don't matter */
  tracking: (code: string) => ["public-tracking", code] as const,
};

// ---- Queries ----
export function useLogisticsSummary(options: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: logisticsKeys.summary(), queryFn: ({ signal }) => logisticsService.summary({ signal }), enabled: options.enabled ?? true });
}

/** shipment.updated refreshes the "logistics" root live; the poll is the fallback when the socket is down. */
export function useShipments(filters: ShipmentFilters) {
  const refetchInterval = usePollInterval(60_000, 120_000);
  return useQuery({
    queryKey: logisticsKeys.shipments(filters),
    queryFn: ({ signal }) => logisticsService.listShipments(filters, { signal }),
    placeholderData: keepPreviousData,
    refetchInterval,
  });
}

export function useShipment(id: number) {
  return useQuery({ queryKey: logisticsKeys.shipment(id), queryFn: ({ signal }) => logisticsService.getShipment(id, { signal }), enabled: Number.isInteger(id) && id > 0 });
}

export function useCarriers(status: "active" | "inactive" | "all" = "all", options: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: logisticsKeys.carriers(status), queryFn: ({ signal }) => logisticsService.listCarriers(status, { signal }), enabled: options.enabled ?? true });
}

export function useVehicles(options: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: logisticsKeys.vehicles(), queryFn: ({ signal }) => logisticsService.listVehicles({ signal }), enabled: options.enabled ?? true });
}

export function useDrivers(options: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: logisticsKeys.drivers(), queryFn: ({ signal }) => logisticsService.listDrivers({ signal }), enabled: options.enabled ?? true });
}

export function useSalesOrderOptions(enabled: boolean) {
  return useQuery({ queryKey: logisticsKeys.salesOrders(), queryFn: ({ signal }) => logisticsService.listSalesOrders({ signal }), enabled, staleTime: 60_000 });
}

/** The tracking page also listens on its public `track:<code>` channel and refetches on tracking.updated. */
export function usePublicTracking(code: string) {
  return useQuery({
    queryKey: logisticsKeys.tracking(code),
    queryFn: ({ signal }) => logisticsService.track(code, { signal }),
    enabled: Boolean(code),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
    refetchInterval: 120_000,
  });
}

// ---- Mutations: every change refreshes the whole module ----
function useLogisticsMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: logisticsKeys.all }) });
}

export const useCreateShipment = () => useLogisticsMutation((input: ShipmentInput) => logisticsService.createShipment(input));
export const useUpdateShipment = () => useLogisticsMutation(({ id, input }: { id: number; input: ShipmentInput }) => logisticsService.updateShipment(id, input));
export const useAssignShipment = () => useLogisticsMutation(({ id, input }: { id: number; input: AssignmentInput }) => logisticsService.updateShipment(id, input));
export const useSetShipmentStatus = () => useLogisticsMutation(({ id, input }: { id: number; input: StatusInput }) => logisticsService.setStatus(id, input));
export const useAddShipmentEvent = () => useLogisticsMutation(({ id, input }: { id: number; input: EventInput }) => logisticsService.addEvent(id, input));

export function useDeleteShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => logisticsService.deleteShipment(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: logisticsKeys.shipment(id) });
      return queryClient.invalidateQueries({ queryKey: logisticsKeys.all });
    },
  });
}

export const useSaveCarrier = () =>
  useLogisticsMutation(({ id, input }: { id?: number; input: CarrierInput }) => (id ? logisticsService.updateCarrier(id, input) : logisticsService.createCarrier(input)));
export const useToggleCarrier = () => useLogisticsMutation(({ id, isActive }: { id: number; isActive: boolean }) => logisticsService.updateCarrier(id, { isActive }));
export const useDeleteCarrier = () => useLogisticsMutation((id: number) => logisticsService.deleteCarrier(id));

export const useSaveVehicle = () =>
  useLogisticsMutation(({ id, input }: { id?: number; input: VehicleInput }) => (id ? logisticsService.updateVehicle(id, input) : logisticsService.createVehicle(input)));
export const useDeleteVehicle = () => useLogisticsMutation((id: number) => logisticsService.deleteVehicle(id));
