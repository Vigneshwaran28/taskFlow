import Link from "@/components/navigation/Link";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/cn";

const TONES = Object.freeze({
  primary: "bg-accent text-accent-foreground",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
});

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ComponentType<{ className?: string }>;
  tone?: keyof typeof TONES;
  /** Makes the card a link */
  href?: string;
  hint?: ReactNode;
}

export function StatCard({ label, value, icon: Icon, tone = "primary", href, hint }: StatCardProps) {
  const content = (
    <>
      <div className={cn("rounded-xl p-2.5", TONES[tone])}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </>
  );
  const className = "flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm";

  return href ? (
    <Link href={href} data-tf="stat" className={cn(className, "transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>
      {content}
    </Link>
  ) : (
    <div data-tf="stat" className={className}>{content}</div>
  );
}
