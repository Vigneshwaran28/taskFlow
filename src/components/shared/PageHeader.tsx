import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 data-tour="page-title" className="text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && (
        <div data-tour="page-actions" className="flex flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
