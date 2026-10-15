"use client";
// Fleet tab: vehicles with status and regular driver; add, edit, and delete (or retire) them.
import { useState } from "react";
import { Pencil, Plus, Trash2, Truck } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatNumber } from "@/lib/format";
import { useDeleteVehicle, useVehicles } from "../hooks/useLogistics";
import type { Vehicle } from "../services/logisticsService";
import { VEHICLE_STATUSES, VEHICLE_TYPES } from "../utils/logisticsMeta";
import { VehicleFormDialog } from "./VehicleFormDialog";

export function FleetPanel() {
  const toast = useToast();
  const { data, isPending, error, refetch } = useVehicles();
  const remove = useDeleteVehicle();
  const [editing, setEditing] = useState<Vehicle | "new" | null>(null);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);

  function confirmDelete() {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: result => {
        if (result?.deleted) toast.success(`${deleting.registration} deleted`);
        else toast.info(`${deleting.registration} retired`, "It has past shipments, so it was retired instead of deleted to keep their history.");
        setDeleting(null);
      },
      onError: err => {
        toast.error("Couldn't delete the vehicle", err.message);
        setDeleting(null);
      },
    });
  }

  let body;
  if (isPending) body = <LoadingState label="Loading vehicles…" />;
  else if (error) body = <ErrorState message="Unable to load vehicles." onRetry={() => void refetch()} />;
  else if (!data.length) body = <EmptyState icon={Truck} title="No vehicles yet" message="Add your bikes, vans, and trucks to assign them to shipments." />;
  else {
    body = (
      <div className="relative overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Vehicles</caption>
          <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-semibold">Registration</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Type</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Capacity</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Driver</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Active shipments</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map(vehicle => (
              <tr key={vehicle.id} className="hover:bg-muted/40">
                <td className="px-3 py-2.5">
                  <p className="font-mono font-medium">{vehicle.registration}</p>
                  {vehicle.notes && <p className="max-w-xs truncate text-xs text-muted-foreground">{vehicle.notes}</p>}
                </td>
                <td className="px-3 py-2.5">{VEHICLE_TYPES[vehicle.type].label}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{vehicle.capacityKg ? `${formatNumber(vehicle.capacityKg)} kg` : "—"}</td>
                <td className="px-3 py-2.5">
                  <Badge tone={VEHICLE_STATUSES[vehicle.status].tone}>{VEHICLE_STATUSES[vehicle.status].label}</Badge>
                </td>
                <td className="px-3 py-2.5">{vehicle.driver?.name ?? <span className="text-muted-foreground">—</span>}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{vehicle.activeShipments}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(vehicle)} aria-label={`Edit ${vehicle.registration}`}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleting(vehicle)} aria-label={`Delete ${vehicle.registration}`}>
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Vehicles switch between available and in use as their shipments move.</p>
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add vehicle
        </Button>
      </div>
      {body}
      {editing && <VehicleFormDialog key={editing === "new" ? "new" : editing.id} vehicle={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.registration ?? "vehicle"}?`}
        message={
          deleting?.activeShipments
            ? `This vehicle has ${deleting.activeShipments} open shipment${deleting.activeShipments === 1 ? "" : "s"}. Reassign them first; the server will refuse until then.`
            : "A vehicle that never carried a shipment is deleted. One with past shipments is retired instead, so their history stays intact."
        }
        confirmLabel="Delete"
        pending={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
