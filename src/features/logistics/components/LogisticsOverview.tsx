"use client";
// Home widget (logistics.view): open shipments, due today, and delivered this week. Overdue shipments and the person's own
// deliveries are in the home page's "Needs your attention" strip, so they aren't repeated here.
import Link from "@/components/navigation/Link";
import { CalendarClock, PackageCheck, PackageOpen, Truck } from "lucide-react";
import { useCan } from "@/features/auth";
import { cn } from "@/lib/cn";
import { formatInteger } from "@/lib/format";
import { useLogisticsSummary } from "../hooks/useLogistics";

export function LogisticsOverview() {
  const seesAll = useCan("logistics.view");
  const { data, isPending, error } = useLogisticsSummary({ enabled: seesAll });
  if (!seesAll) return null;

  const items = data
    ? [
        { label: "Open", value: data.open, icon: PackageOpen, href: "/logistics?tab=shipments", tone: "text-primary" },
        { label: "Due today", value: data.dueToday, icon: CalendarClock, href: "/logistics?tab=shipments", tone: "text-sky-600 dark:text-sky-300" },
        { label: "Delivered this week", value: data.deliveredThisWeek, icon: PackageCheck, href: "/logistics?tab=shipments", tone: "text-success" },
      ]
    : [];

  return (
    <section aria-labelledby="logistics-overview-title" className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 id="logistics-overview-title" className="flex items-center gap-2 font-semibold">
          <Truck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Logistics
        </h2>
        <Link href="/logistics" className="text-sm font-medium text-primary hover:underline">
          Open
        </Link>
      </div>
      {isPending ? (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Loading…
        </p>
      ) : error ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          Unable to load shipments.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-3 gap-3">
          {items.map(item => (
            <li key={item.label}>
              <Link href={item.href} className="flex flex-col gap-1 rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <item.icon className={cn("h-4 w-4", item.tone)} aria-hidden="true" />
                <span className="text-2xl font-semibold tabular-nums">{formatInteger(item.value)}</span>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
