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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {NAVBAR_STYLE_OPTIONS.map(option => {
            const isSelected = currentNavbarStyle === option.value;
            return (
              <label
                key={option.value}
                className={cn(
                  "relative flex cursor-pointer flex-col gap-2.5 rounded-xl border p-3.5 transition-all text-left has-focus-visible:ring-2 has-focus-visible:ring-ring",
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

                {/* Mini mockup illustration of the topbar style */}
                <div className="relative flex h-14 w-full items-center overflow-hidden rounded-lg border border-border/70 bg-muted/40 p-1.5">
                  <div className={cn("flex h-8 w-full items-center justify-between px-2 text-[10px]", option.previewClass)}>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary/70" />
                      <span className="h-1.5 w-12 rounded bg-muted-foreground/40" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm bg-muted-foreground/30" />
                      <span className="h-2 w-2 rounded-sm bg-muted-foreground/30" />
                      <span className="h-3 w-3 rounded-full bg-primary/80" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />}
                    {option.label}
                  </span>
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

      {/* 2. Topbar Behavior & Action Buttons */}
      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-foreground">Navbar Behavior & Quick Actions</legend>
        <p className="mb-4 text-xs text-muted-foreground">
          Configure scrolling behavior and which utility buttons appear in the top right header.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Sticky Toggle */}
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all has-focus-visible:ring-2 has-focus-visible:ring-ring",
              isNavbarSticky
                ? "border-primary/60 bg-accent/30"
                : "border-border hover:border-primary/40 hover:bg-muted/50"
            )}
          >
            <input
              type="checkbox"
              checked={isNavbarSticky}
              onChange={e => update("navbarSticky", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
            />
            <div className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Pin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Sticky Navbar
              </span>
              <span className="text-xs text-muted-foreground">
                Stays pinned to the top as you scroll long pages.
              </span>
            </div>
          </label>

          {/* Quick Meet Shortcut */}
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all has-focus-visible:ring-2 has-focus-visible:ring-ring",
              showQuickMeet
                ? "border-primary/60 bg-accent/30"
                : "border-border hover:border-primary/40 hover:bg-muted/50"
            )}
          >
            <input
              type="checkbox"
              checked={showQuickMeet}
              onChange={e => update("showQuickMeet", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
            />
            <div className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Video className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Quick Meet Button
              </span>
              <span className="text-xs text-muted-foreground">
                Show instant video meeting launcher in the top bar.
              </span>
            </div>
          </label>

          {/* Audio Sound Toggle */}
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all has-focus-visible:ring-2 has-focus-visible:ring-ring",
              showSoundToggle
                ? "border-primary/60 bg-accent/30"
                : "border-border hover:border-primary/40 hover:bg-muted/50"
            )}
          >
            <input
              type="checkbox"
              checked={showSoundToggle}
              onChange={e => update("showSoundToggle", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
            />
            <div className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Volume2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Audio Feedback Toggle
              </span>
              <span className="text-xs text-muted-foreground">
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
            <span className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Position
            </span>
            <div className="grid max-w-md grid-cols-2 gap-3">
              {POSITION_OPTIONS.map(option => {
                const isSelected = sidebarPosition === option.value;
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-all text-left has-focus-visible:ring-2 has-focus-visible:ring-ring",
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
                    <div>
                      <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                        {isSelected && <Check className="h-3 w-3 text-primary" aria-hidden="true" />}
                        {option.label}
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
            <span className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Display Mode
            </span>
            <div className="grid max-w-md grid-cols-2 gap-3">
              {MODE_OPTIONS.map(option => {
                const isSelected = sidebarMode === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-all text-left has-focus-visible:ring-2 has-focus-visible:ring-ring",
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
                    <div>
                      <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                        {isSelected && <Check className="h-3 w-3 text-primary" aria-hidden="true" />}
                        {option.label}
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
            <span className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Alignment
            </span>
            <div className="grid max-w-md grid-cols-2 gap-3">
              {ALIGN_OPTIONS.map(option => {
                const isSelected = sidebarAlign === option.value;
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-all text-left has-focus-visible:ring-2 has-focus-visible:ring-ring",
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
                    <div>
                      <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                        {isSelected && <Check className="h-3 w-3 text-primary" aria-hidden="true" />}
                        {option.label}
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
