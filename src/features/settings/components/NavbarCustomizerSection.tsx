"use client";

import {
  AlignCenter,
  AlignLeft,
  Check,
  PanelLeft,
  PanelRight,
  Pin,
  Volume2,
  Video,
} from "lucide-react";
import { useToast } from "@/components/shared/Toaster";
import { useUpdatePreferences } from "@/features/auth";
import {
  useTheme,
  type AppearancePreferences,
  type NavbarStyle,
  type SidebarAlign,
  type SidebarChoice,
  type SidebarMode,
  type SidebarPosition,
} from "@/hooks/useTheme";
import { cn } from "@/lib/cn";

const NAVBAR_STYLE_OPTIONS: readonly {
  value: NavbarStyle;
  label: string;
  description: string;
  badge: string;
  previewClass: string;
}[] = [
  {
    value: "glass",
    label: "Glass / Translucent",
    description: "Sleek frosted backdrop blur that lets page content subtly shine through.",
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
    previewClass: "my-1.5 mx-2 rounded-xl bg-card/90 border border-border shadow-md backdrop-blur",
  },
  {
    value: "dock",
    label: "Glass Dock Pill",
    description: "Ultra-glassmorphic rounded dock with specular 3D reflection and spring micro-interactions.",
    badge: "Uiverse",
    previewClass: "my-1 mx-auto max-w-[130px] rounded-full bg-primary/45 border border-white/30 shadow-md backdrop-blur saturate-150",
  },
];

const SIDEBAR_LOOK_OPTIONS: readonly {
  value: SidebarChoice;
  label: string;
  description: string;
  badge: string;
}[] = [
  {
    value: "dock",
    label: "Glass Dock",
    description: "Ultra-glassmorphic vertical dock with 3D specular shine, spring micro-interactions, and glossy active pill.",
    badge: "Uiverse",
  },
  {
    value: "tinted",
    label: "Tinted Accent",
    description: "Warm, branded presence tinted with your workspace accent color.",
    badge: "Branded",
  },
  {
    value: "dark",
    label: "Dark Obsidian",
    description: "High-contrast dark card look with subtle glows and crisp borders.",
    badge: "Modern",
  },
  {
    value: "light",
    label: "Clean Solid",
    description: "Crisp, solid card background with defined borders and high contrast.",
    badge: "Clean",
  },
];

const SIDEBAR_COLOR_OPTIONS: readonly {
  value: string;
  label: string;
  color: string;
}[] = [
  { value: "default", label: "Default Accent", color: "var(--color-primary)" },
  { value: "#2563eb", label: "Ocean Blue", color: "#2563eb" },
  { value: "#059669", label: "Emerald Green", color: "#059669" },
  { value: "#0891b2", label: "Cyan Glow", color: "#0891b2" },
  { value: "#7c3aed", label: "Royal Violet", color: "#7c3aed" },
  { value: "#ea580c", label: "Sunset Amber", color: "#ea580c" },
  { value: "#e11d48", label: "Rose Neon", color: "#e11d48" },
  { value: "#334155", label: "Slate Frost", color: "#334155" },
];

const POSITION_OPTIONS: readonly {
  value: SidebarPosition;
  label: string;
  description: string;
  icon: typeof PanelLeft;
}[] = [
  { value: "left", label: "Left side", description: "Standard layout for desktop applications.", icon: PanelLeft },
  { value: "right", label: "Right side", description: "Useful for RTL workflows or secondary screens.", icon: PanelRight },
];

const MODE_OPTIONS: readonly {
  value: SidebarMode;
  label: string;
  description: string;
}[] = [
  { value: "full", label: "Expanded (Full)", description: "Shows module icons and descriptive labels side by side." },
  { value: "compact", label: "Collapsed (Icon rail)", description: "Slim icon-only rail maximizing horizontal workspace." },
];

const ALIGN_OPTIONS: readonly {
  value: SidebarAlign;
  label: string;
  description: string;
  icon: typeof AlignLeft;
}[] = [
  { value: "left", label: "Left / Top", description: "Navigation items align naturally at the top.", icon: AlignLeft },
  { value: "center", label: "Centered", description: "Items centered vertically for focused compact workflows.", icon: AlignCenter },
];

export function NavbarCustomizerSection() {
  const toast = useToast();
  const { preferences, setPreference } = useTheme();
  const save = useUpdatePreferences();

  const currentNavbarStyle: NavbarStyle = preferences.navbarStyle || "glass";
  const isNavbarSticky = preferences.navbarSticky !== false;
  const showQuickMeet = preferences.showQuickMeet !== false;
  const showSoundToggle = preferences.showSoundToggle !== false;
  const sidebarPosition = preferences.sidebarPosition ?? "left";
  const sidebarMode = preferences.sidebarMode ?? "full";
  const sidebarAlign = preferences.sidebarAlign ?? "left";

  function update<K extends keyof AppearancePreferences>(key: K, value: AppearancePreferences[K]) {
    setPreference(key, value);
    save.mutate(
      { [key]: value } as Partial<AppearancePreferences>,
      {
        onError: () =>
          toast.error("Couldn't save your preference", "It will remain active on this browser."),
      }
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Navbar Appearance / Style */}
      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-foreground">Top Navigation Bar Style</legend>
        <p className="mb-4 text-xs text-muted-foreground">
          Choose how the main top navigation bar renders across all workspace modules.
        </p>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {NAVBAR_STYLE_OPTIONS.map(option => {
            const isSelected = currentNavbarStyle === option.value;
            return (
              <label
                key={option.value}
                className={cn(
                  "relative flex min-w-0 cursor-pointer flex-col justify-between gap-3 rounded-xl border p-3.5 transition-all text-left has-focus-visible:ring-2 has-focus-visible:ring-ring",
                  isSelected
                    ? "border-primary bg-accent/40 shadow-xs"
                    : "border-border hover:border-primary/40 hover:bg-muted/50"
                )}
              >
                <input
                  type="radio"
                  name="navbar-style"
                  value={option.value}
                  checked={isSelected}
                  onChange={() => update("navbarStyle", option.value)}
                  className="sr-only"
                />

                <div className="flex flex-col gap-3">
                  {/* Mini mockup illustration of the topbar style */}
                  <div className="relative flex h-14 w-full items-center overflow-hidden rounded-lg border border-border/70 bg-muted/40 p-1.5">
                    <div className={cn("flex h-8 w-full items-center justify-between px-2 text-[10px]", option.previewClass)}>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-primary/70 shrink-0" />
                        <span className="h-1.5 w-12 rounded bg-muted-foreground/40" />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-xs bg-muted-foreground/30 shrink-0" />
                        <span className="h-2 w-2 rounded-xs bg-muted-foreground/30 shrink-0" />
                        <span className="h-3 w-3 rounded-full bg-primary/80 shrink-0" />
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
      </fieldset>

      {/* 2. Left Sidebar Navigation & Glass Dock Style (Uiverse.io design) */}
      <fieldset>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <legend className="text-sm font-semibold text-foreground">Left Sidebar Navigation & Glass Dock</legend>
            <p className="text-xs text-muted-foreground">
              Ultra-glassmorphic styling with 3D specular shine, spring micro-interactions, glossy active pill, and custom color accents applied to your vertical sidebar.
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wide">
            Uiverse Design
          </span>
        </div>

        {/* Live Miniature Preview of the Left Sidebar Glass Dock */}
        <div className="relative mb-5 flex w-full flex-col sm:flex-row items-center justify-center gap-6 overflow-hidden rounded-2xl border border-border/80 bg-muted/30 p-5 sm:p-6">
          {/* Vertical Dock Pill Preview (Compact Mode) */}
          <div className="flex flex-col items-center">
            <span className="mb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Vertical Dock (Compact)</span>
            <div
              className="flex flex-col items-center gap-2 p-2 rounded-2xl border backdrop-blur-xl shadow-xl transition-all"
              style={{
                background: preferences.sidebarColor
                  ? `color-mix(in srgb, ${preferences.sidebarColor} 22%, rgba(255, 255, 255, 0.72))`
                  : "rgba(0, 122, 255, 0.18)",
                borderColor: "rgba(255, 255, 255, 0.35)",
                boxShadow: "0 12px 32px rgba(0,0,0,0.12), inset 1px 1px 3px rgba(255,255,255,0.6)",
              }}
            >
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center shadow-md font-bold text-xs ring-1 ring-white/60 transition-transform hover:scale-110"
                style={{
                  background: "rgba(255, 255, 255, 0.96)",
                  color: preferences.sidebarColor || "var(--color-primary)",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.12), inset 0 1px 1.5px rgba(255,255,255,0.95)",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                  <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
                  <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
                </svg>
              </div>
              <div className="h-9 w-9 rounded-xl flex items-center justify-center text-foreground/80 hover:bg-white/30 transition-all text-xs cursor-pointer hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                  <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="h-9 w-9 rounded-xl flex items-center justify-center text-foreground/80 hover:bg-white/30 transition-all text-xs cursor-pointer hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                  <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z" />
                </svg>
              </div>
              <div className="h-9 w-9 rounded-xl flex items-center justify-center text-foreground/80 hover:bg-white/30 transition-all text-xs cursor-pointer hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                  <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69a1.5 1.5 0 0 1 2.56 1.06v11.38a1.5 1.5 0 0 1-2.56 1.06Z" />
                </svg>
              </div>
              <div className="h-9 w-9 rounded-xl flex items-center justify-center text-foreground/80 hover:bg-white/30 transition-all text-xs cursor-pointer hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm0 13.5a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Color & Tint Selector */}
          <div className="flex flex-col gap-3 min-w-0 flex-1">
            <span className="text-xs font-semibold text-foreground">Sidebar Dock Tint & Glow Color</span>
            <p className="text-xs text-muted-foreground">Select a custom color wash for your left navigation dock:</p>
            <div className="flex flex-wrap items-center gap-2.5">
              {SIDEBAR_COLOR_OPTIONS.map(c => {
                const isSelected = (preferences.sidebarColor || "default") === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => update("sidebarColor", c.value === "default" ? null : c.value)}
                    title={c.label}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all cursor-pointer border",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-sm scale-105"
                        : "border-border bg-card hover:border-primary/40 text-foreground"
                    )}
                  >
                    <span
                      className="h-3 w-3 rounded-full shrink-0 border border-white/40"
                      style={{ backgroundColor: c.color }}
                    />
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Look Option Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SIDEBAR_LOOK_OPTIONS.map(opt => {
            const isSelected = (preferences.sidebar || "dock") === opt.value;
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex min-w-0 cursor-pointer flex-col justify-between gap-2.5 rounded-xl border p-3.5 transition-all text-left has-focus-visible:ring-2 has-focus-visible:ring-ring",
                  isSelected
                    ? "border-primary bg-accent/40 shadow-xs"
                    : "border-border hover:border-primary/40 hover:bg-muted/50"
                )}
              >
                <input
                  type="radio"
                  name="sidebar-look"
                  value={opt.value}
                  checked={isSelected}
                  onChange={() => update("sidebar", opt.value)}
                  className="sr-only"
                />
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground">
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {opt.badge}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* 3. Topbar Behavior & Action Buttons */}
      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-foreground">Navbar Behavior & Quick Actions</legend>
        <p className="mb-4 text-xs text-muted-foreground">
          Configure scrolling behavior and which utility buttons appear in the top right header.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Sticky Toggle */}
          <label
            className={cn(
              "flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all has-focus-visible:ring-2 has-focus-visible:ring-ring",
              isNavbarSticky
                ? "border-primary/60 bg-accent/30"
                : "border-border hover:border-primary/40 hover:bg-muted/50"
            )}
          >
            <input
              type="checkbox"
              checked={isNavbarSticky}
              onChange={e => update("navbarSticky", e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Pin className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                <span className="truncate">Sticky Navbar</span>
              </span>
              <span className="text-xs text-muted-foreground leading-relaxed">
                Stays pinned to the top as you scroll long pages.
              </span>
            </div>
          </label>

          {/* Quick Meet Shortcut */}
          <label
            className={cn(
              "flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all has-focus-visible:ring-2 has-focus-visible:ring-ring",
              showQuickMeet
                ? "border-primary/60 bg-accent/30"
                : "border-border hover:border-primary/40 hover:bg-muted/50"
            )}
          >
            <input
              type="checkbox"
              checked={showQuickMeet}
              onChange={e => update("showQuickMeet", e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Video className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                <span className="truncate">Quick Meet Button</span>
              </span>
              <span className="text-xs text-muted-foreground leading-relaxed">
                Show instant video meeting launcher in the top bar.
              </span>
            </div>
          </label>

          {/* Audio Sound Toggle */}
          <label
            className={cn(
              "flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all has-focus-visible:ring-2 has-focus-visible:ring-ring",
              showSoundToggle
                ? "border-primary/60 bg-accent/30"
                : "border-border hover:border-primary/40 hover:bg-muted/50"
            )}
          >
            <input
              type="checkbox"
              checked={showSoundToggle}
              onChange={e => update("showSoundToggle", e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Volume2 className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                <span className="truncate">Audio Feedback Toggle</span>
              </span>
              <span className="text-xs text-muted-foreground leading-relaxed">
                Show sound effects mute/unmute control in the header.
              </span>
            </div>
          </label>
        </div>
      </fieldset>

      {/* 3. Sidebar Navigation Controls */}
      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-foreground">Sidebar Navigation Layout</legend>
        <p className="mb-4 text-xs text-muted-foreground">
          Control placement, width, and vertical alignment of the primary sidebar navigation menu.
        </p>

        <div className="flex flex-col gap-4">
          {/* Position */}
          <div>
            <span className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Position
            </span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-xl">
              {POSITION_OPTIONS.map(option => {
                const isSelected = sidebarPosition === option.value;
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex min-w-0 cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-all text-left has-focus-visible:ring-2 has-focus-visible:ring-ring",
                      isSelected
                        ? "border-primary bg-accent/40 shadow-xs"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="sidebar-position"
                      checked={isSelected}
                      onChange={() => update("sidebarPosition", option.value)}
                      className="sr-only"
                    />
                    <Icon className="mt-0.5 h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                        {isSelected && <Check className="h-3 w-3 text-primary shrink-0" aria-hidden="true" />}
                        <span className="truncate">{option.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Display Mode */}
          <div>
            <span className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Display Mode
            </span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-xl">
              {MODE_OPTIONS.map(option => {
                const isSelected = sidebarMode === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex min-w-0 cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-all text-left has-focus-visible:ring-2 has-focus-visible:ring-ring",
                      isSelected
                        ? "border-primary bg-accent/40 shadow-xs"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="sidebar-mode"
                      checked={isSelected}
                      onChange={() => update("sidebarMode", option.value)}
                      className="sr-only"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                        {isSelected && <Check className="h-3 w-3 text-primary shrink-0" aria-hidden="true" />}
                        <span className="truncate">{option.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Alignment */}
          <div>
            <span className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Alignment
            </span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-xl">
              {ALIGN_OPTIONS.map(option => {
                const isSelected = sidebarAlign === option.value;
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex min-w-0 cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-all text-left has-focus-visible:ring-2 has-focus-visible:ring-ring",
                      isSelected
                        ? "border-primary bg-accent/40 shadow-xs"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="sidebar-align"
                      checked={isSelected}
                      onChange={() => update("sidebarAlign", option.value)}
                      className="sr-only"
                    />
                    <Icon className="mt-0.5 h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                        {isSelected && <Check className="h-3 w-3 text-primary shrink-0" aria-hidden="true" />}
                        <span className="truncate">{option.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  );
}
