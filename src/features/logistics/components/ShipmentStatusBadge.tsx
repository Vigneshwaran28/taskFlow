import { Badge } from "@/components/ui/Badge";
import type { ShipmentStatus } from "../services/logisticsService";
import { SHIPMENT_STATUSES } from "../utils/logisticsMeta";

export function ShipmentStatusBadge({ status, className }: { status: ShipmentStatus; className?: string }) {
  const meta = SHIPMENT_STATUSES[status] ?? { label: status, tone: "neutral" as const };
  return (
    <Badge tone={meta.tone} className={className}>
      {meta.label}
    </Badge>
  );
}
