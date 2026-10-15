"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { AnnouncementFeed } from "../components/AnnouncementFeed";

export function AnnouncementsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="Announcements" description="Company news, policies, and reminders addressed to you." />
      <AnnouncementFeed />
    </div>
  );
}
