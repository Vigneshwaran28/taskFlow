import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base shimmering skeleton placeholder.
 * Fully accessible with aria-hidden="true" and motion-safe pulse.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-muted/70 motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  );
}

/**
 * Skeleton for standard cards with header, title, and body text.
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="mt-2 flex items-center gap-2 pt-2 border-t border-border/50">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/**
 * Skeleton placeholder for tabular datasets.
 */
export function TableSkeleton({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("w-full overflow-hidden rounded-xl border bg-card", className)}
    >
      {/* Table Header */}
      <div className="flex border-b bg-muted/40 px-4 py-3 gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={`th-${i}`}
            className={cn("h-4", i === 0 ? "w-1/4" : "flex-1")}
          />
        ))}
      </div>
      {/* Table Rows */}
      <div className="divide-y divide-border/60">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`tr-${r}`} className="flex items-center px-4 py-3.5 gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={`td-${r}-${c}`}
                className={cn("h-4", c === 0 ? "w-1/4" : "flex-1")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton placeholder for vertical list views.
 */
export function ListSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border bg-card p-4"
        >
          <div className="flex items-center gap-3 w-2/3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex flex-col gap-2 w-full">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 rounded-md shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton placeholder for forms and settings panels.
 */
export function FormSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-24 w-full rounded-md" />
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
    </div>
  );
}

