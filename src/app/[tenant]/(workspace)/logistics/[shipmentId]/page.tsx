"use client";
import { RequireFeature } from "@/app-shell/guards";
import { ShipmentPage } from "@/features/logistics";

export default function Page() {
  return (
    <RequireFeature feature="logistics">
      <ShipmentPage />
    </RequireFeature>
  );
}
