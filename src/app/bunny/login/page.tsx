"use client";
import { AdminLoginPage, RequireAdmin } from "@/features/admin";

export default function Page() {
  return (
    <RequireAdmin guestOnly>
      <AdminLoginPage />
    </RequireAdmin>
  );
}
