"use client";
import { Percent, Target, Trophy, Users, Wallet } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { formatMoney } from "@/lib/format";
import { useSalesSummary } from "../hooks/useSales";

/** Feature component: pipeline and revenue figures for this month. Quiet while loading. */
export function SalesOverview() {
  const { data } = useSalesSummary();
  if (!data) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      <StatCard label="Open pipeline" value={formatMoney(data.openPipeline.value)} icon={Target} href="/sales" />
      <StatCard label="Won this month" value={formatMoney(data.wonThisMonth.value)} icon={Trophy} tone="success" />
      <StatCard label="Revenue this month" value={formatMoney(data.revenueThisMonth)} icon={Wallet} tone="success" href="/sales?tab=orders" />
      <StatCard label="Win rate" value={data.winRate == null ? "—" : `${data.winRate}%`} icon={Percent} tone="warning" />
      <StatCard label="Customers" value={data.customers} icon={Users} href="/sales?tab=customers" />
    </div>
  );
}
