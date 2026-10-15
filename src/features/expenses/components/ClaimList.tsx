import type { ReactNode } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { Badge, type Tone } from "@/components/ui/Badge";
import { formatDay, formatMoney } from "@/lib/format";
import type { ClaimStatus, ExpenseClaim } from "../services/expenseService";

export const CLAIM_STATUSES: Readonly<Record<ClaimStatus, { label: string; tone: Tone }>> = Object.freeze({
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "info" },
  rejected: { label: "Rejected", tone: "danger" },
  paid: { label: "Paid", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
});

export interface ClaimListProps {
  claims: ExpenseClaim[];
  showPerson?: boolean;
  renderActions?: (claim: ExpenseClaim) => ReactNode;
}

/** Presentational: expense claims with an optional actions slot per row. */
export function ClaimList({ claims, showPerson = false, renderActions }: ClaimListProps) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {claims.map(claim => {
        const status = CLAIM_STATUSES[claim.status];
        return (
          <li key={claim.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {showPerson && <Avatar name={claim.user.name} />}
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{claim.key}</span>
                  <span className="font-medium">{claim.title}</span>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </p>
                <p className="text-sm text-muted-foreground">
                  {showPerson ? `${claim.user.name} · ` : ""}
                  {claim.category} · spent {formatDay(claim.spentOn)}
                </p>
                {claim.notes && <p className="mt-0.5 text-sm text-muted-foreground">“{claim.notes}”</p>}
                {claim.reviewer && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Reviewed by {claim.reviewer.name}
                    {claim.reviewNote ? `: ${claim.reviewNote}` : ""}
                  </p>
                )}
              </div>
            </div>
            <p className="text-lg font-semibold tabular-nums md:w-36 md:text-right">{formatMoney(claim.amount)}</p>
            {renderActions && <div className="flex flex-wrap gap-2 md:w-auto md:justify-end">{renderActions(claim)}</div>}
          </li>
        );
      })}
    </ul>
  );
}
