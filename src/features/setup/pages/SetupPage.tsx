"use client";
import { AuthLayout } from "@/features/auth";
import { SetupWizard } from "../components/SetupWizard";
import { useSetupStatus } from "../hooks/useSetup";

export function SetupPage() {
  const edition = useSetupStatus().data?.edition ?? null;
  return (
    <AuthLayout
      wide
      title={edition ? `Set up ${edition.name}` : "Welcome to TaskFlow"}
      subtitle={
        edition
          ? "Choose where your data is stored. The wizard then imports your workspace, and everyone signs in with their usual password."
          : "Choose where your data is stored, then create the provider console account. You'll create workspaces (tenants) in the console next."
      }
    >
      <SetupWizard edition={edition} />
    </AuthLayout>
  );
}
