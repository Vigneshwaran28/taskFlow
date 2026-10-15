"use client";
import { RequireFeature } from "@/app-shell/guards";
import { PeoplePage } from "@/features/people";

export default function Page() {
  return (
    <RequireFeature feature="directory">
      <PeoplePage />
    </RequireFeature>
  );
}
