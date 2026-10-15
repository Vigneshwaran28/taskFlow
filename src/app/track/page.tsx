"use client";
import { TrackingLookupPage } from "@/features/logistics";

/** Public: no sign-in and no app shell (the setup gate skips /track). */
export default function Page() {
  return <TrackingLookupPage />;
}
