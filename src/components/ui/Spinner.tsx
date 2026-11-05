import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";
export type SpinnerColor = "primary" | "current" | "muted" | "white";

const SIZES: Record<SpinnerSize, string> = {
  xs: "h-3.5 w-3.5 border",
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-7 w-7 border-[2.5px]",
  xl: "h-10 w-10 border-3",
};

const COLORS: Record<SpinnerColor, string> = {
  primary: "border-primary border-t-transparent text-primary",
  current: "border-current border-t-transparent",
  muted: "border-muted-foreground/30 border-t-muted-foreground text-muted-foreground",
  white: "border-white/30 border-t-white text-white",
};

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize;
  color?: SpinnerColor;
  label?: string;
  className?: string;
}

/**
 * Universal, accessible loading spinner.
 * Includes polite screen reader announcement and respects prefers-reduced-motion.
 */
export function Spinner({
  size = "md",
  color = "primary",
  label = "Loading…",
  className,
  ...props
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center justify-center shrink-0", className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "animate-spin rounded-full motion-reduce:animate-none",
          SIZES[size],
          COLORS[color]
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

