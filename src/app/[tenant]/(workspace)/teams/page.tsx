"use client";
import { RequireFeature } from "@/app-shell/guards";
import { TeamsPage } from "@/features/teams";

export default function Page() {
  return (
    <RequireFeature feature="directory">
      <TeamsPage />
    </RequireFeature>
  );
}
