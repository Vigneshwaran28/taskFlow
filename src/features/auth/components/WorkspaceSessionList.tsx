"use client";
import { ArrowRight, LogOut } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import type { WorkspaceSession } from "@/types/session";
import { useSignOutWorkspace } from "../hooks/useAuth";

/**
 * The workspaces this browser is signed in to, each with Open and Sign out. Opening is a full page load, so the
 * workspace starts with a clean slate (its own session, cache, and live connection).
 */
export function WorkspaceSessionList({ sessions }: { sessions: WorkspaceSession[] }) {
  const toast = useToast();
  const signOut = useSignOutWorkspace();

  function handleSignOut(session: WorkspaceSession) {
    signOut.mutate(
      { workspace: session.slug },
      {
        onSuccess: () => toast.success(`Signed out of ${session.siteTitle}`, "Your other workspaces stay signed in."),
        onError: error => toast.error("Couldn't sign out", error.message),
      }
    );
  }

  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card" aria-label="Signed-in workspaces">
      {sessions.map(session => (
        <li key={session.slug} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar name={session.siteTitle} />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium">{session.siteTitle}</span>
                <span className="font-mono text-xs text-muted-foreground">/{session.slug}</span>
                {session.latest && <Badge tone="info">Last used</Badge>}
                {session.maintenance && <Badge tone="warning">In maintenance</Badge>}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {session.user.name} · {session.user.email}
              </p>
            </div>
          </div>
          <div className="flex gap-2 sm:justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSignOut(session)}
              disabled={signOut.isPending}
              aria-label={`Sign out of ${session.siteTitle}`}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </Button>
            <a href={`/${encodeURIComponent(session.slug)}`} className={buttonClass("primary", "sm")}>
              Open
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
