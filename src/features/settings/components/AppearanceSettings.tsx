"use client";
import type { ComponentType } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { STYLE_META, StylePreview } from "@/components/shared/StylePreview";
import { useToast } from "@/components/shared/Toaster";
import { useUpdatePreferences } from "@/features/auth";
import { ACCENTS, STYLE_DEFAULTS, STYLES, useTheme, type Accent, type AppearancePreferences, type FontChoice, type SidebarChoice, type SidebarPosition, type SidebarMode, type SidebarAlign, type ThemeMode, ACCENT_META } from "@/hooks/useTheme";
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
  { value: "light", label: "Light" },
  { value: "tinted", label: "Tinted" },
  { value: "dark", label: "Dark" },
];

const POSITION_OPTIONS: readonly { value: SidebarPosition; label: string; description: string }[] = [
  { value: "left", label: "Left side", description: "Standard layout with sidebar placed on the left." },
  { value: "right", label: "Right side", description: "Sidebar placed on the right side of the screen." },
];

const MODE_OPTIONS: readonly { value: SidebarMode; label: string; description: string }[] = [
  { value: "full", label: "Icon & label", description: "Expanded navigation with both icons and labels." },
  { value: "compact", label: "Icon alone", description: "Compact rail with icons only and hover tooltips." },
];

const ALIGN_OPTIONS: readonly { value: SidebarAlign; label: string; description: string }[] = [
  { value: "left", label: "Left aligned", description: "Left-aligned icons and menu item text." },
  { value: "center", label: "Centered", description: "Centered navigation icons and text labels." },
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
      <SettingsSection id="theme" title="Theme & style" description="Light or dark, the overall look, and the sidebar. Changes apply right away and follow you to any device.">
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

          <fieldset>
            <legend className={legendClass}>Sidebar position</legend>
            <div className="grid max-w-md grid-cols-2 gap-3">
              {POSITION_OPTIONS.map(option => (
                <label key={option.value} className={cn(tileClass((preferences.sidebarPosition ?? "left") === option.value), "items-start text-left")}>
                  <input type="radio" name="sidebar-position" checked={(preferences.sidebarPosition ?? "left") === option.value} onChange={() => change("sidebarPosition", option.value)} className="sr-only" />
                  <span className="font-medium text-sm">{option.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">{option.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={legendClass}>Sidebar display mode</legend>
            <div className="grid max-w-md grid-cols-2 gap-3">
              {MODE_OPTIONS.map(option => (
                <label key={option.value} className={cn(tileClass((preferences.sidebarMode ?? "full") === option.value), "items-start text-left")}>
                  <input type="radio" name="sidebar-mode" checked={(preferences.sidebarMode ?? "full") === option.value} onChange={() => change("sidebarMode", option.value)} className="sr-only" />
                  <span className="font-medium text-sm">{option.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">{option.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={legendClass}>Sidebar alignment</legend>
            <div className="grid max-w-md grid-cols-2 gap-3">
              {ALIGN_OPTIONS.map(option => (
                <label key={option.value} className={cn(tileClass((preferences.sidebarAlign ?? "left") === option.value), "items-start text-left")}>
                  <input type="radio" name="sidebar-align" checked={(preferences.sidebarAlign ?? "left") === option.value} onChange={() => change("sidebarAlign", option.value)} className="sr-only" />
                  <span className="font-medium text-sm">{option.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">{option.description}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </SettingsSection>

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

      <SettingsSection id="background" title="Background picture" description="A picture behind the app, dimmed so text stays readable.">
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
