"use client";
// /track: public form to look up a shipment by its tracking code.
import { PackageSearch } from "lucide-react";
import { PublicShell } from "../components/PublicShell";
import { TrackingLookupForm } from "../components/TrackingLookupForm";

export function TrackingLookupPage() {
  return (
    <PublicShell>
      <div className="flex flex-1 items-center justify-center">
        <section aria-labelledby="track-title" className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <span className="rounded-full bg-accent p-3">
              <PackageSearch className="h-6 w-6 text-accent-foreground" aria-hidden="true" />
            </span>
            <h1 id="track-title" className="text-xl font-semibold">
              Track your shipment
            </h1>
            <p className="text-sm text-muted-foreground">Enter the tracking code from your receipt, email, or text message.</p>
          </div>
          <TrackingLookupForm autoFocus />
        </section>
      </div>
    </PublicShell>
  );
}
