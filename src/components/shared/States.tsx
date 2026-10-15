// Empty, error, and loading states used by every list and page.
import type { ComponentType, ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function EmptyState({ title, message, icon: Icon = Inbox, action }: { title: string; message?: ReactNode; icon?: ComponentType<{ className?: string }>; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
      <div className="rounded-full bg-accent p-3">
        <Icon className="h-6 w-6 text-accent-foreground" aria-hidden="true" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        {message && <p className="mt-1 text-sm text-muted-foreground">{message}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong.", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
      <p className="text-sm font-medium text-destructive">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function LoadingState({ label = "Loading…", className = "py-16" }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center justify-center gap-3 text-sm text-muted-foreground", className)}>
      <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none" />
      {label}
    </div>
  );
}

/** A full-screen centred error (session, setup, and admin checks). */
export function FullPageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <ErrorState message={message} onRetry={onRetry} />
      </div>
    </div>
  );
}

/** A form-level error message (for errors not tied to one field). */
export function FormAlert({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      {message}
    </p>
  );
}
