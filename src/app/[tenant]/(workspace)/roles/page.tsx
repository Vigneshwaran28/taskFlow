"use client";
import { RequirePermission } from "@/app-shell/guards";
import { RolesPage } from "@/features/access";

export default function Page() {
  return (
    <RequirePermission permissions={["workspace.roles.manage", "workspace.users.manage"]}>
      <RolesPage />
    </RequirePermission>
  );
}
