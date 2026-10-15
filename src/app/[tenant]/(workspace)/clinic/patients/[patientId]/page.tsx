"use client";
import { RequireFeature } from "@/app-shell/guards";
import { PatientPage } from "@/features/clinic";

export default function Page() {
  return (
    <RequireFeature feature="clinic">
      <PatientPage />
    </RequireFeature>
  );
}
