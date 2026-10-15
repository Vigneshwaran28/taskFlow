"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { AuditLog } from "../components/AuditLog";

export function AuditPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader title="Audit log" description="Every change to users, roles, permissions, settings, and approvals in your workspace." />
      <AuditLog />
    </div>
  );
}
