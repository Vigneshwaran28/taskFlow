"use client";
import Link from "@/components/navigation/Link";
import { useSearchParams } from "next/navigation";
import { withTenant } from "@/lib/tenantPath";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { AuthLayout } from "../components/AuthLayout";
import { LoginForm } from "../components/LoginForm";
import { PinAccessLogin } from "../components/PinAccessLogin";
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
  const params = useSearchParams();
  const from = params.get("from");
  const redirectTo = safeRedirect(from);
  const generic = params.get("generic") === "1";
  const remembered = useRememberedWorkspace();
  const [authMode, setAuthMode] = useState<"standard" | "pin">("standard");

  const handleSuccess = (user: { tenant?: { slug?: string } } | null) => {
    const dest = user?.tenant?.slug ? withTenant(user.tenant.slug, redirectTo) : "/";
    window.location.href = dest;
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue to your workspace.">
      {remembered && !generic && <ContinueToWorkspace slug={remembered} from={from} />}

      {/* Login Mode Selector: Standard or Workspace PIN */}
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setAuthMode("standard")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
            authMode === "standard"
              ? "bg-background text-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Email &amp; Password</span>
        </button>
        <button
          type="button"
          onClick={() => setAuthMode("pin")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
            authMode === "pin"
              ? "bg-background text-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Workspace PIN / Code</span>
        </button>
      </div>

      {authMode === "standard" ? (
        <LoginForm onSuccess={handleSuccess} from={from} />
      ) : (
        <PinAccessLogin onSuccess={handleSuccess} from={from} />
      )}

      <div className="mt-6 flex flex-col gap-4">
        <WorkspaceAddressForm from={from} collapsible />
        <p className="text-center text-xs text-muted-foreground">
          Don&apos;t have an account? Ask your workspace administrator for an invite or security PIN code.
        </p>
      </div>
    </AuthLayout>
  );
}
