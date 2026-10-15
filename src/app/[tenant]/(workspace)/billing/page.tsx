"use client";
import { RequireFeature } from "@/app-shell/guards";
import { BillingPage } from "@/features/billing";

export default function BillingRoute() {
  return (
    <RequireFeature feature="billing">
      <BillingPage />
    </RequireFeature>
  );
}
