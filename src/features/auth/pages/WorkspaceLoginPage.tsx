"use client";
// A workspace's own sign-in page (/<slug>/login), in the layout its admin picked.
import Link from "@/components/navigation/Link";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/navigation";
import { useEffect, type ReactNode } from "react";
import { PauseCircle, SearchX, Wrench } from "lucide-react";
import { FullPageError, LoadingState } from "@/components/shared/States";
import { buttonClass } from "@/components/ui/Button";
import { ApiError } from "@/lib/apiClient";
import { usePublicWorkspace } from "../hooks/useAuth";
import { LoginForm } from "../components/LoginForm";
import { LoginTemplateView } from "../components/login-templates";
import { forgetWorkspace, safeRedirect } from "../utils/rememberedWorkspace";
import { TenantCss } from "@/features/workspace/components/TenantCss";
import { TenantUi } from "@/features/workspace/components/TenantUi";
import { ACCENT_META } from "@/hooks/useTheme";
import { useDocumentIcon, useDocumentTitle } from "@/lib/documentBranding";
// The component file directly: the maintenance feature's index imports auth hooks.
import { MaintenanceScreen } from "@/features/maintenance/components/MaintenanceScreen";

function StatusCard({ icon: Icon, title, children }: { icon: typeof SearchX; title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="rounded-full bg-accent p-3">
          <Icon className="h-6 w-6 text-accent-foreground" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {children}
      </div>
    </main>
  );
}

export function WorkspaceLoginPage() {
  const router = useRouter();
  const params = useParams<{ tenant?: string; slug?: string }>();
  const search = useSearchParams();
  const slug = String(params.tenant ?? params.slug ?? "").toLowerCase();
  const redirectTo = safeRedirect(search.get("from"));
  const { data: workspace, isPending, error, refetch } = usePublicWorkspace(slug);
  const notFound = error instanceof ApiError && error.status === 404;

  // A remembered address that no longer exists shouldn't keep sending people here.
  useEffect(() => {
    if (notFound) forgetWorkspace(slug);
  }, [notFound, slug]);

  const title = workspace ? `Sign in · ${workspace.siteTitle}` : notFound ? "Workspace not found" : null;
  useDocumentTitle(title);
  // The workspace's logo in the tab (its brand colour behind the icon).
  useDocumentIcon({ icon: workspace?.logoIcon, imageUrl: workspace?.logoUrl, color: ACCENT_META[workspace?.accent ?? "indigo"]?.hex ?? ACCENT_META.indigo.hex });

  if (isPending) return <LoadingState className="min-h-screen" label="Loading sign-in page…" />;

  if (notFound) {
    return (
      <StatusCard icon={SearchX} title="We couldn't find that workspace">
        <p className="text-sm text-muted-foreground">
          There&apos;s no workspace at <span className="break-all font-mono text-foreground">/{slug}</span>. Check the address with your administrator.
        </p>
        <Link href="/login?generic=1" className={buttonClass("primary", "md", "w-full")}>
          Go to the main sign-in page
        </Link>
      </StatusCard>
    );
  }

  if (error || !workspace) return <FullPageError message="Unable to load this sign-in page." onRetry={() => void refetch()} />;

  if (!workspace.active) {
    return (
      <StatusCard icon={PauseCircle} title={`${workspace.siteTitle} is suspended`}>
        <p className="text-sm text-muted-foreground">Signing in to this workspace is paused for now. Its data is safe; access returns as soon as it is reactivated.</p>
        <p className="text-sm text-muted-foreground">
          {workspace.login.supportContact ? (
            <>
              Questions? Contact <span className="font-medium text-foreground">{workspace.login.supportContact}</span>.
            </>
          ) : (
            "Contact your administrator for details."
          )}
        </p>
      </StatusCard>
    );
  }

  // A maintenance window: nobody can sign in, or only the workspace's owners and admins.
  const closed = workspace.maintenance?.active;
  if (closed && !closed.allowAdmins) return <MaintenanceScreen window={closed} title={workspace.siteTitle} onCheck={() => void refetch()} />;

  return (
    <>
      {/* The workspace's sign-in CSS: sent only while enabled; ?nocss=1 (safe mode) skips it. */}
      <TenantUi ui={workspace.ui} />
      <TenantCss scope="login" css={workspace.login.customCss} enabled={Boolean(workspace.login.customCss)} />
      <LoginTemplateView workspace={workspace}>
        {closed && (
          <p role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
            <span>Down for maintenance{closed.message ? `: ${closed.message}` : ""}. Only owners and admins can sign in right now.</span>
          </p>
        )}
        <LoginForm workspace={workspace.slug} onSuccess={() => router.replace(redirectTo)} />
      </LoginTemplateView>
    </>
  );
}
