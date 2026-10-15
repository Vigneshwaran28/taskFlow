"use client";
import { AlertTriangle, Boxes, PackageX, Wallet } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { formatMoney } from "@/lib/format";
import { useInventorySummary } from "../hooks/useInventory";

/** Feature component: stock totals. Quiet while loading; each alert card filters the list. */
export function InventoryOverview() {
  const { data } = useInventorySummary();
  if (!data) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Active products" value={data.products} icon={Boxes} href="/inventory" />
      <StatCard label="Stock value (at cost)" value={formatMoney(data.stockValue)} icon={Wallet} tone="success" />
      <StatCard label="Low stock" value={data.lowStock} icon={AlertTriangle} tone="warning" href="/inventory?stock=low" />
      <StatCard label="Out of stock" value={data.outOfStock} icon={PackageX} tone="danger" href="/inventory?stock=out" />
    </div>
  );
}
