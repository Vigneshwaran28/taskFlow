"use client";
import { RequireFeature } from "@/app-shell/guards";
import { BillingDocumentPage } from "@/features/billing";

export default function BillingDocumentRoute() {
  return (
    <RequireFeature feature="billing">
      <BillingDocumentPage />
    </RequireFeature>
  );
}
