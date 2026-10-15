"use client";
// Feature component: deletes a tenant from the recycle bin for good. The tenant's address must be typed to confirm;
// afterwards it lists how many rows were removed.
import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { formatInteger } from "@/lib/format";
import { usePurgeTenant } from "../hooks/useAdmin";
import type { PurgeResult, Tenant } from "../services/adminService";

const LABELS: Record<string, string> = {
  tenants: "Tenant",
  users: "Users",
  user_roles: "Role assignments",
  team_members: "Team memberships",
  tenant_audit: "Audit log entries",
  provider_broadcast_targets: "Broadcast targets",
  subscription_notices: "Subscription notices",
  password_resets: "Password resets",
  ticket_comments: "Ticket comments",
};
const labelOf = (table: string) => LABELS[table] ?? table.replace(/_/g, " ").replace(/^./, char => char.toUpperCase());

export interface PurgeTenantDialogProps {
  tenant: Tenant;
  onClose: () => void;
}

export function PurgeTenantDialog({ tenant, onClose }: PurgeTenantDialogProps) {
  const toast = useToast();
  const purge = usePurgeTenant();
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<PurgeResult | null>(null);
  const matches = typed.trim().toLowerCase() === tenant.slug;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!matches || purge.isPending) return;
    purge.mutate(
      { id: tenant.id, slug: typed.trim() },
      {
        onSuccess: data => {
          setResult(data);
          toast.success(`${data.name} deleted permanently`, `${formatInteger(data.total)} rows removed.`);
        },
      }
    );
  }

  if (result) {
    const rows = Object.entries(result.removed).sort((a, b) => b[1] - a[1]);
    return (
      <Dialog open onClose={onClose} title={`${result.name} is deleted`} description="The tenant and everything in it are gone. Its address is free again." footer={<Button onClick={onClose}>Done</Button>}>
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <span>
              <span className="font-medium tabular-nums">{formatInteger(result.total)}</span> rows removed from {rows.length} table{rows.length === 1 ? "" : "s"}.
            </span>
          </p>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2" aria-label="Rows removed per table" data-testid="purge-counts">
            {rows.map(([table, count]) => (
              <li key={table} className="flex items-center justify-between gap-3 border-b border-dashed py-1">
                <span className="truncate text-muted-foreground">{labelOf(table)}</span>
                <span className="tabular-nums">{formatInteger(count)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={`Delete ${tenant.name} permanently?`}
      description="This can't be undone."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={purge.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="purge-tenant-form" variant="danger" disabled={!matches} loading={purge.isPending}>
            Delete permanently
          </Button>
        </>
      }
    >
      <form id="purge-tenant-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formErrorOf(purge.error)} />
        <p className="text-sm text-muted-foreground">
          Every user, record, and audit entry of <span className="font-medium text-foreground">{tenant.name}</span> is removed from the database, and its address becomes
          available to new tenants.
        </p>
        <TextField
          label={
            <>
              Type <span className="font-mono">{tenant.slug}</span> to confirm
            </>
          }
          id="purge-confirm-slug"
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={typed}
          error={fieldErrorsOf(purge.error).slug}
          onChange={event => {
            setTyped(event.target.value);
            if (purge.error) purge.reset();
          }}
        />
      </form>
    </Dialog>
  );
}
