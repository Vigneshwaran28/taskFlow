"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { UsersManager } from "../components/UsersManager";

export function UsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Manage users" description="Create accounts for your company, set roles, and control who can sign in." />
      <UsersManager />
    </div>
  );
}
