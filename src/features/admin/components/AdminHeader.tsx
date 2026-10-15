"use client";
import { useIsFetching } from "@tanstack/react-query";
import { useRouter } from "@/lib/navigation";
import { LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { adminKeys, useAdminLogout, useAdminSession, useRefreshAdmin } from "../hooks/useAdmin";

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

/** Feature component: console title bar with refresh, the signed-in admin, and sign out. */
export function AdminHeader() {
  const router = useRouter();
  const toast = useToast();
  const { data: session } = useAdminSession();
  const logout = useAdminLogout();
  const refresh = useRefreshAdmin();
  const refreshing = useIsFetching({ queryKey: adminKeys.all }) > 0;

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => router.replace("/bunny/login"),
      onError: () => toast.error("Sign out failed", "Please try again."),
    });
  }

  return (
    <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Logo />
          <Badge tone="primary" className="hidden sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Admin
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {session && (
            <span className="hidden text-right text-sm leading-tight md:block">
              <span className="block">{session.username}</span>
              {session.expiresAt && <span className="block text-xs text-muted-foreground">Session ends {timeFormat.format(new Date(session.expiresAt))}</span>}
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={refresh} aria-label="Refresh data" title="Refresh data">
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="sm" onClick={handleLogout} loading={logout.isPending} aria-label="Sign out" title="Sign out">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
