"use client";
import { RequireFeature } from "@/app-shell/guards";
import { TasksPage } from "@/features/tasks";

export default function Page() {
  return (
    <RequireFeature feature="tasks">
      <TasksPage />
    </RequireFeature>
  );
}
