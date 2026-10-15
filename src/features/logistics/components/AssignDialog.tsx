"use client";
// Dispatch: assigns the carrier, vehicle, driver, and carrier reference.
import { useId, useState, type FormEvent } from "react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { useAssignShipment } from "../hooks/useLogistics";
import type { Shipment } from "../services/logisticsService";
import { idOrNull, textOrNull } from "../utils/logisticsMeta";
import { AssignmentFields, type AssignmentValues } from "./AssignmentFields";

type AssignableShipment = Pick<Shipment, "id" | "number" | "carrier" | "carrierReference" | "vehicle" | "driver">;

export function AssignDialog({ shipment, onClose }: { shipment: AssignableShipment; onClose: () => void }) {
  const toast = useToast();
  const mutation = useAssignShipment();
  const formId = useId();
  const [values, setValues] = useState<AssignmentValues>({
    carrierId: shipment.carrier ? String(shipment.carrier.id) : "",
    carrierReference: shipment.carrierReference ?? "",
    vehicleId: shipment.vehicle ? String(shipment.vehicle.id) : "",
    driverId: shipment.driver ? String(shipment.driver.id) : "",
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(
      {
        id: shipment.id,
        input: {
          carrierId: idOrNull(values.carrierId),
          carrierReference: textOrNull(values.carrierReference),
          vehicleId: idOrNull(values.vehicleId),
          driverId: idOrNull(values.driverId),
        },
      },
      {
        onSuccess: () => {
          toast.success(`${shipment.number} assigned`);
          onClose();
        },
      }
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Assign shipment"
      description={shipment.number}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={mutation.isPending}>
            Save assignment
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <FormAlert message={formErrorOf(mutation.error)} />
        <AssignmentFields
          values={values}
          onChange={patch => setValues(current => ({ ...current, ...patch }))}
          errors={fieldErrorsOf(mutation.error)}
          current={{ carrier: shipment.carrier, vehicle: shipment.vehicle, driver: shipment.driver }}
        />
      </form>
    </Dialog>
  );
}
