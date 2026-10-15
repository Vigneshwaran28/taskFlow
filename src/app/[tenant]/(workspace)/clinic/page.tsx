"use client";
import { RequireFeature } from "@/app-shell/guards";
import { ClinicPage } from "@/features/clinic";

export default function Page() {
  return (
    <RequireFeature feature="clinic">
      <ClinicPage />
    </RequireFeature>
  );
}
