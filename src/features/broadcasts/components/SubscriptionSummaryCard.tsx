"use client";
// Feature component: the workspace's subscription (plan, end date, days left) for workspace admins, in Settings.
// Laid out like a settings section; renders nothing for everyone else (the API only sends it to admins).
import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import { useProviderInbox } from "../hooks/useBroadcasts";
import { subscriptionLine, subscriptionStatus } from "../utils/subscriptionText";

export function SubscriptionSummaryCard() {
  const { data } = useProviderInbox();
  const subscription = data?.subscription;
  if (!subscription) return null;
  const status = subscriptionStatus(subscription);
  const daysLeft = subscription.daysLeft;

  return (
    <section aria-labelledby="settings-subscription-heading" className="grid grid-cols-1 gap-6 border-b py-8 last:border-b-0 md:grid-cols-3">
      <div>
        <h2 id="settings-subscription-heading" className="font-semibold">
          Subscription
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Your plan with your provider. Contact them to change or renew it.</p>
      </div>
      <div className="md:col-span-2">
        <div className="flex max-w-xl flex-col gap-4 rounded-xl border bg-muted/30 p-4" data-testid="subscription-card">
          <div className="flex flex-wrap items-center gap-2">
            <CalendarClock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <span className="font-medium">{subscription.plan || "Subscription"}</span>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted-foreground">Plan</dt>
              <dd className="font-medium">{subscription.plan || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Ends on</dt>
              <dd className="font-medium">{subscription.endsOn ? formatDate(subscription.endsOn) : "No end date"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Days left</dt>
              <dd className="font-medium tabular-nums">{daysLeft == null ? "—" : Math.max(0, daysLeft)}</dd>
            </div>
          </dl>
          {subscription.endsOn && (
            <p className="text-sm text-muted-foreground">
              {subscriptionLine(subscription)}
              {subscription.graceDays > 0 && subscription.state !== "grace" && subscription.state !== "expired" && ` After the end date you have ${subscription.graceDays} grace day${subscription.graceDays === 1 ? "" : "s"}.`}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
