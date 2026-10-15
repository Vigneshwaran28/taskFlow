"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useDeleteRow } from "../hooks/useAdmin";
import type { TableRow } from "../services/adminService";
import { formatCell, rowKey } from "../utils/formatCell";
import { USER_ID_COLUMNS } from "./DataTable";

const DELETE_WARNINGS: Record<string, string> = {
  users: "This deletes the user and all of their lists, tasks, tickets, and notifications. It can't be undone.",
  teams: "Members stay in the workspace; tickets routed to this team keep their history without a team. It can't be undone.",
  tickets: "This deletes the ticket with its whole conversation and activity history. It can't be undone.",
  ticket_comments: "The message disappears from the ticket conversation. It can't be undone.",
  invoices: "This deletes the invoice or quote with its lines and recorded payments. It can't be undone.",
  shipments: "This deletes the shipment with its whole tracking history. It can't be undone.",
  clinic_visits: "This deletes the visit record and its prescriptions. It can't be undone.",
  lists: "Tasks in this list are kept but no longer belong to a list. It can't be undone.",
  tasks: "Notifications for this task are kept without a link to it. It can't be undone.",
  notifications: "It can't be undone.",
};

export interface RowDetailDialogProps {
  table: string;
  /** e.g. "Invoices & quotes" */
  tableLabel?: string;
  /** The tenant being browsed: the API only deletes rows that belong to it */
  tenantId: number;
  /** Primary key column */
  keyColumn: string;
  columns: string[];
  /** null keeps the dialog closed */
  row: TableRow | null;
  userNames: Map<number, string>;
  onClose: () => void;
}

/** Feature component: every field of one row, with delete. */
export function RowDetailDialog({ table, tableLabel = table, tenantId, keyColumn, columns, row, userNames, onClose }: RowDetailDialogProps) {
  const toast = useToast();
  const deleteRow = useDeleteRow();
  const [confirming, setConfirming] = useState(false);
  const id = row ? rowKey(row, keyColumn) : null;

  function handleDelete() {
    if (id === null) return;
    deleteRow.mutate(
      { table, id, tenantId },
      {
        onSuccess: () => {
          toast.success("Row deleted", `${tableLabel} #${id} was removed.`);
          setConfirming(false);
          onClose();
        },
        onError: error => {
          setConfirming(false);
          toast.error("Delete failed", error.message);
        },
      }
    );
  }

  return (
    <>
      <Dialog
        open={Boolean(row) && !confirming}
        onClose={onClose}
        title={row ? `${tableLabel} #${id ?? "?"}` : ""}
        description="All stored values for this row."
        size="lg"
        footer={
          <>
            {table !== "tenants" && (
              <Button variant="danger" onClick={() => setConfirming(true)} disabled={id === null} className="mr-auto">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete row
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </>
        }
      >
        {row && (
          <dl className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
            {columns.map(column => {
              const raw = row[column];
              const text = formatCell(column, raw);
              const userName = USER_ID_COLUMNS.has(column) ? userNames.get(Number(raw)) : undefined;
              const rawText = typeof raw === "object" && raw !== null ? JSON.stringify(raw) : String(raw);
              return (
                <div key={column} className="contents">
                  <dt className="break-all font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:pt-0.5">{column}</dt>
                  <dd className="min-w-0 whitespace-pre-wrap wrap-anywhere text-sm tabular-nums">
                    {text === null ? <span className="text-muted-foreground/70">null</span> : text}
                    {userName && <span className="ml-1.5 text-muted-foreground">({userName})</span>}
                    {text !== null && text !== rawText && <span className="block break-all font-mono text-xs text-muted-foreground">{rawText}</span>}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
      </Dialog>
      <ConfirmDialog
        open={confirming}
        title={`Delete ${tableLabel} #${id ?? ""}?`}
        message={DELETE_WARNINGS[table] ?? "It can't be undone."}
        pending={deleteRow.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
