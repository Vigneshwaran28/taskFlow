"use client";
import { RequireAuth, RequireFeature, RequireTenantMatch } from "@/app-shell/guards";
import { QueueDisplayPage } from "@/features/clinic";
import { RealtimeProvider } from "@/realtime";

/** Waiting-room TV board: signed in, but outside the workspace shell (no sidebar or top bar). */
export default function Page() {
  return (
    <RequireAuth>
      <RequireTenantMatch>
        <RequireFeature feature="clinic">
          <RealtimeProvider>
            <QueueDisplayPage />
          </RealtimeProvider>
        </RequireFeature>
      </RequireTenantMatch>
    </RequireAuth>
  );
}
