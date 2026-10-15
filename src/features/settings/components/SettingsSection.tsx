import type { ReactNode } from "react";

/** One titled block of a Settings tab: title and description beside (or, on small screens, above) its controls. */
export function SettingsSection({ id, title, description, children }: { id?: string; title: string; description?: ReactNode; children: ReactNode }) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className="grid scroll-mt-20 grid-cols-1 gap-4 border-b py-6 last:border-b-0 md:grid-cols-3 md:gap-6 md:py-8">
      <div>
        <h2 id={headingId} className="font-semibold">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="min-w-0 md:col-span-2">{children}</div>
    </section>
  );
}
