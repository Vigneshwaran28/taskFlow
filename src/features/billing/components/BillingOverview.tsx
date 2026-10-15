"use client";
import Link from "@/components/navigation/Link";
import { ArrowRight, FileText } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useBillingSummary } from "../hooks/useBilling";

/** Home-page widget: receivables at a glance. Quiet while loading or on error. */
export function BillingOverview() {
  const { data } = useBillingSummary();
  if (!data) return null;

  const figures = [
    { label: "Outstanding", value: formatMoney(data.outstanding), className: "" },
    {
      label: "Overdue", // the count is in the home page's "Needs your attention" strip
      value: formatMoney(data.overdue.amount),
      className: data.overdue.count ? "text-destructive" : "",
    },
    { label: "Paid this month", value: formatMoney(data.paidThisMonth), className: "text-success" },
  ];

  return (
    <section aria-labelledby="billing-overview-title" className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 id="billing-overview-title" className="flex items-center gap-2 font-semibold">
          <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
          Billing
        </h2>
        <Link href="/billing" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none">
          Open billing
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        {figures.map(figure => (
          <div key={figure.label} className="min-w-0">
            <dt className="truncate text-xs text-muted-foreground">{figure.label}</dt>
            <dd className={cn("truncate text-lg font-semibold tabular-nums", figure.className)}>{figure.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
