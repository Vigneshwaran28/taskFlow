import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The Save / Cancel row of a form that saves explicitly. While there are unsaved changes it sticks to the bottom of the
 * screen, so Save stays in reach on long forms.
 */
export function SaveBar({ dirty, children, className }: { dirty: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2",
        dirty && "sticky bottom-0 z-10 -mx-4 border-t bg-card/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6",
        className
      )}
    >
      {dirty && (
        <span className="mr-auto text-xs font-medium text-warning" role="status">
          Unsaved changes
        </span>
      )}
      {children}
    </div>
  );
}
