"use client";
// Overview tab: headline numbers, the status mix, and open shipments per carrier.
import { AlarmClock, Banknote, CalendarClock, CheckCircle2, Gauge, PackageOpen } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { StatCard } from "@/components/shared/StatCard";
import { formatInteger, formatMoney } from "@/lib/format";
import { useLogisticsSummary } from "../hooks/useLogistics";
import type { Summary } from "../services/logisticsService";
import { SHIPMENT_STATUSES, STATUS_ORDER } from "../utils/logisticsMeta";

export function OverviewPanel() {
  const { data, isPending, error, refetch } = useLogisticsSummary();
  if (isPending) return <LoadingState label="Loading overview…" />;
  if (error) return <ErrorState message="Unable to load the logistics overview." onRetry={() => void refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Open shipments" value={formatInteger(data.open)} icon={PackageOpen} href="/logistics?tab=shipments" hint={`${formatInteger(data.total)} in total`} />
        <StatCard label="Due today" value={formatInteger(data.dueToday)} icon={CalendarClock} tone="info" />
        <StatCard label="Overdue" value={formatInteger(data.overdue)} icon={AlarmClock} tone={data.overdue ? "danger" : "success"} href="/logistics?tab=shipments&overdue=true" />
        <StatCard label="Delivered this week" value={formatInteger(data.deliveredThisWeek)} icon={CheckCircle2} tone="success" />
        <StatCard
          label="On-time rate"
          value={data.onTimeRate === null ? "—" : `${data.onTimeRate}%`}
          icon={Gauge}
          tone={data.onTimeRate === null || data.onTimeRate >= 90 ? "primary" : data.onTimeRate >= 70 ? "warning" : "danger"}
          hint="Deliveries in the last 30 days"
        />
        <StatCard
          label="COD to collect"
          value={formatMoney(data.codToCollect.amount)}
          icon={Banknote}
          tone="warning"
          hint={`${formatInteger(data.codToCollect.count)} shipment${data.codToCollect.count === 1 ? "" : "s"} on the road`}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <StatusBreakdown summary={data} />
        <CarrierBreakdown summary={data} />
      </div>
    </div>
  );
}

function StatusBreakdown({ summary }: { summary: Summary }) {
  const statuses = STATUS_ORDER.filter(status => summary.byStatus[status] > 0);
  return (
    <section aria-labelledby="logistics-status-mix" className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 id="logistics-status-mix" className="font-semibold">
        Status breakdown
      </h2>
      {summary.total === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No shipments yet.</p>
      ) : (
        <>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={statuses.map(status => `${SHIPMENT_STATUSES[status].label}: ${summary.byStatus[status]}`).join(", ")}>
            {statuses.map(status => (
              <span key={status} className={SHIPMENT_STATUSES[status].bar} style={{ width: `${(summary.byStatus[status] / summary.total) * 100}%` }} />
            ))}
          </div>
          <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {STATUS_ORDER.map(status => (
              <li key={status} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${SHIPMENT_STATUSES[status].bar}`} />
                  {SHIPMENT_STATUSES[status].label}
                </span>
                <span className="tabular-nums text-muted-foreground">{formatInteger(summary.byStatus[status])}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function CarrierBreakdown({ summary }: { summary: Summary }) {
  const max = Math.max(1, ...summary.byCarrier.map(row => row.count));
  return (
    <section aria-labelledby="logistics-by-carrier" className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 id="logistics-by-carrier" className="font-semibold">
        Open shipments by carrier
      </h2>
      {summary.byCarrier.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nothing on the road.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3 text-sm">
          {summary.byCarrier.map(row => (
            <li key={row.carrier?.id ?? "own"}>
              <div className="flex items-center justify-between gap-2">
                <span className={row.carrier ? undefined : "text-muted-foreground"}>{row.carrier?.name ?? "Own fleet / unassigned"}</span>
                <span className="tabular-nums text-muted-foreground">{formatInteger(row.count)}</span>
              </div>
              <div aria-hidden="true" className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(row.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
