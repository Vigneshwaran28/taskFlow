"use client";
import { RequireFeature } from "@/app-shell/guards";
import { TicketsPage } from "@/features/tickets";

export default function Page() {
  return (
    <RequireFeature feature="helpdesk">
      <TicketsPage />
    </RequireFeature>
  );
}
