"use client";
import { PublicTokenPage } from "@/features/clinic";

/** Public: a patient follows their clinic token (no sign-in, no app shell; the setup gate skips /q). */
export default function Page() {
  return <PublicTokenPage />;
}
