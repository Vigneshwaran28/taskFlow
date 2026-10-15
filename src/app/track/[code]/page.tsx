"use client";
import { TrackingPage } from "@/features/logistics";

/** Public: no sign-in and no app shell (the setup gate skips /track). */
export default function Page() {
  return <TrackingPage />;
}
