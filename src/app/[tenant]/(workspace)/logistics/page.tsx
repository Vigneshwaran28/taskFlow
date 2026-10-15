"use client";
import { RequireFeature } from "@/app-shell/guards";
import { LogisticsPage } from "@/features/logistics";

export default function Page() {
  return (
    <RequireFeature feature="logistics">
      <LogisticsPage />
    </RequireFeature>
  );
}
