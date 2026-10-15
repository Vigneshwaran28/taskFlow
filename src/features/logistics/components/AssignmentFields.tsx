"use client";
// Carrier, carrier reference, vehicle, and driver pickers (dispatch only). Shared by the booking and assign dialogs.
import { SelectField, type SelectOption } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import type { FieldErrors } from "@/lib/apiClient";
import { useCarriers, useDrivers, useVehicles } from "../hooks/useLogistics";
import { VEHICLE_STATUSES } from "../utils/logisticsMeta";

export interface AssignmentValues {
  carrierId: string;
  carrierReference: string;
  vehicleId: string;
  driverId: string;
}

interface CurrentAssignment {
  carrier?: { id: number; name: string } | null;
  vehicle?: { id: number; registration: string } | null;
  driver?: { id: number; name: string } | null;
}

/** Keeps the current choice selectable even when it's no longer offered (inactive carrier, vehicle in maintenance). */
function withCurrent(options: SelectOption[], current: { id: number; label: string } | null | undefined) {
  if (!current || options.some(option => option.value === String(current.id))) return options;
  return [...options, { value: String(current.id), label: current.label }];
}

export function AssignmentFields({
  values,
  onChange,
  errors,
  current = {},
}: {
  values: AssignmentValues;
  onChange: (patch: Partial<AssignmentValues>) => void;
  errors: FieldErrors;
  current?: CurrentAssignment;
}) {
  const carriers = useCarriers("active");
  const vehicles = useVehicles();
  const drivers = useDrivers();

  const carrierOptions = withCurrent(
    (carriers.data ?? []).map(carrier => ({ value: String(carrier.id), label: carrier.code ? `${carrier.name} (${carrier.code})` : carrier.name })),
    current.carrier ? { id: current.carrier.id, label: `${current.carrier.name} (inactive)` } : null
  );
  const vehicleOptions = withCurrent(
    (vehicles.data ?? [])
      .filter(vehicle => vehicle.status === "available" || vehicle.status === "in_use")
      .map(vehicle => ({
        value: String(vehicle.id),
        label: `${vehicle.registration} · ${VEHICLE_STATUSES[vehicle.status].label}${vehicle.driver ? ` · ${vehicle.driver.name}` : ""}`,
      })),
    current.vehicle ? { id: current.vehicle.id, label: current.vehicle.registration } : null
  );
  const driverOptions = withCurrent(
    (drivers.data ?? []).map(driver => ({ value: String(driver.id), label: `${driver.name}${driver.activeShipments ? ` · ${driver.activeShipments} active` : ""}` })),
    current.driver ? { id: current.driver.id, label: current.driver.name } : null
  );

  function pickDriver(driverId: string) {
    // A driver's own vehicle is the usual choice: fill it in when none is picked yet.
    const driver = drivers.data?.find(item => String(item.id) === driverId);
    onChange({ driverId, ...(driver?.vehicle && !values.vehicleId ? { vehicleId: String(driver.vehicle.id) } : {}) });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField
        label="Carrier"
        value={values.carrierId}
        onChange={event => onChange({ carrierId: event.target.value })}
        options={[{ value: "", label: carriers.isPending ? "Loading…" : "Own fleet / none" }, ...carrierOptions]}
        error={errors.carrierId}
      />
      <TextField
        label="Carrier reference"
        value={values.carrierReference}
        onChange={event => onChange({ carrierReference: event.target.value })}
        maxLength={60}
        hint="The carrier's own tracking number."
        error={errors.carrierReference}
      />
      <SelectField
        label="Driver"
        value={values.driverId}
        onChange={event => pickDriver(event.target.value)}
        options={[{ value: "", label: drivers.isPending ? "Loading…" : "Unassigned" }, ...driverOptions]}
        error={errors.driverId}
      />
      <SelectField
        label="Vehicle"
        value={values.vehicleId}
        onChange={event => onChange({ vehicleId: event.target.value })}
        options={[{ value: "", label: vehicles.isPending ? "Loading…" : "No vehicle" }, ...vehicleOptions]}
        error={errors.vehicleId}
      />
    </div>
  );
}
