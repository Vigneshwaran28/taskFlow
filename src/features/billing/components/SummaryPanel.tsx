"use client";
import Link from "@/components/navigation/Link";
import { AlertTriangle, CheckCircle2, FilePen, Wallet } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { formatDate, formatInteger, formatMoney } from "@/lib/format";
import { useBillingSummary } from "../hooks/useBilling";
import type { AgingBuckets, BillingSummary } from "../services/billingService";
import { AGING_BUCKETS, paymentMethodLabel } from "../utils/billingMeta";

function AgingCard({ aging, outstanding }: { aging: AgingBuckets; outstanding: number }) {
  const total = AGING_BUCKETS.reduce((sum, bucket) => sum + aging[bucket.key], 0);
  return (
    <section aria-labelledby="billing-aging-title" className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="billing-aging-title" className="font-semibold">
          Receivables aging
        </h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium tabular-nums text-foreground">{formatMoney(outstanding)}</span> outstanding
        </p>
      </div>
      {total > 0 ? (
        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          {AGING_BUCKETS.map(bucket =>
            aging[bucket.key] > 0 ? <div key={bucket.key} className={bucket.className} style={{ width: `${(aging[bucket.key] / total) * 100}%` }} /> : null
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Nothing outstanding. Every issued invoice is paid.</p>
      )}
      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">Outstanding balance by days past due</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Age</th>
            <th scope="col">Amount</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {AGING_BUCKETS.map(bucket => (
            <tr key={bucket.key}>
              <th scope="row" className="py-2 text-left font-normal">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${bucket.className}`} />
                  {bucket.label}
                </span>
              </th>
              <td className="py-2 text-right font-medium tabular-nums">{formatMoney(aging[bucket.key])}</td>
              <td className="w-16 py-2 text-right tabular-nums text-muted-foreground">{total > 0 ? `${Math.round((aging[bucket.key] / total) * 100)}%` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function RecentPayments({ payments }: { payments: BillingSummary["recentPayments"] }) {
  return (
    <section aria-labelledby="billing-recent-title" className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 id="billing-recent-title" className="font-semibold">
        Recent payments
      </h2>
      {payments.length ? (
        <ul className="mt-3 divide-y">
          {payments.map(payment => (
            <li key={payment.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <Link href={`/billing/${payment.invoice.id}`} className="font-mono font-medium hover:underline focus-visible:underline focus-visible:outline-none">
                  {payment.invoice.number}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {payment.invoice.billToName} · {paymentMethodLabel(payment.method)} · {formatDate(payment.paidOn)}
                </p>
              </div>
              <span className="font-medium tabular-nums text-success">{formatMoney(payment.amount)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No payments recorded yet.</p>
      )}
    </section>
  );
}

function TopCustomers({ customers }: { customers: BillingSummary["topCustomers"] }) {
  return (
    <section aria-labelledby="billing-top-title" className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 id="billing-top-title" className="font-semibold">
        Top customers <span className="text-sm font-normal text-muted-foreground">this year</span>
      </h2>
      {customers.length ? (
        <ol className="mt-3 divide-y">
          {customers.map((customer, index) => (
            <li key={customer.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="flex min-w-0 items-center gap-3">
                <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatInteger(customer.invoiceCount)} invoice{customer.invoiceCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <span className="font-medium tabular-nums">{formatMoney(customer.total)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Issue invoices to customers to see who bills the most.</p>
      )}
    </section>
  );
}

/** Feature component: the Overview tab (receivables at a glance). */
export function SummaryPanel() {
  const { data, isPending, error, refetch } = useBillingSummary();
  if (isPending) return <LoadingState label="Loading billing summary…" />;
  if (error) return <ErrorState message="Unable to load the billing summary." onRetry={() => void refetch()} />;
  if (!data) return <EmptyState title="No billing data yet" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Outstanding" value={formatMoney(data.outstanding)} icon={Wallet} href="/billing?tab=invoices" hint="Issued invoices not yet paid" />
        <StatCard
          label="Overdue"
          value={formatMoney(data.overdue.amount)}
          icon={AlertTriangle}
          tone={data.overdue.count ? "danger" : "success"}
          href="/billing?tab=invoices&overdue=1"
          hint={`${formatInteger(data.overdue.count)} invoice${data.overdue.count === 1 ? "" : "s"} past due`}
        />
        <StatCard label="Paid this month" value={formatMoney(data.paidThisMonth)} icon={CheckCircle2} tone="success" />
        <StatCard label="Drafts" value={formatInteger(data.draftCount)} icon={FilePen} tone="warning" href="/billing?tab=invoices&status=draft" hint="Invoices and quotes not yet sent" />
      </div>
      <AgingCard aging={data.aging} outstanding={data.outstanding} />
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentPayments payments={data.recentPayments} />
        <TopCustomers customers={data.topCustomers} />
      </div>
    </div>
  );
}
