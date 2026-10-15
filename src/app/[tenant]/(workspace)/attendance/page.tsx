"use client";
import { RequireFeature } from "@/app-shell/guards";
import { AttendancePage } from "@/features/attendance";

export default function Page() {
  return (
    <RequireFeature feature="attendance">
      <AttendancePage />
    </RequireFeature>
  );
}
