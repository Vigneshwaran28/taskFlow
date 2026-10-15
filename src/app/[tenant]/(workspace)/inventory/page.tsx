"use client";
import { RequireFeature } from "@/app-shell/guards";
import { InventoryPage } from "@/features/inventory";

export default function Page() {
  return (
    <RequireFeature feature="inventory">
      <InventoryPage />
    </RequireFeature>
  );
}
