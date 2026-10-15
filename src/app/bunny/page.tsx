"use client";
import { AdminDashboardPage, RequireAdmin } from "@/features/admin";

export default function Page() {
  return (
    <RequireAdmin>
      <AdminDashboardPage />
    </RequireAdmin>
  );
}
