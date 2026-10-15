"use client";
import { RequireFeature } from "@/app-shell/guards";
import { ProductPage } from "@/features/inventory";

export default function Page() {
  return (
    <RequireFeature feature="inventory">
      <ProductPage />
    </RequireFeature>
  );
}
