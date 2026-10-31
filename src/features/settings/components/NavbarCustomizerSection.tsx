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
  type FloatingDockMode,
  type NavbarStyle,
  type SidebarAlign,
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

const FLOATING_DOCK_OPTIONS: readonly {
  value: FloatingDockMode;
  label: string;
  description: string;
  badge: string;
}[] = [
  {
    value: "always",
    label: "Always Visible (Dock Bar)",
    description: "Floating glass dock menu fixed at bottom center on desktop, tablet, and mobile.",
    badge: "Full Dock",
  },
  {
    value: "mobile",
    label: "Mobile & Tablet Only",
    description: "Activates the floating glass dock exclusively on mobile screens and tablets.",
    badge: "Responsive",
  },
  {
    value: "off",
    label: "Disabled (Sidebar only)",
    description: "Traditional workspace navigation using the main sidebar and top header.",
    badge: "Standard",
  },
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

      {/* 2. Floating Glass Dock Navigation (Uiverse.io design) */}
      <fieldset>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <legend className="text-sm font-semibold text-foreground">Floating Glass Dock Navigation</legend>
            <p className="text-xs text-muted-foreground">
              Ultra-glassmorphic bottom dock menu with spring micro-interactions, 3D specular shine, and quick module navigation.
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wide">
            Uiverse Design
          </span>
        </div>

        {/* Live Miniature Preview of the Uiverse Dock */}
        <div className="relative mb-4 flex w-full items-center justify-center overflow-hidden rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5">
          <div className="menu menu-preview max-w-lg">
            <a href="#" className="active" onClick={e => e.preventDefault()}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
                <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
              </svg>
              <span>Home</span>
            </a>
            <a href="#" onClick={e => e.preventDefault()}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" />
              </svg>
              <span>Tasks</span>
            </a>
            <a href="#" onClick={e => e.preventDefault()}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z" />
              </svg>
              <span>Notes</span>
            </a>
            <a href="#" onClick={e => e.preventDefault()}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69a1.5 1.5 0 0 1 2.56 1.06v11.38a1.5 1.5 0 0 1-2.56 1.06Z" />
              </svg>
              <span>Meet</span>
            </a>
            <a href="#" onClick={e => e.preventDefault()}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                <path d="M17.004 10.407c.138.435-.216.842-.672.842h-3.465a.75.75 0 0 1-.65-.375l-1.732-3c-.229-.396-.053-.907.393-1.004a5.252 5.252 0 0 1 6.126 3.537ZM8.12 8.464c.307-.338.838-.235 1.066.16l1.732 3a.75.75 0 0 1 0 .75l-1.732 3c-.229.397-.76.5-1.067.161A5.23 5.23 0 0 1 6.75 12a5.23 5.23 0 0 1 1.37-3.536ZM10.878 17.13c-.447-.098-.623-.608-.394-1.004l1.733-3.002a.75.75 0 0 1 .65-.375h3.465c.457 0 .81.407.672.842a5.252 5.252 0 0 1-6.126 3.539Z" />
                <path fillRule="evenodd" d="M21 12.75a.75.75 0 1 0 0-1.5h-.783a8.22 8.22 0 0 0-.237-1.357l.734-.267a.75.75 0 1 0-.513-1.41l-.735.268a8.24 8.24 0 0 0-.689-1.192l.6-.503a.75.75 0 1 0-.964-1.149l-.6.504a8.3 8.3 0 0 0-1.054-.885l.391-.678a.75.75 0 1 0-1.299-.75l-.39.676a8.188 8.188 0 0 0-1.295-.47l.136-.77a.75.75 0 0 0-1.477-.26l-.136.77a8.36 8.36 0 0 0-1.377 0l-.136-.77a.75.75 0 1 0-1.477.26l.136.77c-.448.121-.88.28-1.294.47l-.39-.676a.75.75 0 0 0-1.3.75l.392.678a8.29 8.29 0 0 0-1.054.885l-.6-.504a.75.75 0 1 0-.965 1.149l.6.503a8.243 8.243 0 0 0-.689 1.192L3.8 8.216a.75.75 0 1 0-.513 1.41l.735.267a8.222 8.222 0 0 0-.238 1.356h-.783a.75.75 0 0 0 0 1.5h.783c.042.464.122.917.238 1.356l-.735.268a.75.75 0 0 0 .513 1.41l.735-.268c.197.417.428.816.69 1.191l-.6.504a.75.75 0 0 0 .963 1.15l.601-.505c.326.323.679.62 1.054.885l-.392.68a.75.75 0 0 0 1.3.75l.39-.679c.414.192.847.35 1.294.471l-.136.77a.75.75 0 0 0 1.477.261l.137-.772a8.332 8.332 0 0 0 1.376 0l.136.772a.75.75 0 1 0 1.477-.26l-.136-.771a8.19 8.19 0 0 0 1.294-.47l.391.677a.75.75 0 0 0 1.3-.75l-.393-.679a8.29 8.29 0 0 0 1.054-.885l.601.504a.75.75 0 0 0 .964-1.15l-.6-.503c.261-.375.492-.774.69-1.191l.735.267a.75.75 0 1 0 .512-1.41l-.734-.267c.115-.439.195-.892.237-1.356h.784Zm-2.657-3.06a6.744 6.744 0 0 0-1.19-2.053 6.784 6.784 0 0 0-1.82-1.51A6.705 6.705 0 0 0 12 5.25a6.8 6.8 0 0 0-1.225.11 6.7 6.7 0 0 0-2.15.793 6.784 6.784 0 0 0-2.952 3.489.76.76 0 0 1-.036.098A6.74 6.74 0 0 0 5.251 12a6.74 6.74 0 0 0 3.366 5.842l.009.005a6.704 6.704 0 0 0 2.18.798l.022.003a6.792 6.792 0 0 0 2.368-.004 6.704 6.704 0 0 0 2.205-.811 6.785 6.785 0 0 0 1.762-1.484l.009-.01.009-.01a6.743 6.743 0 0 0 1.18-2.066c.253-.707.39-1.469.39-2.263a6.74 6.74 0 0 0-.408-2.309Z" clipRule="evenodd" />
              </svg>
              <span>Settings</span>
            </a>
          </div>
        </div>

        {/* Option cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {FLOATING_DOCK_OPTIONS.map(opt => {
            const isSelected = (preferences.floatingDock ?? "off") === opt.value;
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
                  name="floating-dock-mode"
                  value={opt.value}
                  checked={isSelected}
                  onChange={() => update("floatingDock", opt.value)}
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
