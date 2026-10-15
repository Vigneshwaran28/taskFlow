"use client";
// /track/[code]: public shipment progress. No sign-in and no personal details (the API leaves them out).
import { useParams } from "next/navigation";
import { CalendarDays, MapPin, Package, SearchX, Truck } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { ApiError } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { usePublicChannel, type RealtimeStatus } from "@/realtime";
import { EventTimeline } from "../components/EventTimeline";
import { PublicShell } from "../components/PublicShell";
import { ShipmentStatusBadge } from "../components/ShipmentStatusBadge";
import { TrackingLookupForm } from "../components/TrackingLookupForm";
import { TrackingStepper } from "../components/TrackingStepper";
import { usePublicTracking } from "../hooks/useLogistics";
import type { PublicTracking } from "../services/logisticsService";
import { SERVICES } from "../utils/logisticsMeta";

/** Public channels only accept 6–24 letters and digits (see docs/REALTIME.md). */
const CHANNEL_CODE = /^[A-Z0-9]{6,24}$/;

export function TrackingPage() {
  const params = useParams<{ code: string }>();
  const code = safeDecode(params.code ?? "").trim().toUpperCase();
  const { data, isPending, error, refetch } = usePublicTracking(code);

  // Live: the shipment's public channel says when its status or history changed; the page re-fetches over HTTP.
  const liveStatus = usePublicChannel(data && CHANNEL_CODE.test(code) ? `track:${code}` : null, event => {
    if (event.type === "tracking.updated") void refetch();
  });

  let content;
  if (isPending) content = <LoadingState label="Finding your shipment…" />;
  else if (error instanceof ApiError && error.status === 404) content = <NotFound code={code} />;
  else if (error) content = <ErrorState message="We couldn't load tracking right now. Please try again." onRetry={() => void refetch()} />;
  else content = <TrackingDetails tracking={data} live={liveStatus} />;

  return (
    <PublicShell company={data?.company}>
      {content}
      <section aria-labelledby="track-another" className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 id="track-another" className="mb-3 font-semibold">
          Track another shipment
        </h2>
        <TrackingLookupForm />
      </section>
    </PublicShell>
  );
}

function NotFound({ code }: { code: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
      <span className="rounded-full bg-accent p-3">
        <SearchX className="h-6 w-6 text-accent-foreground" aria-hidden="true" />
      </span>
      <h1 className="text-xl font-semibold">We couldn&apos;t find that shipment</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        No shipment matches <span className="font-mono font-medium text-foreground">{code || "that code"}</span>. Check the code for typos, or ask the sender for the latest
        tracking link.
      </p>
    </div>
  );
}

const LIVE_LABELS: Record<RealtimeStatus, string> = {
  live: "Live: this page updates as soon as the shipment moves",
  connecting: "Connecting to live updates…",
  offline: "Live updates paused; the page still refreshes every few minutes",
};

/** A small dot showing whether this page is receiving live updates. */
function LiveBadge({ status }: { status: RealtimeStatus }) {
  return (
    <span role="status" aria-label={LIVE_LABELS[status]} title={LIVE_LABELS[status]} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden="true"
        className={cn("h-2 w-2 rounded-full", status === "live" ? "bg-emerald-500" : status === "connecting" ? "animate-pulse bg-amber-500 motion-reduce:animate-none" : "bg-slate-400")}
      />
      {status === "live" ? "Live" : status === "connecting" ? "Connecting…" : "Offline"}
    </span>
  );
}

function TrackingDetails({ tracking, live }: { tracking: PublicTracking; live: RealtimeStatus }) {
  const route = [tracking.originCity, tracking.destinationCity];
  return (
    <>
      <section aria-labelledby="tracking-title" className="flex flex-col gap-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>Shipment {tracking.number}</span>
              <LiveBadge status={live} />
            </p>
            <h1 id="tracking-title" className="font-mono text-2xl font-bold tracking-widest">
              {tracking.trackingCode}
            </h1>
          </div>
          <ShipmentStatusBadge status={tracking.status} className="self-start px-4 py-1.5 text-base" />
        </div>

        <TrackingStepper status={tracking.status} history={tracking.events.map(event => event.status)} />

        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div className="flex gap-3">
            <dt>
              <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">{tracking.deliveredAt ? "Delivered" : "Expected delivery"}</span>
            </dt>
            <dd>
              <span className="block text-xs text-muted-foreground" aria-hidden="true">
                {tracking.deliveredAt ? "Delivered" : "Expected delivery"}
              </span>
              <span className="font-medium">{tracking.deliveredAt ? formatDateTime(tracking.deliveredAt) : tracking.expectedOn ? formatDate(tracking.expectedOn) : "To be confirmed"}</span>
            </dd>
          </div>
          <div className="flex gap-3">
            <dt>
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Route</span>
            </dt>
            <dd>
              <span className="block text-xs text-muted-foreground" aria-hidden="true">
                Route
              </span>
              <span className="font-medium">
                {route[0] || "—"} <span aria-hidden="true">→</span>
                <span className="sr-only">to</span> {route[1] || "—"}
              </span>
            </dd>
          </div>
          <div className="flex gap-3">
            <dt>
              <Package className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Packages and service</span>
            </dt>
            <dd>
              <span className="block text-xs text-muted-foreground" aria-hidden="true">
                Service
              </span>
              <span className="font-medium">
                {SERVICES[tracking.service]?.label ?? tracking.service} · {tracking.packages} package{tracking.packages === 1 ? "" : "s"}
              </span>
            </dd>
          </div>
        </dl>
        {tracking.carrier && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="h-4 w-4" aria-hidden="true" />
            Carrier: {tracking.carrier.name}
          </p>
        )}
      </section>

      <section aria-labelledby="tracking-history" className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <h2 id="tracking-history" className="mb-4 font-semibold">
          Tracking history
        </h2>
        <EventTimeline events={tracking.events} />
      </section>
    </>
  );
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
