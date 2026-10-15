"use client";
import { RequireFeature } from "@/app-shell/guards";
import { AnnouncementsPage } from "@/features/announcements";

export default function Page() {
  return (
    <RequireFeature feature="announcements">
      <AnnouncementsPage />
    </RequireFeature>
  );
}
