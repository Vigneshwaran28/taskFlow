"use client";
import type { ReactNode } from "react";
import { Redirect } from "@/app-shell/guards";
import { FullPageError, LoadingState } from "@/components/shared/States";
import { usePathname, useSearchParamsState } from "@/lib/navigation";
import { useAdminSession } from "../hooks/useAdmin";

export interface RequireAdminProps {
  /** For /bunny/login: send signed-in admins to /bunny */
  guestOnly?: boolean;
  children: ReactNode;
}

/** Admin console guard, independent of the regular user session. */
export function RequireAdmin({ guestOnly = false, children }: RequireAdminProps) {
  const pathname = usePathname();
  const [searchParams] = useSearchParamsState();
  const { data: session, isPending, error, refetch } = useAdminSession();

  if (isPending) return <LoadingState className="min-h-screen" label="Checking admin session…" />;
  if (error) return <FullPageError message="Unable to check the admin session." onRetry={() => void refetch()} />;
  if (guestOnly) return session ? <Redirect to="/bunny" /> : <>{children}</>;

  const query = searchParams.toString();
  const fullPath = query ? `${pathname}?${query}` : pathname;
  const loginUrl = fullPath && fullPath !== "/bunny" ? `/bunny/login?from=${encodeURIComponent(fullPath)}` : "/bunny/login";

  return session ? <>{children}</> : <Redirect to={loginUrl} />;
}
