"use client";
import type { ReactNode } from "react";
import { AppLayout } from "@/app-shell/AppLayout";
import { RequireAuth, RequireTenantMatch } from "@/app-shell/guards";

/** Every signed-in page (/<workspace>/...): requires a session for that workspace, then renders the app shell. */
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <RequireTenantMatch>
        <AppLayout>{children}</AppLayout>
      </RequireTenantMatch>
    </RequireAuth>
  );
}
