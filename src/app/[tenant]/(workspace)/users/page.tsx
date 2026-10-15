"use client";
import { RequirePermission } from "@/app-shell/guards";
import { UsersPage } from "@/features/users";

export default function Page() {
  return (
    <RequirePermission permissions={["workspace.users.manage"]}>
      <UsersPage />
    </RequirePermission>
  );
}
