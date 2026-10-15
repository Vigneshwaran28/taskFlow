"use client";
// Shows the maintenance page in place of any app page once the API reports a maintenance window (503 MAINTENANCE),
// then polls the public status and brings the app back by itself when the window ends.
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { usePublicWorkspace } from "@/features/auth";
import { reportMaintenance, useReportedMaintenance, type MaintenanceWindow } from "@/lib/maintenance";
import { useTenantSlug } from "@/lib/navigation";
import { usePlatformStatus } from "../hooks/useMaintenance";
import { MaintenanceScreen } from "./MaintenanceScreen";

/** The console and the setup wizard never close for maintenance. */
const EXEMPT = (pathname: string) => pathname === "/setup" || pathname === "/bunny" || pathname.startsWith("/bunny/");

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const reported = useReportedMaintenance();
  const pathname = usePathname() ?? "/";
  if (!reported || EXEMPT(pathname)) return <>{children}</>;
  return <ClosedForMaintenance reported={reported} />;
}

function ClosedForMaintenance({ reported }: { reported: MaintenanceWindow }) {
  const queryClient = useQueryClient();
  const workspace = useTenantSlug();
  const { data: branding } = usePublicWorkspace(workspace);
  const status = usePlatformStatus(workspace, { poll: true });
  const active = status.data?.maintenance.active;

  // The status endpoint is the source of truth while the page is shown: a new message or end time shows up,
  // and when the window is over the app reloads its data and comes back.
  useEffect(() => {
    if (!status.data) return;
    if (active) reportMaintenance(active);
    else {
      reportMaintenance(null);
      void queryClient.resetQueries({ predicate: query => query.queryKey[0] !== "maintenance" });
    }
  }, [status.data, active, queryClient]);

  const window = active ?? reported;
  return (
    <MaintenanceScreen
      window={window}
      title={branding?.siteTitle}
      onCheck={() => void status.refetch()}
      checking={status.isFetching}
      adminSignInHref={workspace ? `/${encodeURIComponent(workspace)}/login` : null}
    />
  );
}
