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
export function StylePreview({ style, sidebar = "auto", className }: { style: StylePreset; sidebar?: SidebarChoice; className?: string }) {
  const panel = sidebar === "auto" ? STYLE_DEFAULTS[style].sidebar : sidebar;
  return (
    <div
      data-style-preview={style}
      aria-hidden="true"
      className={cn("flex h-24 w-full overflow-hidden rounded-lg border bg-background text-foreground", className)}
      style={{ backgroundImage: "var(--app-bg-image)" }}
    >
      <div data-sidebar-panel={panel} className="flex w-1/4 shrink-0 flex-col gap-1.5 border-r bg-card p-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
        <span className="h-2 rounded-sm bg-accent" />
        <span className="h-1.5 w-4/5 rounded-sm bg-muted-foreground/40" />
        <span className="h-1.5 w-3/5 rounded-sm bg-muted-foreground/40" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2">
        <div className="flex flex-col gap-1 rounded-lg border bg-card p-2" style={{ boxShadow: "var(--shadow-1)" }}>
          <span className="truncate text-xs leading-none" style={{ fontWeight: "var(--heading-weight, 600)" }}>
            Aa Today
          </span>
          <span className="h-1.5 w-4/5 rounded-sm bg-muted-foreground/50" />
          <span className="h-1.5 w-1/2 rounded-sm bg-muted" />
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-8 rounded-md bg-primary" />
          <span className="h-3 w-6 rounded-md border bg-card" />
        </div>
      </div>
    </div>
  );
}
