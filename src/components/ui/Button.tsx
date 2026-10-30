import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const VARIANTS = Object.freeze({
  primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/95",
  default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/95",
  secondary: "border border-input bg-card text-foreground shadow-sm hover:bg-muted active:bg-muted/80",
  outline: "border border-input bg-card text-foreground shadow-sm hover:bg-muted active:bg-muted/80",
  ghost: "text-foreground hover:bg-muted active:bg-muted/80",
  danger: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:bg-destructive/95",
  destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:bg-destructive/95",
  link: "text-primary underline-offset-4 hover:underline",
});

const SIZES = Object.freeze({
  sm: "min-h-8 h-8 gap-1.5 px-3 text-xs sm:text-sm",
  md: "min-h-9 sm:min-h-10 h-10 gap-2 px-4 text-sm",
  lg: "min-h-10 sm:min-h-11 h-11 gap-2.5 px-5 text-base",
  icon: "h-9 w-9 min-h-9 min-w-9 p-0",
});

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

/** Classes for links styled as buttons (next/link can't be a <button>). */
export const buttonClass = (variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) =>
  cn(
    "tf-btn inline-flex shrink-0 items-center justify-center rounded-lg font-medium select-none touch-manipulation cursor-pointer transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
    VARIANTS[variant] ?? VARIANTS.primary,
    SIZES[size] ?? SIZES.md,
    className
  );

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Disables the button and shows a spinner */
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", loading = false, disabled, className, children, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClass(variant, size, className)} {...props}>
      {loading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />}
      {children}
    </button>
  );
}
