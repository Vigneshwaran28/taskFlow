"use client";
import { useEffect, useRef, useState } from "react";
import { Database, Download, Search } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/cn";
import { useAdminTable, useExportTable, useTenantOverview } from "../hooks/useAdmin";
import type { SortOrder, TableRow } from "../services/adminService";
import { downloadFile } from "../utils/downloadFile";
import { DataTable } from "./DataTable";
import { RowDetailDialog } from "./RowDetailDialog";

/** Changes merged into the console's URL state (the page goes back to 1 unless `page` is given). */
export interface BrowserChanges {
  view?: string;
  table?: string;
  tenant?: number;
  user?: number;
  search?: string;
  sort?: string;
  order?: SortOrder;
  page?: number;
}

/** Search box that reports its value after typing pauses. */
function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text.trim());
  // The latest committed value and callback, read by the effect without re-running it.
  const latest = useRef({ value, onChange });
  useEffect(() => {
    latest.current = { value, onChange };
  });

  // Push the debounced term to the URL (the page owns the committed value).
  useEffect(() => {
    if (debounced !== latest.current.value) latest.current.onChange(debounced);
  }, [debounced]);

  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-3 top-[2.35rem] h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <TextField label="Search" id="admin-table-search" type="search" placeholder="Text, or an id number" value={text} onChange={event => setText(event.target.value)} className="[&_input]:pl-9" />
    </div>
  );
}

export interface TableBrowserProps {
  table: string;
  tenantId: number;
  userId?: number;
  page: number;
  search: string;
  sort?: string;
  order: SortOrder;
  onChange: (changes: BrowserChanges) => void;
}

/** Feature component: one tab per table of the chosen tenant; search, filter by user, sort, export, and open any row. */
export function TableBrowser({ table, tenantId, userId, page, search, sort, order, onChange }: TableBrowserProps) {
  const toast = useToast();
  const overview = useTenantOverview(tenantId);
  const rows = useAdminTable(table, { page, tenantId, userId, search, sort, order });
  const exportTable = useExportTable();
  const [openRow, setOpenRow] = useState<TableRow | null>(null);

  const tenant = overview.data?.tenant;
  const tables = overview.data?.tables ?? [];
  const users = overview.data?.users ?? [];
  const userNames = new Map(users.map(user => [user.id, user.name]));
  const selectedUser = users.find(user => user.id === userId);
  const userOptions = [{ value: "", label: "All users" }, ...users.map(user => ({ value: String(user.id), label: `${user.name} (${user.email})` }))];
  const activeSort = rows.data?.sort ?? sort ?? "id";
  const keyColumn = rows.data?.key ?? "id";
  const label = tables.find(item => item.name === table)?.label ?? table;

  function handleSort(column: string) {
    const nextOrder: SortOrder = column === activeSort && order === "asc" ? "desc" : "asc";
    onChange({ sort: column, order: nextOrder });
  }

  function handleExport() {
    exportTable.mutate(
      { table, query: { tenantId, userId, search, sort, order } },
      {
        onSuccess: csv => {
          const filename = `taskflow-${table}${tenant ? `-${tenant.slug}` : ""}${selectedUser ? `-user-${selectedUser.id}` : ""}.csv`;
          downloadFile(filename, csv);
          toast.success("Export ready", `${filename} was downloaded.`);
        },
        onError: error => toast.error("Export failed", error.message),
      }
    );
  }

  const description = [`${label} in ${tenant?.name ?? "this tenant"}`, selectedUser ? `belonging to ${selectedUser.name}` : null, search ? `matching "${search}"` : null].filter(Boolean).join(", ");
  const pageEmpty = rows.data && !rows.data.rows.length && rows.data.total > 0;

  return (
    <section aria-labelledby="admin-browser-heading" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h2 id="admin-browser-heading" className="text-lg font-semibold tracking-tight">
            Table data
          </h2>
          <p className="text-sm text-muted-foreground">{description}. Click a row to see every value. Password hashes and clinical notes are never shown.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <SearchBox key={`${tenantId}-${table}`} value={search} onChange={value => onChange({ search: value })} />
          <SelectField
            label="User"
            id="admin-user-filter"
            className="w-full sm:w-60"
            value={selectedUser ? String(selectedUser.id) : ""}
            options={userOptions}
            onChange={event => onChange({ user: event.target.value ? Number(event.target.value) : undefined })}
          />
          <Button variant="secondary" onClick={handleExport} loading={exportTable.isPending} disabled={!rows.data?.total}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
        </div>
      </div>

      <div role="tablist" aria-label="Database tables" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b">
        {tables.map(item => {
          const active = item.name === table;
          return (
            <button
              key={item.name}
              type="button"
              role="tab"
              id={`admin-tab-${item.name}`}
              aria-selected={active}
              aria-controls="admin-table-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => onChange({ table: item.name, sort: undefined, order: undefined, search: "" })}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label} <span className="ml-1 text-xs tabular-nums text-muted-foreground">{item.count}</span>
            </button>
          );
        })}
      </div>

      <div id="admin-table-panel" role="tabpanel" aria-labelledby={`admin-tab-${table}`} aria-busy={rows.isFetching} className="flex min-w-0 flex-col gap-2">
        {rows.isPending ? (
          <LoadingState label={`Loading ${label}…`} />
        ) : rows.error ? (
          <ErrorState message={`Unable to load ${label}: ${rows.error.message}`} onRetry={() => void rows.refetch()} />
        ) : pageEmpty ? (
          <EmptyState
            title={`Page ${page} is empty`}
            message={`There are ${rows.data.total} rows on ${rows.data.totalPages} page${rows.data.totalPages === 1 ? "" : "s"}.`}
            icon={Database}
            action={
              <Button variant="secondary" onClick={() => onChange({ page: rows.data.totalPages })}>
                Go to page {rows.data.totalPages}
              </Button>
            }
          />
        ) : !rows.data.rows.length ? (
          <EmptyState
            title={search ? `No ${label.toLowerCase()} match "${search}"` : `No ${label.toLowerCase()} yet`}
            message={search ? "Try a shorter search term, or an id number." : selectedUser ? `${selectedUser.name} has none yet.` : `${tenant?.name ?? "This tenant"} has none yet.`}
            icon={Database}
          />
        ) : (
          <>
            <div className={cn("min-w-0 transition-opacity", rows.isPlaceholderData && "opacity-60")}>
              <DataTable
                caption={`${label} table`}
                columns={rows.data.columns}
                rows={rows.data.rows}
                rowKey={keyColumn}
                userNames={userNames}
                sort={activeSort}
                order={rows.data.order}
                onSort={handleSort}
                onOpenRow={setOpenRow}
              />
            </div>
            <Pagination page={rows.data.page} totalPages={rows.data.totalPages} total={rows.data.total} onPageChange={next => onChange({ page: next })} disabled={rows.isFetching} />
          </>
        )}
      </div>

      <RowDetailDialog
        table={table}
        tableLabel={label}
        tenantId={tenantId}
        keyColumn={keyColumn}
        columns={rows.data?.columns ?? []}
        row={openRow}
        userNames={userNames}
        onClose={() => setOpenRow(null)}
      />
    </section>
  );
}
