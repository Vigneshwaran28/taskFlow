"use client";
import { RequireFeature } from "@/app-shell/guards";
import { MessagesPage } from "@/features/messaging";

export default function Page() {
  return (
    <RequireFeature feature="messaging">
      <MessagesPage />
    </RequireFeature>
  );
}
