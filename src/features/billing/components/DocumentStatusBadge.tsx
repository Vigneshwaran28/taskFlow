import { Badge } from "@/components/ui/Badge";
import type { BillingDocument } from "../services/billingService";
import { statusMeta } from "../utils/billingMeta";

/** Status badge, plus "Overdue" / "Expired" when they apply. */
export function DocumentStatusBadge({ doc }: { doc: Pick<BillingDocument, "kind" | "status" | "isOverdue" | "isExpired"> }) {
  const meta = statusMeta(doc.kind, doc.status);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge tone={meta.tone}>{meta.label}</Badge>
      {doc.isOverdue && <Badge tone="danger">Overdue</Badge>}
      {doc.isExpired && <Badge tone="warning">Expired</Badge>}
    </span>
  );
}
