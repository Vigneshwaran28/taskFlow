import { ArrowDown, ArrowUp, ArrowUpDown, PanelRightOpen } from "lucide-react";
import type { SortOrder, TableRow } from "../services/adminService";
import { formatCell } from "../utils/formatCell";

/** Columns whose value is a user id: their cells also show the user's name. */
export const USER_ID_COLUMNS = new Set(["user_id", "created_by", "recorded_by", "actor_id", "driver_id", "provider_id", "author_id", "requester_id", "owner_id"]);

export interface DataTableProps {
  /** Screen-reader description of the table */
  caption: string;
  columns: string[];
  rows: TableRow[];
  /** Primary key column */
  rowKey: string;
  /** user id -> name, used to label user id cells */
  userNames: Map<number, string>;
  /** Column currently sorted */
  sort: string;
  order: SortOrder;
  onSort: (column: string) => void;
  onOpenRow: (row: TableRow) => void;
}

/** Presentational: every column and value of a database table, with sortable headers. */
export function DataTable({ caption, columns, rows, rowKey, userNames, sort, order, onSort, onOpenRow }: DataTableProps) {
  return (
    <div className="relative overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b bg-muted/60">
          <tr>
            {columns.map(column => {
              const active = column === sort;
              const SortIcon = !active ? ArrowUpDown : order === "asc" ? ArrowUp : ArrowDown;
              return (
                <th key={column} scope="col" aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"} className="whitespace-nowrap p-0">
                  <button
                    type="button"
                    onClick={() => onSort(column)}
                    className="flex w-full items-center gap-1 px-3 py-2.5 font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    {column}
                    <SortIcon className={active ? "h-3.5 w-3.5 text-primary" : "h-3.5 w-3.5 opacity-40"} aria-hidden="true" />
                  </button>
                </th>
              );
            })}
            <th scope="col" className="px-3 py-2.5">
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, index) => {
            const key = row[rowKey];
            const label = key === null || key === undefined ? String(index + 1) : String(key);
            return (
              <tr key={label} onClick={() => onOpenRow(row)} className="cursor-pointer hover:bg-muted/40">
                {columns.map(column => {
                  const text = formatCell(column, row[column]);
                  const userName = USER_ID_COLUMNS.has(column) ? userNames.get(Number(row[column])) : undefined;
                  return (
                    <td key={column} className="max-w-72 px-3 py-2 align-top tabular-nums">
                      {text === null ? (
                        <span className="text-muted-foreground/70">null</span>
                      ) : (
                        <span className="block truncate" title={text}>
                          {text}
                          {userName && <span className="ml-1.5 text-muted-foreground">({userName})</span>}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-right">
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      onOpenRow(row);
                    }}
                    aria-label={`Open row ${label}`}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
