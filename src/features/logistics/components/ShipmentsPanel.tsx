"use client";
// Shipments tab: URL-backed filters, the shipment table, pagination, and CSV export.
import Link from "@/components/navigation/Link";
import { useEffect, useState } from "react";
import { Download, PackageSearch, X } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useCan } from "@/features/auth";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/cn";
import { formatDay } from "@/lib/format";
import { useSearchParamsState } from "@/lib/navigation";
import { useCarriers, useDrivers, useShipments } from "../hooks/useLogistics";
import { logisticsService, type ShipmentFilters } from "../services/logisticsService";
import { DIRECTIONS, SERVICES, SHIPMENT_STATUSES, isDirection, isShipmentStatus, toOptions } from "../utils/logisticsMeta";
import { ShipmentStatusBadge } from "./ShipmentStatusBadge";

const FILTER_KEYS = ["status", "direction", "carrier", "driver", "overdue", "q", "from", "to", "page"] as const;
const positiveInt = (value: string | null) => (value && /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : undefined);
const day = (value: string | null) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined);

export function ShipmentsPanel() {
  const [params, setParams] = useSearchParamsState();
  const statusParam = params.get("status");
  const directionParam = params.get("direction");
  const filters: ShipmentFilters = {
    status: isShipmentStatus(statusParam) ? statusParam : undefined,
    direction: isDirection(directionParam) ? directionParam : undefined,
    carrierId: positiveInt(params.get("carrier")),
    driverId: positiveInt(params.get("driver")),
    overdue: params.get("overdue") === "true" || undefined,
    search: params.get("q")?.trim() || undefined,
    from: day(params.get("from")),
    to: day(params.get("to")),
    page: positiveInt(params.get("page")) ?? 1,
  };
  // The API rejects an end date before the start date: flag it on the field and leave it out of the query.
  const rangeError = filters.from && filters.to && filters.to < filters.from ? "The end date can't be before the start date." : null;
  if (rangeError) filters.to = undefined;
  const { data, isPending, isFetching, isPlaceholderData, error, refetch } = useShipments(filters);
  const carriers = useCarriers("all");
  const drivers = useDrivers();

  // Search box: type freely, the URL (and the query) follows once typing pauses.
  const urlSearch = params.get("q") ?? "";
  const [search, setSearch] = useState(urlSearch);
  const debouncedSearch = useDebounce(search.trim(), 350);
  const [previousUrlSearch, setPreviousUrlSearch] = useState(urlSearch);
  if (urlSearch !== previousUrlSearch) {
    setPreviousUrlSearch(urlSearch);
    // Changed elsewhere (back button, a link, "Clear filters"), not by this box: show it.
    if (urlSearch !== debouncedSearch) setSearch(urlSearch);
  }
  // Only a settled value (typing paused on it) that the URL doesn't have yet.
  const pendingSearch = debouncedSearch === search.trim() && debouncedSearch !== urlSearch ? debouncedSearch : null;
  useEffect(() => {
    if (pendingSearch === null) return;
    setParams(current => {
      if (pendingSearch) current.set("q", pendingSearch);
      else current.delete("q");
      current.delete("page");
      return current;
    });
    // Runs only when a new debounced value is waiting; setParams changes with every URL change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSearch]);

  function setFilter(name: (typeof FILTER_KEYS)[number], value: string | null) {
    setParams(current => {
      if (value) current.set(name, value);
      else current.delete(name);
      if (name !== "page") current.delete("page");
      return current;
    });
  }

  function clearFilters() {
    setSearch("");
    setParams(current => {
      FILTER_KEYS.forEach(key => current.delete(key));
      return current;
    });
  }

  const hasFilters = FILTER_KEYS.some(key => key !== "page" && params.get(key));
  const canExport = useCan("logistics.view", "logistics.edit", "logistics.dispatch");
  const exportHref = logisticsService.exportUrl({ from: filters.from, to: filters.to, status: filters.status });

  let body;
  if (isPending) body = <LoadingState label="Loading shipments…" />;
  else if (error) body = <ErrorState message="Unable to load shipments." onRetry={() => void refetch()} />;
  else if (!data.items.length) {
    body = (
      <EmptyState
        icon={PackageSearch}
        title={hasFilters ? "No shipments match these filters" : "No shipments yet"}
        message={hasFilters ? "Try different filters or clear them." : "Book a shipment to start tracking deliveries."}
        action={
          hasFilters ? (
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    body = (
      <div className="flex flex-col gap-2" aria-busy={isFetching}>
        <div className={cn("relative overflow-x-auto rounded-xl border bg-card", isPlaceholderData && "opacity-60")}>
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Shipments</caption>
            <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2.5 font-semibold">Shipment</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Tracking</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Recipient</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Carrier</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Driver</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Expected</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Service</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map(shipment => (
                <tr key={shipment.id} className="hover:bg-muted/40">
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <Link href={`/logistics/${shipment.id}`} className="font-mono font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none">
                      {shipment.number}
                    </Link>
                    {shipment.direction !== "outbound" && <span className="ml-2 text-xs text-muted-foreground">{DIRECTIONS[shipment.direction].label}</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted-foreground">{shipment.trackingCode}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium">{shipment.recipientName ?? "—"}</p>
                    {shipment.destinationCity && <p className="text-xs text-muted-foreground">{shipment.destinationCity}</p>}
                  </td>
                  <td className="px-3 py-2.5">{shipment.carrier?.name ?? <span className="text-muted-foreground">Own fleet</span>}</td>
                  <td className="px-3 py-2.5">{shipment.driver?.name ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className={cn("whitespace-nowrap px-3 py-2.5 tabular-nums", shipment.isOverdue ? "font-medium text-destructive" : "text-muted-foreground")}>
                    {shipment.expectedOn ? formatDay(shipment.expectedOn) : "—"}
                    {shipment.isOverdue && <span className="sr-only"> (overdue)</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <ShipmentStatusBadge status={shipment.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={SERVICES[shipment.service].tone}>{SERVICES[shipment.service].label}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={page => setFilter("page", page > 1 ? String(page) : null)} disabled={isFetching} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <TextField
            label="Search"
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Number, tracking code, recipient, city…"
            maxLength={100}
            className="flex-1"
          />
          <div className="flex gap-2">
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                <X className="h-4 w-4" aria-hidden="true" />
                Clear filters
              </Button>
            )}
            {canExport && (
              <a href={exportHref} download className={buttonClass("secondary")}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Export CSV
              </a>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <SelectField label="Status" value={filters.status ?? ""} onChange={event => setFilter("status", event.target.value)} options={[{ value: "", label: "All statuses" }, ...toOptions(SHIPMENT_STATUSES)]} />
          <SelectField label="Direction" value={filters.direction ?? ""} onChange={event => setFilter("direction", event.target.value)} options={[{ value: "", label: "All directions" }, ...toOptions(DIRECTIONS)]} />
          <SelectField
            label="Carrier"
            value={filters.carrierId ? String(filters.carrierId) : ""}
            onChange={event => setFilter("carrier", event.target.value)}
            options={[{ value: "", label: "All carriers" }, ...(carriers.data ?? []).map(carrier => ({ value: String(carrier.id), label: carrier.name }))]}
          />
          <SelectField
            label="Driver"
            value={filters.driverId ? String(filters.driverId) : ""}
            onChange={event => setFilter("driver", event.target.value)}
            options={[{ value: "", label: "All drivers" }, ...(drivers.data ?? []).map(driver => ({ value: String(driver.id), label: driver.name }))]}
          />
          <TextField label="Booked from" type="date" value={filters.from ?? ""} max={filters.to} onChange={event => setFilter("from", event.target.value)} />
          <TextField label="Booked to" type="date" value={day(params.get("to")) ?? ""} min={filters.from} onChange={event => setFilter("to", event.target.value)} error={rangeError} />
          <label className="flex h-10 cursor-pointer items-center gap-2 self-end rounded-lg border border-input px-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
            <input type="checkbox" checked={Boolean(filters.overdue)} onChange={event => setFilter("overdue", event.target.checked ? "true" : null)} className="accent-primary" />
            Overdue only
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Export uses the status and booking dates; the list refreshes every minute.</p>
      </div>
      {body}
    </div>
  );
}
