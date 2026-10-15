"use client";
import { RequirePermission } from "@/app-shell/guards";
import { WorkspaceAdminPage } from "@/features/workspace";

export default function Page() {
  return (
    <RequirePermission permissions={["workspace.users.manage", "workspace.roles.manage", "workspace.settings.manage", "workspace.audit.view"]}>
      <WorkspaceAdminPage />
    </RequirePermission>
  );
}
