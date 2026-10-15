import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const TONES = Object.freeze({
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-accent text-accent-foreground",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
});

export type Tone = keyof typeof TONES;

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", TONES[tone], className)}>{children}</span>;
}
