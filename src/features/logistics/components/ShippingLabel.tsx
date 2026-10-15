// Printable delivery note / shipping label. On screen it's a card; printed, it's the only thing on the page.
import { formatDate, formatMoney } from "@/lib/format";
import type { ShipmentDetail } from "../services/logisticsService";
import { SERVICES, cityRoute } from "../utils/logisticsMeta";

export function ShippingLabel({ shipment, company }: { shipment: ShipmentDetail; company: string }) {
  return (
    <section aria-labelledby="shipping-label-title" className="print-area rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{company}</p>
          <h2 id="shipping-label-title" className="text-lg font-semibold">
            Delivery note · {shipment.number}
          </h2>
          <p className="text-sm text-muted-foreground">
            {SERVICES[shipment.service].label}
            {shipment.shipDate ? ` · shipped ${formatDate(shipment.shipDate)}` : ""}
            {shipment.expectedOn ? ` · expected ${formatDate(shipment.expectedOn)}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tracking code</p>
          <p className="font-mono text-3xl font-bold tracking-widest">{shipment.trackingCode}</p>
        </div>
      </div>
      <div className="grid gap-6 py-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deliver to</p>
          <p className="mt-1 text-lg font-semibold">{shipment.recipientName}</p>
          {shipment.recipientPhone && <p className="text-sm">{shipment.recipientPhone}</p>}
          <p className="mt-1 whitespace-pre-line text-sm">{shipment.recipientAddress}</p>
          {shipment.destinationCity && <p className="text-sm font-medium">{shipment.destinationCity}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">From</p>
          <p className="mt-1 font-medium">{shipment.senderName || company}</p>
          {shipment.senderAddress && <p className="whitespace-pre-line text-sm">{shipment.senderAddress}</p>}
          {shipment.originCity && <p className="text-sm">{shipment.originCity}</p>}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-4 border-t pt-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Packages</dt>
          <dd className="text-lg font-semibold tabular-nums">{shipment.packages}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Weight</dt>
          <dd className="text-lg font-semibold tabular-nums">{shipment.weightKg ? `${shipment.weightKg} kg` : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Route</dt>
          <dd className="font-medium">{cityRoute(shipment.originCity, shipment.destinationCity) || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Cash on delivery</dt>
          <dd className="text-lg font-semibold tabular-nums">{shipment.codAmount ? formatMoney(shipment.codAmount) : "None"}</dd>
        </div>
      </dl>
      <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
        <div className="border-t pt-1 text-xs text-muted-foreground">Received by (name)</div>
        <div className="border-t pt-1 text-xs text-muted-foreground">Signature and date</div>
      </div>
    </section>
  );
}
