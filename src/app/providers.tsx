"use client";
// Client-side providers for every page: data cache, appearance, toasts, session watching, and the setup gate.
import { QueryClientProvider } from "@tanstack/react-query";
import { usePathname, useTenantSlug } from "@/lib/navigation";
import { Suspense, useEffect, useRef, type ReactNode } from "react";
import { Redirect } from "@/app-shell/guards";
import { FullPageError, LoadingState } from "@/components/shared/States";
import { ToastProvider } from "@/components/shared/Toaster";
import { ThemeProvider } from "@/hooks/useTheme";
import { setUnauthorizedHandler } from "@/lib/apiClient";
import { getQueryClient } from "@/lib/queryClient";
import { adminKeys } from "@/features/admin";
import { setCurrentSession } from "@/features/auth";
import { MaintenanceGate } from "@/features/maintenance";
import { useSetupStatus } from "@/features/setup";

/** A 401 means that session ended: mark the user (or the admin console) signed out so guards redirect. */
function SessionWatcher() {
  // Registers a module-level handler (external to React) once.
  useEffect(() => {
    const queryClient = getQueryClient();
    setUnauthorizedHandler(path => {
      if (path.startsWith("/bunny/")) {
        if (path !== "/bunny/login") queryClient.setQueryData(adminKeys.session, null);
      } else if (!path.startsWith("/auth/") && !path.startsWith("/public/") && !path.startsWith("/patient/")) {
        // (/patient/ is the clinic patient portal: its own sign-in, never the staff session)
        setCurrentSession(queryClient, null); // only this tab's workspace: others on this browser stay signed in
      }
    });
  }, []);
  return null;
}

/**
 * Cached data belongs to one workspace. When a tab moves to another workspace's pages, drop what the previous one
 * loaded so nothing of it shows under the new address (sessions are cached per workspace and stay).
 */
function WorkspaceCacheGuard() {
  const workspace = useTenantSlug();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (!workspace) return;
    if (previous.current && previous.current !== workspace) {
      getQueryClient().removeQueries({ predicate: query => query.queryKey[0] !== "setup" && query.queryKey[0] !== "auth" && query.queryKey[0] !== "public-workspace" });
    }
    previous.current = workspace;
  }, [workspace]);
  return null;
}

/** Pages that work without a configured server or session. */
const PUBLIC_PATHS = ["/track", "/q"];

/** Sends everyone to /setup until the setup wizard has run, and keeps them out of it afterwards. */
function SetupGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const workspace = useTenantSlug();
  const isPublic = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));
  const { data, isPending, error, refetch } = useSetupStatus({ enabled: !isPublic });

  if (isPublic) return <>{children}</>;
  if (isPending) return <LoadingState className="min-h-screen" label="Starting…" />;
  if (error || !data) return <FullPageError message="Can't reach the TaskFlow server. Make sure it is running." onRetry={() => void refetch()} />;

  const onSetupPage = pathname === "/setup";
  if (!data.configured && !onSetupPage) return <Redirect to="/setup" />;
  // A standalone install runs one workspace: the start page opens it, and there is no provider console or generic sign-in.
  // (Only outside workspace pages: usePathname() strips the workspace, so "/acme" reads as "/".)
  const edition = data.edition;
  if (data.configured && edition && !workspace) {
    if (pathname === "/") return <Redirect to={`/${edition.slug}`} />;
    if (onSetupPage || ["/login", "/register", "/bunny"].some(path => pathname === path || pathname.startsWith(`${path}/`))) return <Redirect to={`/${edition.slug}/login`} />;
  }
  if (data.configured && onSetupPage) return <Redirect to="/" />;
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <ThemeProvider>
        <ToastProvider>
          <SessionWatcher />
          <WorkspaceCacheGuard />
          <Suspense fallback={<LoadingState className="min-h-screen" />}>
            <SetupGate>
              <MaintenanceGate>{children}</MaintenanceGate>
            </SetupGate>
          </Suspense>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
