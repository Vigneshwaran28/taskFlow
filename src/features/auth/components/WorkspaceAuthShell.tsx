"use client";
// Password pages (reset link, first sign-in with a temporary password) in the workspace's own sign-in design: its
// template, colours, logo, sign-in CSS, and look and feel. Without a workspace (or until it loads) the generic layout.
import type { ReactNode } from "react";
import { LoadingState } from "@/components/shared/States";
import { TenantCss } from "@/features/workspace/components/TenantCss";
import { TenantUi } from "@/features/workspace/components/TenantUi";
import { ACCENT_META } from "@/hooks/useTheme";
import { useDocumentIcon, useDocumentTitle } from "@/lib/documentBranding";
import { usePublicWorkspace } from "../hooks/useAuth";
import { AuthLayout } from "./AuthLayout";
import { LoginTemplateView } from "./login-templates";

export interface WorkspaceAuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** The workspace address; null or unknown: the generic layout */
  slug?: string | null;
  /** The big line on the brand side (default: Welcome to <workspace>); the title stays above the form */
  headline?: string;
  /** Under the headline on the brand side */
  message?: string;
}

export function WorkspaceAuthShell({ title, subtitle, children, slug, headline, message }: WorkspaceAuthShellProps) {
  const workspace = usePublicWorkspace(slug ?? null);
  const data = workspace.data;
  useDocumentTitle(data ? `${title} · ${data.siteTitle}` : title);
  useDocumentIcon({ icon: data?.logoIcon, imageUrl: data?.logoUrl, color: ACCENT_META[data?.accent ?? "indigo"]?.hex ?? ACCENT_META.indigo.hex });
  if (slug && workspace.isPending) return <LoadingState className="min-h-screen" label="Loading…" />;
  if (!data) {
    return (
      <AuthLayout title={title} subtitle={subtitle}>
        {children}
      </AuthLayout>
    );
  }
  return (
    <>
      <TenantUi ui={data.ui} />
      <TenantCss scope="login" css={data.login.customCss} enabled={Boolean(data.login.customCss)} />
      <LoginTemplateView workspace={data} heading={{ headline: headline ?? `Welcome to ${data.siteTitle}`, message, formTitle: title, formSubtitle: subtitle }}>
        {children}
      </LoginTemplateView>
    </>
  );
}
