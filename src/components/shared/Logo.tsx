import { cn } from "@/lib/cn";
import { LogoGlyph } from "./logoIcons";

const SAFE_IMAGE = /^https?:\/\/[^\s"'()<>\\]+$/i;

export interface LogoProps {
  inverted?: boolean;
  /** Replaces the word "TaskFlow" (a workspace's own website title) */
  title?: string;
  /** A workspace's logo icon (components/shared/logoIcons.ts); the tick by default */
  icon?: string | null;
  /** A workspace's logo image link: shown instead of the icon */
  imageUrl?: string | null;
  className?: string;
}

/** The product mark, or a workspace's own logo (icon on the brand colour, or its image) and title. */
export function Logo({ inverted = false, title = "TaskFlow", icon, imageUrl, className }: LogoProps) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5 text-lg font-semibold tracking-tight", className)}>
      {imageUrl && SAFE_IMAGE.test(imageUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element -- a workspace's own image link on any host
        <img src={imageUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg bg-card object-contain" referrerPolicy="no-referrer" />
      ) : (
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", inverted ? "bg-white text-indigo-700" : "bg-primary text-primary-foreground")}>
          <LogoGlyph name={icon} className="h-5 w-5" strokeWidth={icon && icon !== "check" ? 2.25 : 3} />
        </span>
      )}
      <span className="truncate">{title}</span>
    </span>
  );
}
