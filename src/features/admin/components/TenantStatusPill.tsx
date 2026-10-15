import { Badge, type Tone } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import type { TenantStatus, TenantSubscription } from "../services/adminService";

export interface TenantStatusPillProps {
  status: TenantStatus;
  subscription?: TenantSubscription;
  deletedAt?: string | null;
  className?: string;
}

/** Active, Ends in N days, In grace (ends X), Expired, Suspended, or In recycle bin. */
export function tenantStatus({ status, subscription, deletedAt }: Omit<TenantStatusPillProps, "className">): { label: string; tone: Tone; title?: string } {
  if (deletedAt) return { label: "In recycle bin", tone: "neutral" };
  if (status !== "active") return { label: "Suspended", tone: "danger" };
  const days = subscription?.daysLeft;
  const ends = subscription?.endsOn ? `Subscription ends ${formatDate(subscription.endsOn)}` : undefined;
  switch (subscription?.state) {
    case "ending":
      return { label: days === 0 ? "Ends today" : `Ends in ${days} day${days === 1 ? "" : "s"}`, tone: (days ?? 0) <= 7 ? "danger" : "warning", title: ends };
    case "grace":
      return { label: `In grace (ends ${formatDate(subscription.graceEndsOn)})`, tone: "warning", title: `${ends}; sign-in stops after ${formatDate(subscription.graceEndsOn)}` };
    case "expired":
      return { label: "Expired", tone: "danger", title: `${ends}; grace period over: nobody can sign in` };
    default:
      return { label: "Active", tone: "success", title: ends };
  }
}

/** Presentational: a tenant's lifecycle and subscription status as one pill. */
export function TenantStatusPill({ className, ...props }: TenantStatusPillProps) {
  const { label, tone, title } = tenantStatus(props);
  return (
    <span title={title} className="inline-flex">
      <Badge tone={tone} className={className}>
        {label}
      </Badge>
    </span>
  );
}
