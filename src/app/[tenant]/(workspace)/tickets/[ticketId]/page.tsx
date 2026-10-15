"use client";
import { RequireFeature } from "@/app-shell/guards";
import { TicketDetailPage } from "@/features/tickets";

export default function Page() {
  return (
    <RequireFeature feature="helpdesk">
      <TicketDetailPage />
    </RequireFeature>
  );
}
