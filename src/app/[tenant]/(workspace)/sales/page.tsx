"use client";
import { RequireFeature } from "@/app-shell/guards";
import { SalesPage } from "@/features/sales";

export default function Page() {
  return (
    <RequireFeature feature="sales">
      <SalesPage />
    </RequireFeature>
  );
}
