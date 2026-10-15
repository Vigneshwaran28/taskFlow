"use client";
import { RequirePermission } from "@/app-shell/guards";
import { AuditPage } from "@/features/access";

export default function Page() {
  return (
    <RequirePermission permissions={["workspace.audit.view"]}>
      <AuditPage />
    </RequirePermission>
  );
}
