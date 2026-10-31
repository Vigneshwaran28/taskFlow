// Style presets: names and descriptions, and a miniature of the app drawn with a preset's real CSS variables
// (globals.css matches [data-style-preview] with the same blocks as <html data-style>).
import { STYLE_DEFAULTS, type SidebarChoice, type StylePreset } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";

export const STYLE_META: Readonly<Record<StylePreset, { label: string; description: string }>> = Object.freeze({
  classic: { label: "Classic", description: "The original TaskFlow look." },
  business: { label: "Modern business", description: "Crisp neutrals, hairline borders, navy sidebar." },
  glass: { label: "Glass", description: "Translucent cards over a soft gradient." },
  midnight: { label: "Midnight executive", description: "Deep dark surfaces with accent highlights. Best in dark mode." },
  minimal: { label: "Minimal", description: "Flat, no shadows, more whitespace." },
  soft: { label: "Soft", description: "Rounded corners and pastel surfaces." },
  contrast: { label: "High contrast", description: "Strong borders and maximum text contrast (WCAG AAA)." },
  neon: { label: "Neon", description: "Glowing accent edges on near-black. Best in dark mode." },
  ocean: { label: "Ocean", description: "Cool blues and teals, airy and calm." },
  sunset: { label: "Sunset", description: "Warm peach and coral, rounded and friendly." },
  forest: { label: "Forest", description: "Earthy greens and soft neutrals." },
});

/** A miniature app window in `style`: sidebar, a card with a heading, muted text, and a primary button. Decorative. */
export function StylePreview({
  style,
  sidebar = "auto",
  className,
  cardRadius,
}: {
  style: StylePreset;
  sidebar?: SidebarChoice;
  className?: string;
  cardRadius?: "default" | "sharp" | "rounded" | "pill";
}) {
  const panel = sidebar === "auto" ? STYLE_DEFAULTS[style].sidebar : sidebar;
  return (
    <div
      data-style-preview={style}
      data-card-radius={cardRadius && cardRadius !== "default" ? cardRadius : undefined}
      aria-hidden="true"
      className={cn(
        "relative flex h-26 w-full overflow-hidden rounded-xl border border-border/80 bg-background text-foreground transition-all shadow-xs",
        className
      )}
      style={{ backgroundImage: "var(--app-bg-image)" }}
    >
      {/* Mini App Sidebar */}
      <div data-sidebar-panel={panel} className="flex w-[28%] shrink-0 flex-col gap-1.5 border-r border-border/70 bg-card p-1.5">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="h-1.5 w-6 rounded-xs bg-muted-foreground/30" />
        </div>
        <div className="mt-1 flex flex-col gap-1">
          <span className="h-2 w-full rounded-xs bg-accent/80" />
          <span className="h-1.5 w-4/5 rounded-xs bg-muted-foreground/40" />
          <span className="h-1.5 w-3/5 rounded-xs bg-muted-foreground/40" />
        </div>
      </div>

      {/* Mini App Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2">
        {/* Top bar mockup */}
        <div className="flex h-3 items-center justify-between border-b border-border/40 pb-1">
          <span className="h-1.5 w-10 rounded-xs bg-muted-foreground/30" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
        </div>

        {/* Card Mockup */}
        <div className="flex flex-col gap-1 rounded-lg border border-border/80 bg-card p-1.5" style={{ boxShadow: "var(--shadow-1)" }}>
          <div className="flex items-center justify-between">
            <span className="truncate text-[10px] font-semibold leading-tight tracking-tight">
              TaskFlow
            </span>
            <span className="h-1.5 w-3 rounded-full bg-primary/40" />
          </div>
          <span className="h-1 w-full rounded-xs bg-muted-foreground/30" />
        </div>

        {/* Buttons */}
        <div className="mt-auto flex items-center gap-1">
          <span className="h-2.5 w-7 rounded-sm bg-primary" />
          <span className="h-2.5 w-5 rounded-sm border border-border bg-card" />
        </div>
      </div>
    </div>
  );
}
