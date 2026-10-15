"use client";
// Carriers tab: courier companies with their tracking URL template; add, edit, deactivate, delete.
import { useState } from "react";
import { Building2, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useCarriers, useDeleteCarrier, useToggleCarrier } from "../hooks/useLogistics";
import type { Carrier } from "../services/logisticsService";
import { CarrierFormDialog } from "./CarrierFormDialog";

export function CarriersPanel() {
  const toast = useToast();
  const { data, isPending, error, refetch } = useCarriers("all");
  const remove = useDeleteCarrier();
  const toggle = useToggleCarrier();
  const [editing, setEditing] = useState<Carrier | "new" | null>(null);
  const [deleting, setDeleting] = useState<Carrier | null>(null);

  function confirmDelete() {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: result => {
        if (result?.deleted) toast.success(`${deleting.name} deleted`);
        else toast.info(`${deleting.name} deactivated`, "It has shipments, so it was deactivated instead of deleted to keep their history.");
        setDeleting(null);
      },
      onError: err => {
        toast.error("Couldn't delete the carrier", err.message);
        setDeleting(null);
      },
    });
  }

  function toggleActive(carrier: Carrier) {
    toggle.mutate(
      { id: carrier.id, isActive: !carrier.isActive },
      {
        onSuccess: saved => toast.success(`${saved.name} ${saved.isActive ? "activated" : "deactivated"}`),
        onError: err => toast.error("Couldn't update the carrier", err.message),
      }
    );
  }

  let body;
  if (isPending) body = <LoadingState label="Loading carriers…" />;
  else if (error) body = <ErrorState message="Unable to load carriers." onRetry={() => void refetch()} />;
  else if (!data.length) body = <EmptyState icon={Building2} title="No carriers yet" message="Add the courier companies you hand shipments to. Your own fleet needs no carrier." />;
  else {
    body = (
      <div className="relative overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Carriers</caption>
          <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-semibold">Carrier</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Tracking URL</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Contact</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Open / total</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map(carrier => (
              <tr key={carrier.id} className="hover:bg-muted/40">
                <td className="px-3 py-2.5">
                  <p className="font-medium">{carrier.name}</p>
                  {carrier.code && <p className="font-mono text-xs text-muted-foreground">{carrier.code}</p>}
                </td>
                <td className="max-w-xs truncate px-3 py-2.5 font-mono text-xs text-muted-foreground" title={carrier.trackingUrl ?? undefined}>
                  {carrier.trackingUrl ?? "—"}
                </td>
                <td className="px-3 py-2.5">
                  {carrier.phone && (
                    <a href={`tel:${carrier.phone.replace(/[^\d+]/g, "")}`} className="block hover:underline">
                      {carrier.phone}
                    </a>
                  )}
                  {carrier.email && (
                    <a href={`mailto:${carrier.email}`} className="block text-xs text-muted-foreground hover:underline">
                      {carrier.email}
                    </a>
                  )}
                  {!carrier.phone && !carrier.email && <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <Badge tone={carrier.isActive ? "success" : "neutral"}>{carrier.isActive ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {carrier.activeShipments} / {carrier.totalShipments}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(carrier)} aria-label={`Edit ${carrier.name}`}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleActive(carrier)}
                    disabled={toggle.isPending}
                    aria-label={`${carrier.isActive ? "Deactivate" : "Activate"} ${carrier.name}`}
                    title={carrier.isActive ? "Deactivate" : "Activate"}
                  >
                    <Power className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleting(carrier)} aria-label={`Delete ${carrier.name}`}>
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
        <p className="text-sm text-muted-foreground">Inactive carriers keep their shipments but can&apos;t be chosen for new ones.</p>
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add carrier
        </Button>
      </div>
      {body}
      {editing && <CarrierFormDialog key={editing === "new" ? "new" : editing.id} carrier={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.name ?? "carrier"}?`}
        message={
          deleting?.totalShipments
            ? `${deleting.name} has ${deleting.totalShipments} shipment${deleting.totalShipments === 1 ? "" : "s"}, so it will be deactivated instead of deleted to keep their history.`
            : "This carrier has no shipments and will be deleted."
        }
        confirmLabel={deleting?.totalShipments ? "Deactivate" : "Delete"}
        pending={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
