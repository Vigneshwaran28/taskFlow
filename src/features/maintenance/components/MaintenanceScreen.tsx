"use client";
import type { ReactNode } from "react";
import { Clock, RefreshCw, ShieldCheck, Wrench } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/Button";
import type { MaintenanceWindow } from "@/lib/maintenance";
import { expectedBack } from "../utils/maintenanceText";

export interface MaintenanceScreenProps {
  window: MaintenanceWindow;
  /** The workspace's name, when the page belongs to one */
  title?: string;
  onCheck?: () => void;
  checking?: boolean;
  /** Where owners and admins sign in when the window lets them */
  adminSignInHref?: string | null;
  footer?: ReactNode;
}

/** Presentational: the full-page "down for maintenance" screen. */
export function MaintenanceScreen({ window, title, onCheck, checking = false, adminSignInHref, footer }: MaintenanceScreenProps) {
  const who = window.scope === "platform" ? "TaskFlow" : (title ?? "This workspace");
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-3xl items-center px-4 py-6 sm:px-6">
        <Logo title={window.scope === "workspace" && title ? title : "TaskFlow"} />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div role="status" aria-live="polite" className="flex w-full max-w-lg flex-col items-center gap-5 rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="relative">
            <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-500/15">
              <Wrench className="h-8 w-8 text-amber-700 dark:text-amber-300" aria-hidden="true" />
            </div>
            <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-amber-500/70 motion-reduce:animate-none" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">We&apos;ll be right back</h1>
            <p className="text-sm text-muted-foreground">{who} is down for scheduled maintenance. Your data is safe.</p>
          </div>
          {window.message && <p className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm">{window.message}</p>}
          <p className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {expectedBack(window)}
          </p>
          {onCheck && (
            <div className="flex flex-col items-center gap-2">
              <Button variant="secondary" onClick={onCheck} loading={checking}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Check again
              </Button>
              <p className="text-xs text-muted-foreground">This page checks every 30 seconds and opens the app as soon as it&apos;s back.</p>
            </div>
          )}
          {adminSignInHref && window.allowAdmins && (
            <a href={adminSignInHref} className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Workspace owner or admin? Sign in
            </a>
          )}
          {footer}
        </div>
      </main>
    </div>
  );
}
