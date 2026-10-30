// Shared label / hint / error wrapper for form controls.
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const controlClass = (error?: string | null, extra?: string) =>
  cn(
    "w-full rounded-lg border bg-card px-3.5 text-sm text-foreground shadow-sm transition-all duration-150 placeholder:text-muted-foreground/60 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
    error ? "border-destructive focus-visible:ring-destructive/30" : "border-input",
    extra
  );

export interface FieldShellProps {
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
  /** Right-aligned action in the label row (e.g. Generate button, counter, link) */
  action?: ReactNode;
}

export function FieldShell({ id, label, hint, error, required, children, className, action }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <div className="flex min-h-[1.375rem] items-center justify-between gap-2">
          <label htmlFor={id} className="inline-flex items-center text-sm font-medium text-foreground">
            <span>{label}</span>
            {required && (
              <span className="ml-1 text-destructive font-semibold" aria-hidden="true">
                *
              </span>
            )}
          </label>
          {action && <div className="flex items-center gap-1.5 font-normal text-xs">{action}</div>}
        </div>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground leading-relaxed">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function describedBy(id: string, error?: string | null, hint?: ReactNode) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}
