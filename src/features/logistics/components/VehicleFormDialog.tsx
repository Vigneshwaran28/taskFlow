"use client";
import { useId, useState, type FormEvent } from "react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { useDrivers, useSaveVehicle } from "../hooks/useLogistics";
import type { Vehicle, VehicleStatus, VehicleType } from "../services/logisticsService";
import { VEHICLE_STATUSES, VEHICLE_TYPES, idOrNull, numberOrNull, textOrNull, toOptions } from "../utils/logisticsMeta";
import { compact, positiveError, without, type Errors } from "../utils/validateLogistics";

export function VehicleFormDialog({ vehicle, onClose }: { vehicle?: Vehicle; onClose: () => void }) {
  const toast = useToast();
  const formId = useId();
  const mutation = useSaveVehicle();
  const drivers = useDrivers();
  const [registration, setRegistration] = useState(vehicle?.registration ?? "");
  const [type, setType] = useState<VehicleType>(vehicle?.type ?? "van");
  const [capacityKg, setCapacityKg] = useState(vehicle?.capacityKg != null ? String(vehicle.capacityKg) : "");
  const [status, setStatus] = useState<VehicleStatus>(vehicle?.status ?? "available");
  const [driverId, setDriverId] = useState(vehicle?.driver ? String(vehicle.driver.id) : "");
  const [notes, setNotes] = useState(vehicle?.notes ?? "");
  const [localErrors, setLocalErrors] = useState<Errors>({});
  const [edited, setEdited] = useState<string[]>([]);
  const errors = { ...without(fieldErrorsOf(mutation.error), edited), ...localErrors };
  const touch = (field: string) => {
    setLocalErrors(current => without(current, [field]));
    setEdited(current => (current.includes(field) ? current : [...current, field]));
  };

  const driverOptions = (drivers.data ?? []).map(driver => ({ value: String(driver.id), label: driver.vehicle && driver.vehicle.id !== vehicle?.id ? `${driver.name} (drives ${driver.vehicle.registration})` : driver.name }));
  if (vehicle?.driver && !driverOptions.some(option => option.value === String(vehicle.driver!.id))) driverOptions.push({ value: String(vehicle.driver.id), label: vehicle.driver.name });

  function submit(event: FormEvent) {
    event.preventDefault();
    const found = compact({
      registration: registration.trim() ? null : "Registration is required.",
      capacityKg: positiveError(capacityKg, "Enter a capacity above zero."),
    });
    setLocalErrors(found);
    if (Object.keys(found).length) return;
    setEdited([]);
    mutation.mutate(
      { id: vehicle?.id, input: { registration: registration.trim(), type, capacityKg: numberOrNull(capacityKg), status, driverId: idOrNull(driverId), notes: textOrNull(notes) } },
      {
        onSuccess: saved => {
          toast.success(vehicle ? `${saved.registration} updated` : `${saved.registration} added to the fleet`);
          onClose();
        },
      }
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={vehicle ? `Edit ${vehicle.registration}` : "Add vehicle"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={mutation.isPending}>
            {vehicle ? "Save changes" : "Add vehicle"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <FormAlert message={formErrorOf(mutation.error)} />
        </div>
        <TextField
          label="Registration"
          required
          value={registration}
          onChange={event => {
            setRegistration(event.target.value);
            touch("registration");
          }}
          maxLength={30}
          autoComplete="off"
          className="sm:col-span-2"
          error={errors.registration}
        />
        <SelectField label="Type" value={type} onChange={event => setType(event.target.value as VehicleType)} options={toOptions(VEHICLE_TYPES)} error={errors.type} />
        <TextField
          label="Capacity (kg)"
          type="number"
          inputMode="decimal"
          min={0}
          max={1000000}
          step="any"
          value={capacityKg}
          onChange={event => {
            setCapacityKg(event.target.value);
            touch("capacityKg");
          }}
          error={errors.capacityKg}
        />
        <SelectField
          label="Status"
          value={status}
          onChange={event => setStatus(event.target.value as VehicleStatus)}
          options={toOptions(VEHICLE_STATUSES)}
          hint="In use and available also follow the vehicle's shipments."
          error={errors.status}
        />
        <SelectField
          label="Driver"
          value={driverId}
          onChange={event => setDriverId(event.target.value)}
          options={[{ value: "", label: drivers.isPending ? "Loading…" : "No regular driver" }, ...driverOptions]}
          error={errors.driverId}
        />
        <TextAreaField label="Notes" rows={2} value={notes} onChange={event => setNotes(event.target.value)} maxLength={300} className="sm:col-span-2" error={errors.notes} />
      </form>
    </Dialog>
  );
}
