"use client";
import { RequireFeature } from "@/app-shell/guards";
import { NotesPage } from "@/features/notes";

export default function Page() {
  return (
    <RequireFeature feature="notes">
      <NotesPage />
    </RequireFeature>
  );
}
