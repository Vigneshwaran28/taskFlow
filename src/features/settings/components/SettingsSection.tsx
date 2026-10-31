import type { ReactNode } from "react";

export interface SettingsSectionProps {
  id?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  layout?: "split" | "stacked";
}

/** One titled block of a Settings tab: title and description beside (or, on small screens or when stacked, above) its controls. */
export function SettingsSection({
  id,
  title,
  description,
  children,
  layout = "split",
}: SettingsSectionProps) {
  const headingId = id ? `${id}-heading` : undefined;

  if (layout === "stacked") {
    return (
      <section
        id={id}
        aria-labelledby={headingId}
        className="scroll-mt-20 border-b border-border/80 py-6 last:border-b-0 sm:py-8"
      >
        <div className="mb-5 max-w-3xl">
          <h2 id={headingId} className="text-base font-semibold text-foreground tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>
        <div className="w-full min-w-0">{children}</div>
      </section>
    );
  }

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="grid scroll-mt-20 grid-cols-1 gap-5 border-b border-border/80 py-6 last:border-b-0 lg:grid-cols-12 lg:gap-8 sm:py-8"
    >
      <div className="lg:col-span-4 xl:col-span-3">
        <h2 id={headingId} className="text-base font-semibold text-foreground tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="min-w-0 lg:col-span-8 xl:col-span-9">{children}</div>
    </section>
  );
}
