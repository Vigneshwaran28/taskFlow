"use client";
// Route guards. Pages wrap their content in these; the server enforces the same rules on every request.
import Link from "@/components/navigation/Link";
import { usePathname, useRouter, useTenantSlug } from "@/lib/navigation";
import { useEffect, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { EmptyState, FullPageError, LoadingState } from "@/components/shared/States";
import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { ForcePasswordChange } from "@/features/auth/components/ForcePasswordChange";
import { getRememberedWorkspace, rememberWorkspace } from "@/features/auth/utils/rememberedWorkspace";
import { setCurrency } from "@/lib/format";
import type { FeatureKey } from "@/types/session";
import { canOpenModule, MODULES } from "./modules";

/** Client-side redirect (for decisions that depend on the session, which only the browser knows). */
export function Redirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return <LoadingState className="min-h-screen" />;
}

/** Signed-in area: loads the session, sends guests to /login, and enforces a temporary-password change. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const urlTenant = useTenantSlug();
  const { data: user, isPending, error, refetch } = useCurrentUser();

  if (isPending) return <LoadingState className="min-h-screen" label="Loading your workspace…" />;
  if (error) return <FullPageError message="Unable to load your account." onRetry={() => void refetch()} />;
  if (!user) {
    // The workspace in the URL (or the one this browser used last) gets its own sign-in page; else the generic one.
    const workspace = urlTenant ?? getRememberedWorkspace();
    const signIn = workspace ? `/${workspace}/login` : "/login";
    return <Redirect to={`${signIn}${pathname && pathname !== "/" ? `?from=${encodeURIComponent(pathname)}` : ""}`} />;
  }
  // A temporary password must be replaced before anything else loads (the server enforces this too).
  if (user.mustChangePassword) return <ForcePasswordChange user={user} />;
  // Idempotent: amounts render in the workspace currency from the first frame.
  setCurrency(user.tenant?.settings?.company?.currency ?? user.tenant?.settings?.sales?.currency);
  return <>{children}</>;
}

/**
 * Workspace URLs must match the signed-in account: /other-co/... never shows this account's data under another
 * workspace's address. Each workspace has its own sign-in on this browser (the server picks the session from the
 * URL's workspace), so a mismatch is only a safety net: it offers that workspace's sign-in, keeping this one.
 */
export function RequireTenantMatch({ children }: { children: ReactNode }) {
  const urlTenant = useTenantSlug();
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const own = user?.tenant?.slug;
  useEffect(() => {
    if (own) rememberWorkspace(own);
  }, [own]);
  if (!user || !urlTenant || urlTenant === own) return <>{children}</>;
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <EmptyState
          title={`Sign in to /${urlTenant}`}
          message={`This page belongs to another workspace. You can sign in to it too: ${user.tenant.settings?.branding?.siteTitle || user.tenant.name} stays signed in.`}
          icon={Lock}
          action={
            <div className="flex flex-wrap justify-center gap-4">
              <a href={`/${urlTenant}/login?from=${encodeURIComponent(pathname)}`} className="text-sm font-medium text-primary hover:underline">
                Sign in to /{urlTenant}
              </a>
              <a href={`/${own}`} className="text-sm font-medium text-muted-foreground hover:underline">
                Back to {user.tenant.settings?.branding?.siteTitle || user.tenant.name}
              </a>
            </div>
          }
        />
      </div>
    </div>
  );
}

/** A workspace's sign-in page: people already signed in to that workspace go straight to it. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return <LoadingState className="min-h-screen" />;
  if (user) return <Redirect to={`/${user.tenant.slug}`} />;
  return <>{children}</>;
}

/** Shows the page only when the workspace is licensed for the module and the person has access to it. */
export function RequireFeature({ feature, children }: { feature: FeatureKey; children: ReactNode }) {
  const { data: user } = useCurrentUser();
  if (canOpenModule(user, feature)) return <>{children}</>;
  const licensed = user?.tenant?.features.includes(feature);
  const label = MODULES[feature]?.label;
  return (
    <EmptyState
      title={licensed ? `You don't have access to ${label ?? "this module"}` : `${label ?? "This module"} isn't enabled`}
      message={licensed ? "Ask your workspace admin to give you a role that includes it." : `${user?.tenant?.name ?? "Your workspace"} doesn't include this module. Ask your provider to turn it on.`}
      icon={Lock}
      action={
        <Link href="/" className="text-sm font-medium text-primary hover:underline">
          Go to home
        </Link>
      }
    />
  );
}

/** Workspace administration pages: open to anyone holding one of the permissions. */
export function RequirePermission({ permissions, children }: { permissions: string[]; children: ReactNode }) {
  const { data: user } = useCurrentUser();
  if (permissions.some(permission => user?.permissions?.includes(permission))) return <>{children}</>;
  return <EmptyState title="You don't have access to this page" message="Ask your workspace admin if you need it." icon={Lock} />;
}
