"use client";
import { RequireFeature } from "@/app-shell/guards";
import { CalendarPage } from "@/features/tasks";

export default function Page() {
  return (
    <RequireFeature feature="tasks">
      <CalendarPage />
    </RequireFeature>
  );
}
