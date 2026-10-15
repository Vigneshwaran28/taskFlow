"use client";
import { RequireFeature } from "@/app-shell/guards";
import { ListsPage } from "@/features/lists";

export default function Page() {
  return (
    <RequireFeature feature="tasks">
      <ListsPage />
    </RequireFeature>
  );
}
