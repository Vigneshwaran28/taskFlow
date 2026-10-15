"use client";
import Link from "@/components/navigation/Link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/navigation";
import { withTenant } from "@/lib/tenantPath";
import { ArrowRight } from "lucide-react";
import { AuthLayout } from "../components/AuthLayout";
import { LoginForm } from "../components/LoginForm";
import { WorkspaceAddressForm } from "../components/WorkspaceAddressForm";
import { usePublicWorkspace } from "../hooks/useAuth";
import { safeRedirect, useRememberedWorkspace, workspaceLoginPath } from "../utils/rememberedWorkspace";

/** One-click link back to the workspace this browser signed in to last (never an automatic redirect). */
function ContinueToWorkspace({ slug, from }: { slug: string; from: string | null }) {
  const { data: workspace } = usePublicWorkspace(slug);
  if (!workspace?.active) return null;
  return (
    <Link
      href={`${workspaceLoginPath(slug)}${from ? `?from=${encodeURIComponent(from)}` : ""}`}
      className="mb-6 flex items-center justify-between gap-3 rounded-xl border bg-accent/40 px-4 py-3 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="min-w-0">
        <span className="block font-medium text-foreground">Continue to {workspace.siteTitle}</span>
        <span className="block truncate text-xs text-muted-foreground">Your workspace&apos;s own sign-in page</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
    </Link>
  );
}

export function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from");
  const redirectTo = safeRedirect(from);
  const generic = params.get("generic") === "1";
  const remembered = useRememberedWorkspace();

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue to your workspace.">
      {remembered && !generic && <ContinueToWorkspace slug={remembered} from={from} />}
      {/* An email in several workspaces: LoginForm offers "pick one" (409 CHOOSE_WORKSPACE). */}
      {/* Into the workspace just signed in to (an app path like /billing opens inside it). */}
      <LoginForm onSuccess={user => router.replace(user?.tenant?.slug ? withTenant(user.tenant.slug, redirectTo) : "/")} from={from} />
      <div className="mt-6 flex flex-col gap-4">
        <WorkspaceAddressForm from={from} collapsible />
        <p className="text-center text-sm text-muted-foreground">Don&apos;t have an account? Ask your workspace administrator to create one for you.</p>
      </div>
    </AuthLayout>
  );
}
