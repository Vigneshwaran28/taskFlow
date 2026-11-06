"use client";
import type { ComponentType } from "react";
import {
  Check,
  Columns,
  Layout,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Monitor,
  Moon,
  PanelLeft,
  PanelRight,
  Sun,
} from "lucide-react";
import { STYLE_META, StylePreview } from "@/components/shared/StylePreview";
import { useToast } from "@/components/shared/Toaster";
import { useUpdatePreferences } from "@/features/auth";
import {
  ACCENTS,
  STYLE_DEFAULTS,
  STYLES,
  useTheme,
  type Accent,
  type AppearancePreferences,
  type CardRadius,
  type FontChoice,
  type LayoutWidth,
  type NavbarStyle,
  type SidebarChoice,
  type ThemeMode,
  ACCENT_META,
} from "@/hooks/useTheme";
import { cn } from "@/lib/cn";
import type { SessionUser } from "@/types/session";
import { BackgroundPicker } from "./BackgroundPicker";
import { SettingsSection } from "./SettingsSection";
import { UserCssEditor } from "./UserCssEditor";

const THEME_OPTIONS: readonly { value: ThemeMode; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const LAYOUT_WIDTH_OPTIONS: readonly {
  value: LayoutWidth;
  label: string;
  description: string;
  badge: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { value: "standard", label: "Standard (6xl)", description: "Balanced 1152px width, optimal for reading and task forms.", badge: "Default", icon: Minimize2 },
  { value: "wide", label: "Spacious (7xl)", description: "Expansive 1380px canvas for multi-column boards and analytics.", badge: "Spacious", icon: Columns },
  { value: "full", label: "Fluid (Max)", description: "Maximized 1600px+ width, edge-to-edge on large ultrawide displays.", badge: "Maximized", icon: Maximize2 },
];

const CARD_RADIUS_OPTIONS: readonly {
  value: CardRadius;
  label: string;
  description: string;
  previewClass: string;
}[] = [
  { value: "default", label: "Style default", description: "Adapts to the active preset.", previewClass: "rounded-md" },
  { value: "sharp", label: "Sharp (2px)", description: "Clean, technical, crisp edges.", previewClass: "rounded-xs" },
  { value: "rounded", label: "Rounded (12px)", description: "Balanced modern SaaS corners.", previewClass: "rounded-xl" },
  { value: "pill", label: "Smooth (20px)", description: "Soft, organic, friendly curves.", previewClass: "rounded-2xl" },
];

const NAVBAR_STYLE_OPTIONS: readonly {
  value: NavbarStyle;
  label: string;
  description: string;
  badge: string;
  previewClass: string;
}[] = [
  {
    value: "glass",
    label: "Glass / Frosted",
    description: "Sleek frosted backdrop blur that lets page content subtly peek through.",
    badge: "Default",
    previewClass: "bg-background/70 backdrop-blur-md border-b border-border/80",
  },
  {
    value: "solid",
    label: "Solid Card",
    description: "Clean, high-contrast opaque background with a defined bottom border.",
    badge: "Clean",
    previewClass: "bg-card border-b border-border shadow-xs",
  },
  {
    value: "tinted",
    label: "Tinted Accent",
    description: "Warm, branded presence tinted with your workspace accent color.",
    badge: "Branded",
    previewClass: "bg-accent/40 border-b border-primary/25 backdrop-blur-sm",
  },
  {
    value: "floating",
    label: "Floating Island",
    description: "Detached pill navbar with rounded corners and elevated shadow.",
    badge: "Modern",
    previewClass: "my-1 mx-2 rounded-xl bg-card/90 border border-border shadow-md backdrop-blur",
  },
  {
    value: "dock",
    label: "Glass Dock Pill",
    description: "Ultra-glassmorphic rounded dock with specular 3D reflection and spring micro-interactions.",
    badge: "Uiverse",
    previewClass: "my-1 mx-auto max-w-[130px] rounded-full bg-primary/45 border border-white/30 shadow-md backdrop-blur saturate-150",
  },
];

// Swatch colours only (the full palettes live in globals.css). Complete class names for Tailwind.
/** Swatch class per accent (useTheme.tsx ACCENT_META). */
const SWATCHES = Object.fromEntries(ACCENTS.map(name => [name, ACCENT_META[name].swatch])) as Record<Accent, string>;

const FONT_OPTIONS: readonly { value: AppearancePreferences["fontScale"]; label: string; sample: string }[] = [
  { value: "sm", label: "Small", sample: "text-xs" },
  { value: "md", label: "Default", sample: "text-sm" },
  { value: "lg", label: "Large", sample: "text-base" },
];

const DENSITY_OPTIONS: readonly { value: AppearancePreferences["density"]; label: string; description: string }[] = [
  { value: "comfortable", label: "Comfortable", description: "More space between items." },
  { value: "compact", label: "Compact", description: "Fits more on the screen." },
];

// Each sample renders in its own family (the CSS variables come from next/font in app/layout.tsx).
const TYPEFACE_OPTIONS: readonly { value: Exclude<FontChoice, "auto">; label: string; family: string }[] = [
  { value: "system", label: "System", family: "var(--font-system)" },
  { value: "inter", label: "Inter", family: "var(--font-inter)" },
  { value: "jakarta", label: "Plus Jakarta Sans", family: "var(--font-jakarta)" },
  { value: "plex", label: "IBM Plex Sans", family: "var(--font-plex)" },
];

const SIDEBAR_OPTIONS: readonly { value: Exclude<SidebarChoice, "auto">; label: string }[] = [
  { value: "dock", label: "Glass Dock" },
  { value: "tinted", label: "Tinted" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const chipClass = (active: boolean) =>
  cn(
    "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium has-focus-visible:ring-2 has-focus-visible:ring-ring",
    active ? "border-primary bg-accent/60 text-accent-foreground" : "hover:bg-muted"
  );

const tileClass = (active: boolean) =>
  cn(
    "flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
    active ? "border-primary bg-accent/60 text-accent-foreground" : "hover:bg-muted"
  );


const legendClass = "mb-2 text-sm font-medium";

/**
 * Feature component: personal appearance, as Settings sections (Theme & style, Colours, Typography & density,
 * Background picture, My custom CSS). Everything but the CSS applies instantly and is saved to the account.
 */
export function AppearanceSettings({ user }: { user: SessionUser }) {
  const toast = useToast();
  const { preferences, setPreference, accent, brand, style } = useTheme();
  const save = useUpdatePreferences();
  const branding = user.tenant?.settings?.branding;

  function change<K extends keyof AppearancePreferences>(key: K, value: AppearancePreferences[K]) {
    setPreference(key, value);
    save.mutate({ [key]: value } as Partial<AppearancePreferences>, { onError: () => toast.error("Couldn't save your preference", "It still applies on this device.") });
  }

  const workspaceStyle = brand.style ?? "classic";
  const isDark = preferences.theme === "dark" || (preferences.theme === "system" && typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  const autoFont = TYPEFACE_OPTIONS.find(option => option.value === STYLE_DEFAULTS[style].font)?.label;
  const autoSidebar = SIDEBAR_OPTIONS.find(option => option.value === STYLE_DEFAULTS[style].sidebar)?.label;

  function pickStyle(next: AppearancePreferences["style"]) {
    change("style", next);
    // Midnight and Neon are made for dark surfaces: switch to dark mode with them (the theme can still be changed back).
    if ((next === "midnight" || next === "neon") && !isDark) change("theme", "dark");
  }

  return (
    <>
      <SettingsSection id="theme" title="Theme & style" description="Light or dark, the overall look, and the sidebar. Changes apply right away and follow you to any device." layout="stacked">
        <div className="flex flex-col gap-6">
          <fieldset>
            <legend className={legendClass}>Theme</legend>
            <div className="grid max-w-md grid-cols-3 gap-3">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <label key={value} className={tileClass(preferences.theme === value)}>
                  <input type="radio" name="theme" value={value} checked={preferences.theme === value} onChange={() => change("theme", value)} className="sr-only" />
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset disabled={brand.lockStyle}>
            <legend className={legendClass}>Style</legend>
            <label className={cn(chipClass(preferences.style === null), "mb-3 w-fit", brand.lockStyle && "cursor-not-allowed opacity-60")}>
              <input type="radio" name="style" checked={preferences.style === null} onChange={() => pickStyle(null)} className="sr-only" />
              Workspace default ({STYLE_META[workspaceStyle].label})
            </label>
            <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", brand.lockStyle && "opacity-60")}>
              {STYLES.map(name => {
                const selected = preferences.style === name;
                return (
                  <label
                    key={name}
                    className={cn(
                      "flex min-w-0 cursor-pointer flex-col gap-2 rounded-xl border p-2 text-left transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
                      selected ? "border-primary bg-accent/60" : "hover:bg-muted",
                      brand.lockStyle && "cursor-not-allowed"
                    )}
                  >
                    <input type="radio" name="style" value={name} checked={selected} onChange={() => pickStyle(name)} className="sr-only" />
                    <StylePreview style={name} sidebar={preferences.sidebar} />
                    <span className="flex items-center gap-1.5 px-1 text-sm font-medium">
                      {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                      {STYLE_META[name].label}
                    </span>
                    <span className="px-1 pb-1 text-xs text-muted-foreground">{STYLE_META[name].description}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {brand.lockStyle
                ? `Your workspace uses the ${STYLE_META[workspaceStyle].label} style for everyone.`
                : `In use: ${STYLE_META[style].label}${preferences.style === null ? " (workspace default)" : ""}.`}
            </p>
          </fieldset>

          <fieldset>
            <legend className={legendClass}>Sidebar</legend>
            <div className="grid max-w-md grid-cols-2 gap-3 sm:grid-cols-4">
              {(["auto", ...SIDEBAR_OPTIONS.map(option => option.value)] as SidebarChoice[]).map(value => {
                const look = value === "auto" ? STYLE_DEFAULTS[style].sidebar : value;
                const label = value === "auto" ? `Style default (${autoSidebar})` : SIDEBAR_OPTIONS.find(option => option.value === value)?.label;
                return (
                  <label key={value} className={cn(tileClass(preferences.sidebar === value), "text-xs")}>
                    <input type="radio" name="sidebar" value={value} checked={preferences.sidebar === value} onChange={() => change("sidebar", value)} className="sr-only" />
                    <span aria-hidden="true" className="flex h-10 w-full overflow-hidden rounded-md border bg-background">
                      <span data-sidebar-panel={look} className="flex w-2/5 flex-col gap-1 border-r bg-card p-1">
                        <span className="h-1.5 rounded-sm bg-accent" />
                        <span className="h-1 w-3/4 rounded-sm bg-muted-foreground/50" />
                        <span className="h-1 w-1/2 rounded-sm bg-muted-foreground/50" />
                      </span>
                    </span>
                    <span className="text-center">{label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      </SettingsSection>

      <SettingsSection
        id="layout"
        title="Layout & structure"
        description="Fine-tune your workspace canvas width, top navigation bar, sidebar placement, and card corner geometry. Fully responsive across devices."
        layout="stacked"
      >
        <div className="flex flex-col gap-8">
          {/* Real-time Layout Preview Canvas */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Layout className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Live Workspace Layout Preview
                </span>
              </div>
              <span className="rounded-full bg-accent/80 px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                {preferences.layoutWidth === "full" ? "Fluid Max Width" : preferences.layoutWidth === "wide" ? "Spacious 7xl" : "Standard 6xl"}
              </span>
            </div>

            <div className="relative flex h-40 w-full overflow-hidden rounded-xl border border-border/80 bg-background shadow-inner">
              {/* Top bar preview */}
              <div
                className={cn(
                  "absolute inset-x-0 top-0 z-10 flex h-7 items-center justify-between px-2.5 transition-all",
                  preferences.navbarStyle === "dock"
                    ? "mx-auto my-1 h-6 max-w-[200px] rounded-full border border-primary/40 bg-primary/25 shadow-sm backdrop-blur"
                    : preferences.navbarStyle === "floating"
                    ? "mx-2 my-1 h-6 rounded-lg border border-border/80 bg-card/90 shadow-sm"
                    : preferences.navbarStyle === "solid"
                    ? "border-b border-border bg-card shadow-xs"
                    : preferences.navbarStyle === "tinted"
                    ? "border-b border-primary/20 bg-accent/40"
                    : "border-b border-border/80 bg-background/80 backdrop-blur-xs"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <span className="h-1.5 w-12 rounded-xs bg-muted-foreground/40" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
                </div>
              </div>

              {/* Sidebar preview */}
              <div
                className={cn(
                  "absolute inset-y-7 flex flex-col border-border/70 bg-card p-1.5 transition-all duration-300",
                  preferences.sidebarPosition === "right" ? "right-0 border-l" : "left-0 border-r",
                  preferences.sidebarMode === "compact" ? "w-10 items-center" : "w-28",
                  preferences.sidebarAlign === "center" && "items-center"
                )}
              >
                <div className="mt-1 flex w-full flex-col gap-1">
                  <span className="h-2 w-full rounded-xs bg-accent/80" />
                  <span className="h-1.5 w-4/5 rounded-xs bg-muted-foreground/40" />
                  <span className="h-1.5 w-3/5 rounded-xs bg-muted-foreground/40" />
                </div>
              </div>

              {/* Main content canvas preview */}
              <div
                className={cn(
                  "absolute inset-y-7 flex flex-1 items-start justify-center p-3 transition-all duration-300",
                  preferences.sidebarPosition === "right"
                    ? preferences.sidebarMode === "compact" ? "left-0 right-10" : "left-0 right-28"
                    : preferences.sidebarMode === "compact" ? "left-10 right-0" : "left-28 right-0"
                )}
              >
                <div
                  className={cn(
                    "flex w-full flex-col gap-1.5 transition-all duration-300",
                    preferences.layoutWidth === "wide" ? "max-w-[85%]" : preferences.layoutWidth === "full" ? "max-w-full" : "max-w-[70%]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="h-2 w-16 rounded-xs bg-foreground/70" />
                    <span className="h-2 w-8 rounded-xs bg-primary/70" />
                  </div>
                  <div
                    className={cn(
                      "flex flex-col gap-1 border border-border/80 bg-card p-2 shadow-xs",
                      preferences.cardRadius === "sharp"
                        ? "rounded-xs"
                        : preferences.cardRadius === "rounded"
                        ? "rounded-xl"
                        : preferences.cardRadius === "pill"
                        ? "rounded-2xl"
                        : "rounded-lg"
                    )}
                  >
                    <span className="h-1.5 w-24 rounded-xs bg-foreground/60" />
                    <span className="h-1 w-full rounded-xs bg-muted-foreground/30" />
                    <span className="h-1 w-3/4 rounded-xs bg-muted-foreground/30" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 1. Layout Content Max-Width */}
          <fieldset>
            <legend className={legendClass}>Workspace Content Width</legend>
            <p className="mb-3 text-xs text-muted-foreground">
              Scale the maximum container width of your dashboard, task boards, and pages.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {LAYOUT_WIDTH_OPTIONS.map(option => {
                const isSelected = (preferences.layoutWidth || "standard") === option.value;
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer flex-col gap-2 rounded-xl border p-3.5 transition-all text-left has-focus-visible:ring-2 has-focus-visible:ring-ring",
                      isSelected
                        ? "border-primary bg-accent/50 shadow-xs"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="layout-width"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => change("layoutWidth", option.value)}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                        <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />}
                          {option.label}
                        </span>
                      </div>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {option.badge}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{option.description}</p>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* 2. Top Navigation Bar Style */}
          <fieldset>
            <legend className={legendClass}>Top Navigation Bar Style</legend>
            <p className="mb-3 text-xs text-muted-foreground">
              Select the visual treatment of the top navigation bar across all workspace modules.
            </p>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
              {NAVBAR_STYLE_OPTIONS.map(option => {
                const isSelected = (preferences.navbarStyle || "glass") === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "relative flex min-w-0 cursor-pointer flex-col justify-between gap-3 rounded-xl border p-3.5 transition-all text-left has-focus-visible:ring-2 has-focus-visible:ring-ring",
                      isSelected
                        ? "border-primary bg-accent/50 shadow-xs"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="navbar-style"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => change("navbarStyle", option.value)}
                      className="sr-only"
                    />
                    <div className="flex flex-col gap-3">
                      <div className="relative flex h-12 w-full items-center overflow-hidden rounded-lg border border-border/70 bg-muted/40 p-1">
                        <div className={cn("flex h-7 w-full items-center justify-between px-2 text-[10px]", option.previewClass)}>
                          <div className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-primary/70 shrink-0" />
                            <span className="h-1.5 w-10 rounded bg-muted-foreground/40" />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-xs bg-muted-foreground/30 shrink-0" />
                            <span className="h-2.5 w-2.5 rounded-full bg-primary/80 shrink-0" />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground">
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />}
                          <span className="truncate">{option.label}</span>
                        </span>
                        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {option.badge}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{option.description}</p>
                  </label>
                );
              })}
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={preferences.navbarSticky !== false}
                onChange={e => change("navbarSticky", e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span>Keep top navigation bar sticky at the top when scrolling down</span>
            </label>
          </fieldset>

          {/* 3. Sidebar Placement & Mode */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <fieldset>
              <legend className={legendClass}>Sidebar Position</legend>
              <p className="mb-2 text-xs text-muted-foreground">Dock the main sidebar navigation to either screen edge.</p>
              <div className="grid grid-cols-2 gap-3">
                <label className={cn(tileClass((preferences.sidebarPosition ?? "left") === "left"), "text-xs")}>
                  <input
                    type="radio"
                    name="sidebar-position"
                    value="left"
                    checked={(preferences.sidebarPosition ?? "left") === "left"}
                    onChange={() => change("sidebarPosition", "left")}
                    className="sr-only"
                  />
                  <PanelLeft className="h-5 w-5" />
                  <span>Left side (Default)</span>
                </label>
                <label className={cn(tileClass((preferences.sidebarPosition ?? "left") === "right"), "text-xs")}>
                  <input
                    type="radio"
                    name="sidebar-position"
                    value="right"
                    checked={(preferences.sidebarPosition ?? "left") === "right"}
                    onChange={() => change("sidebarPosition", "right")}
                    className="sr-only"
                  />
                  <PanelRight className="h-5 w-5" />
                  <span>Right side</span>
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend className={legendClass}>Sidebar Mode</legend>
              <p className="mb-2 text-xs text-muted-foreground">Choose expanded width or space-saving icon rail.</p>
              <div className="grid grid-cols-2 gap-3">
                <label className={cn(tileClass((preferences.sidebarMode ?? "full") === "full"), "text-xs")}>
                  <input
                    type="radio"
                    name="sidebar-mode"
                    value="full"
                    checked={(preferences.sidebarMode ?? "full") === "full"}
                    onChange={() => change("sidebarMode", "full")}
                    className="sr-only"
                  />
                  <LayoutGrid className="h-5 w-5" />
                  <span>Expanded (Full)</span>
                </label>
                <label className={cn(tileClass((preferences.sidebarMode ?? "full") === "compact"), "text-xs")}>
                  <input
                    type="radio"
                    name="sidebar-mode"
                    value="compact"
                    checked={(preferences.sidebarMode ?? "full") === "compact"}
                    onChange={() => change("sidebarMode", "compact")}
                    className="sr-only"
                  />
                  <Columns className="h-5 w-5" />
                  <span>Collapsed (Rail)</span>
                </label>
              </div>
            </fieldset>
          </div>

          {/* 4. Card & Surface Geometry (Radius) */}
          <fieldset>
            <legend className={legendClass}>Card & Surface Geometry (Corner Radius)</legend>
            <p className="mb-3 text-xs text-muted-foreground">
              Define the corner curvature of cards, dialogs, dropdowns, and surfaces across TaskFlow.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CARD_RADIUS_OPTIONS.map(option => {
                const isSelected = (preferences.cardRadius || "default") === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer flex-col gap-2 rounded-xl border p-3 transition-all text-left has-focus-visible:ring-2 has-focus-visible:ring-ring",
                      isSelected
                        ? "border-primary bg-accent/50 shadow-xs"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="card-radius"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => change("cardRadius", option.value)}
                      className="sr-only"
                    />
                    <div className="flex h-8 items-center justify-center rounded-lg border border-border/80 bg-muted/40 p-1">
                      <div className={cn("h-5 w-12 border border-primary/60 bg-primary/20", option.previewClass)} />
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      {isSelected && <Check className="h-3 w-3 text-primary shrink-0" aria-hidden="true" />}
                      {option.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-normal">{option.description}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      </SettingsSection>

      <div className="rounded-xl border border-border/80 bg-muted/40 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
              <PanelLeft className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Icon Library & Customization</h3>
              <p className="text-xs text-muted-foreground">Choose from 4 icon families (Lucide, Tabler, Heroicons, Phosphor) and customize stroke weight or module icons.</p>
            </div>
          </div>
          <a
            href="?tab=navigation"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 shrink-0 self-start sm:self-auto"
          >
            <span>Open Icon Settings</span>
          </a>
        </div>
      </div>

      <SettingsSection id="colours" title="Colours" description="The accent colour of buttons, links, and highlights.">
        <fieldset disabled={brand.lockAccent}>
          <legend className={legendClass}>Accent colour</legend>
          <div className={cn("flex flex-wrap items-center gap-2", brand.lockAccent && "opacity-60")}>
            <label className={cn(chipClass(preferences.accent === null), brand.lockAccent && "cursor-not-allowed")}>
              <input type="radio" name="accent" checked={preferences.accent === null} onChange={() => change("accent", null)} className="sr-only" />
              <span className={cn("h-4 w-4 rounded-full", SWATCHES[brand.accent])} aria-hidden="true" />
              Workspace colour
            </label>
            {ACCENTS.map(name => {
              const selected = preferences.accent === name;
              return (
                <label key={name} className={cn("cursor-pointer", brand.lockAccent && "cursor-not-allowed")} title={ACCENT_META[name].label}>
                  <input type="radio" name="accent" value={name} checked={selected} onChange={() => change("accent", name)} className="peer sr-only" />
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 ring-offset-card peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                      SWATCHES[name],
                      selected && "ring-2 ring-foreground"
                    )}
                  >
                    {selected && <Check className="h-4 w-4 text-white" aria-hidden="true" />}
                  </span>
                  <span className="sr-only">{ACCENT_META[name].label}</span>
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {brand.lockAccent
              ? `Your workspace uses ${ACCENT_META[brand.accent].label} for everyone.`
              : `In use: ${ACCENT_META[accent].label}${preferences.accent === null ? " (workspace colour)" : ""}. For other colours, use My custom CSS below.`}
          </p>
        </fieldset>
      </SettingsSection>

      <SettingsSection id="typography" title="Typography & density" description="Typeface, text size, how much fits on the screen, and motion.">
        <div className="flex flex-col gap-6">
          <fieldset>
            <legend className={legendClass}>Typeface</legend>
            <div className="flex flex-wrap gap-2">
              <label className={chipClass(preferences.font === "auto")}>
                <input type="radio" name="typeface" checked={preferences.font === "auto"} onChange={() => change("font", "auto")} className="sr-only" />
                Style default ({autoFont})
              </label>
              {TYPEFACE_OPTIONS.map(option => (
                <label key={option.value} className={chipClass(preferences.font === option.value)} style={{ fontFamily: option.family }}>
                  <input type="radio" name="typeface" value={option.value} checked={preferences.font === option.value} onChange={() => change("font", option.value)} className="sr-only" />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={legendClass}>Text size</legend>
            <div className="grid max-w-md grid-cols-3 gap-3">
              {FONT_OPTIONS.map(option => (
                <label key={option.value} className={tileClass(preferences.fontScale === option.value)}>
                  <input type="radio" name="font-scale" checked={preferences.fontScale === option.value} onChange={() => change("fontScale", option.value)} className="sr-only" />
                  <span className={cn("font-semibold", option.sample)} aria-hidden="true">
                    Aa
                  </span>
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={legendClass}>Density</legend>
            <div className="grid max-w-md gap-3 sm:grid-cols-2">
              {DENSITY_OPTIONS.map(option => (
                <label key={option.value} className={cn(tileClass(preferences.density === option.value), "items-start text-left")}>
                  <input type="radio" name="density" checked={preferences.density === option.value} onChange={() => change("density", option.value)} className="sr-only" />
                  {option.label}
                  <span className="text-xs font-normal text-muted-foreground">{option.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={preferences.reduceMotion} onChange={event => change("reduceMotion", event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-input accent-primary" />
            <span>
              <span className="block text-sm font-medium">Reduce motion</span>
              <span className="block text-xs text-muted-foreground">Turns off animations and transitions.</span>
            </span>
          </label>
        </div>
      </SettingsSection>

      <SettingsSection id="background" title="Background picture" description="A picture behind the app, dimmed so text stays readable." layout="stacked">
        <BackgroundPicker
          key={preferences.backgroundImage ?? "workspace"}
          preferences={preferences}
          workspaceImage={brand.backgroundImage ?? ""}
          workspaceDim={brand.backgroundDim ?? 40}
          onPreview={(key, value) => setPreference(key, value)}
          onSave={change}
          chipClass={chipClass}
        />
      </SettingsSection>

      <SettingsSection
        id="custom-css"
        title="My custom CSS"
        description="Fine-tune corners, shadows, spacing, typefaces, and colours with your own CSS. Only you see it; it's saved when you choose Save."
        layout="stacked"
      >
        <UserCssEditor
          key={`${user.preferences?.customCss ?? ""}|${Boolean(user.preferences?.customCssEnabled)}`}
          savedCss={user.preferences?.customCss ?? ""}
          savedEnabled={Boolean(user.preferences?.customCssEnabled)}
          allowed={branding?.allowUserCss !== false}
          workspaceSlug={user.tenant?.slug}
        />
      </SettingsSection>
    </>
  );
}
