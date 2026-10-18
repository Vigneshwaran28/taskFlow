"use client";
import { useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/shared/Toaster";
import { useCurrentUser, useUpdatePreferences } from "@/features/auth";
import {
  useTheme,
  type AppearancePreferences,
  type SidebarMode,
  type SidebarPosition,
} from "@/hooks/useTheme";
import {
  ICON_LIBRARIES,
  ICON_LIBRARY_MAP,
  NAV_ICONS,
} from "@/lib/icons";
import { cn } from "@/lib/cn";

export function SidebarCustomizerControls({
  onChanged,
}: {
  onChanged?: () => void;
}) {
  const toast = useToast();
  const { preferences, setPreference } = useTheme();
  const save = useUpdatePreferences();
  const { data: user } = useCurrentUser();

  const position = preferences.sidebarPosition ?? "left";
  const mode = preferences.sidebarMode ?? "full";
  const align = preferences.sidebarAlign ?? "left";
  const iconLib = preferences.iconLibrary || "lucide";
  const iconStroke = preferences.iconStrokeWidth ?? 2;
  const PreviewIcons = NAV_ICONS[iconLib] || NAV_ICONS.lucide;

  function update<K extends keyof AppearancePreferences>(
    key: K,
    value: AppearancePreferences[K]
  ) {
    setPreference(key, value);
    save.mutate(
      { [key]: value } as Partial<AppearancePreferences>,
      {
        onError: () =>
          toast.error(
            "Couldn't save your preference",
            "It still applies on this device."
          ),
      }
    );
    onChanged?.();
  }

  function resetToDefaults() {
    update("sidebarPosition", "left");
    update("sidebarMode", "full");
    update("sidebarAlign", "left");
    update("iconLibrary", "lucide");
    update("iconStrokeWidth", 2);
    toast.success("Sidebar and icons reset to standard defaults");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Live Preview Canvas */}
      <div className="rounded-xl border bg-muted/30 p-3 sm:p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Live Layout Preview
        </p>
        <div className="relative flex h-36 w-full overflow-hidden rounded-lg border border-border/80 bg-background shadow-inner">
          {/* Topbar in preview */}
          <div className="absolute inset-x-0 top-0 flex h-6 items-center justify-between border-b bg-card/80 px-2">
            <span className="h-2 w-16 rounded-xs bg-muted-foreground/30" />
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            </div>
          </div>

          {/* Dynamic Sidebar in preview */}
          <div
            className={cn(
              "absolute inset-y-6 flex flex-col border-border/70 bg-card p-1.5 transition-all duration-300",
              position === "right" ? "right-0 border-l" : "left-0 border-r",
              mode === "compact" ? "w-12 items-center" : "w-32",
              align === "center" && "items-center"
            )}
          >
            {/* Logo in preview */}
            <div
              className={cn(
                "mb-2 flex items-center gap-1",
                align === "center" || mode === "compact" ? "justify-center" : ""
              )}
            >
              <span className="h-3 w-3 shrink-0 rounded-xs bg-primary" />
              {mode === "full" && <span className="h-2 w-12 rounded-xs bg-foreground/70" />}
            </div>

            {/* Menu items in preview */}
            <div className="flex w-full flex-col gap-1">
              <div
                className={cn(
                  "flex items-center rounded-xs bg-accent/80 p-0.5",
                  mode === "compact" ? "h-4 w-4 justify-center" : "w-full gap-1",
                  align === "center" && mode === "full" ? "justify-center" : ""
                )}
              >
                <PreviewIcons.home className="h-2.5 w-2.5 shrink-0 text-primary" strokeWidth={iconStroke} />
                {mode === "full" && <span className="h-1.5 w-10 rounded-xs bg-foreground/60" />}
              </div>
              <div
                className={cn(
                  "flex items-center rounded-xs p-0.5",
                  mode === "compact" ? "h-4 w-4 justify-center" : "w-full gap-1",
                  align === "center" && mode === "full" ? "justify-center" : ""
                )}
              >
                <PreviewIcons.tasks className="h-2.5 w-2.5 shrink-0 text-muted-foreground/60" strokeWidth={iconStroke} />
                {mode === "full" && <span className="h-1.5 w-8 rounded-xs bg-muted-foreground/40" />}
              </div>
              <div
                className={cn(
                  "flex items-center rounded-xs p-0.5",
                  mode === "compact" ? "h-4 w-4 justify-center" : "w-full gap-1",
                  align === "center" && mode === "full" ? "justify-center" : ""
                )}
              >
                <PreviewIcons.messaging className="h-2.5 w-2.5 shrink-0 text-muted-foreground/60" strokeWidth={iconStroke} />
                {mode === "full" && <span className="h-1.5 w-12 rounded-xs bg-muted-foreground/40" />}
              </div>
            </div>
          </div>

          {/* Main content in preview */}
          <div
            className={cn(
              "flex flex-1 flex-col gap-2 p-3 transition-all duration-300 pt-8",
              position === "right"
                ? mode === "compact"
                  ? "mr-12"
                  : "mr-32"
                : mode === "compact"
                ? "ml-12"
                : "ml-32"
            )}
          >
            <div className="h-3 w-28 rounded-xs bg-muted-foreground/30" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-12 rounded-md border border-dashed border-border/70 bg-card/40 p-1.5">
                <span className="block h-2 w-12 rounded-xs bg-muted-foreground/30 mb-1" />
                <span className="block h-1.5 w-16 rounded-xs bg-muted-foreground/20" />
              </div>
              <div className="h-12 rounded-md border border-dashed border-border/70 bg-card/40 p-1.5">
                <span className="block h-2 w-10 rounded-xs bg-muted-foreground/30 mb-1" />
                <span className="block h-1.5 w-14 rounded-xs bg-muted-foreground/20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Position Selection */}
      <div>
        <label className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Sidebar Position</span>
          <span className="font-normal capitalize text-foreground">{position} Side</span>
        </label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => update("sidebarPosition", "left")}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              position === "left"
                ? "border-primary bg-accent/60 shadow-xs"
                : "border-border/70 hover:bg-muted/60"
            )}
          >
            <div className="flex h-10 w-14 shrink-0 items-center rounded-md border bg-background p-1 shadow-2xs">
              <span className="h-full w-4 rounded-xs bg-primary" />
              <span className="ml-1 h-3 flex-1 rounded-xs bg-muted-foreground/25" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Left Side</span>
                {position === "left" && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Classic standard sidebar placed on the left side of the screen.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => update("sidebarPosition", "right")}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              position === "right"
                ? "border-primary bg-accent/60 shadow-xs"
                : "border-border/70 hover:bg-muted/60"
            )}
          >
            <div className="flex h-10 w-14 shrink-0 items-center justify-end rounded-md border bg-background p-1 shadow-2xs">
              <span className="mr-1 h-3 flex-1 rounded-xs bg-muted-foreground/25" />
              <span className="h-full w-4 rounded-xs bg-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Right Side</span>
                {position === "right" && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Primary sidebar placed on the right side of the screen.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Display Mode Selection */}
      <div>
        <label className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Display Mode</span>
          <span className="font-normal text-foreground">
            {mode === "full" ? "Icon & Label (Expanded)" : "Icon Alone (Compact Rail)"}
          </span>
        </label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => update("sidebarMode", "full")}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              mode === "full"
                ? "border-primary bg-accent/60 shadow-xs"
                : "border-border/70 hover:bg-muted/60"
            )}
          >
            <div className="flex h-10 w-14 shrink-0 items-center gap-1 rounded-md border bg-background px-1.5 shadow-2xs">
              <span className="h-4 w-4 shrink-0 rounded-xs bg-primary" />
              <span className="h-2 flex-1 rounded-xs bg-muted-foreground/40" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Icon & Label</span>
                {mode === "full" && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Expanded 256px sidebar showing all titles, categories, and badges.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => update("sidebarMode", "compact")}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              mode === "compact"
                ? "border-primary bg-accent/60 shadow-xs"
                : "border-border/70 hover:bg-muted/60"
            )}
          >
            <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md border bg-background shadow-2xs">
              <span className="h-4 w-4 rounded-xs bg-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Icon Alone</span>
                {mode === "compact" && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Space-saving 64px rail with centered icons and floating tooltips.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Alignment Selection */}
      <div>
        <label className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Item Alignment</span>
          <span className="font-normal capitalize text-foreground">{align}</span>
        </label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => update("sidebarAlign", "left")}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              align === "left"
                ? "border-primary bg-accent/60 shadow-xs"
                : "border-border/70 hover:bg-muted/60"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background">
              <AlignLeft className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Left Aligned</span>
                {align === "left" && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground">Standard left-anchored icons and text.</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => update("sidebarAlign", "center")}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              align === "center"
                ? "border-primary bg-accent/60 shadow-xs"
                : "border-border/70 hover:bg-muted/60"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background">
              <AlignCenter className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Center Balanced</span>
                {align === "center" && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground">Centered icons with balanced layout.</p>
            </div>
          </button>
        </div>
      </div>

      {/* Icon Library Selection */}
      <div>
        <label className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Icon Library & Style</span>
          <span className="font-normal text-foreground">
            {ICON_LIBRARY_MAP[iconLib].name} ({ICON_LIBRARY_MAP[iconLib].licenseType})
          </span>
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ICON_LIBRARIES.map((lib) => {
            const isSelected = iconLib === lib.key;
            const LibHomeIcon = NAV_ICONS[lib.key].home;
            return (
              <button
                key={lib.key}
                type="button"
                onClick={() => update("iconLibrary", lib.key)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "border-primary bg-accent/60 shadow-xs ring-1 ring-primary"
                    : "border-border/70 hover:bg-muted/60"
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                  <LibHomeIcon className="h-4 w-4 text-primary" strokeWidth={iconStroke} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-xs font-semibold text-foreground">
                      {lib.name.replace(" Icons", "").replace(" Symbols", "")}
                    </span>
                    {isSelected && <Check className="h-3 w-3 shrink-0 text-primary" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{lib.licenseType}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* User Information & Reset */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/60">
        {user ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>
              Saved for <strong className="font-medium text-foreground">{user.name}</strong> · User-wise
            </span>
          </div>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={resetToDefaults}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

/**
 * Modal dialog for customizing sidebar navigation.
 * Renders in a top-layer portal to ensure zero clipping, zero layout overlap, and maximum accessibility.
 */
export function SidebarCustomizerDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Navigation & Sidebar Customization"
      description="Personalize your sidebar position, layout mode, and alignment. These settings are saved to your account and follow you across devices."
      size="lg"
      footer={
        <Button onClick={onClose} variant="primary">
          Done
        </Button>
      }
    >
      <SidebarCustomizerControls onChanged={() => {}} />
    </Dialog>
  );
}

/**
 * 1-click Quick Toggle between Full (icon + label) and Compact (icon alone) modes.
 */
export function SidebarQuickToggle({ isCompact, position }: { isCompact: boolean; position: SidebarPosition }) {
  const toast = useToast();
  const { setPreference } = useTheme();
  const save = useUpdatePreferences();

  function toggle() {
    const nextMode: SidebarMode = isCompact ? "full" : "compact";
    setPreference("sidebarMode", nextMode);
    save.mutate(
      { sidebarMode: nextMode },
      {
        onError: () =>
          toast.error(
            "Couldn't save your preference",
            "It still applies on this device."
          ),
      }
    );
  }

  // Icons adjust dynamically based on sidebar position (left vs right) and mode
  const Icon = isCompact
    ? position === "right"
      ? PanelRightClose
      : PanelLeftOpen
    : position === "right"
    ? PanelRightOpen
    : PanelLeftClose;

  return (
    <button
      type="button"
      onClick={toggle}
      title={isCompact ? "Expand sidebar (Icon + Label)" : "Collapse sidebar (Icon alone)"}
      aria-label={isCompact ? "Expand sidebar" : "Collapse sidebar"}
      className={cn(
        "flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isCompact ? "h-9 w-9 mx-auto" : "gap-2 px-3 py-2 text-xs font-medium w-full"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {!isCompact && <span>Collapse sidebar</span>}
    </button>
  );
}

/**
 * Button trigger that opens the non-overlapping SidebarCustomizerDialog.
 */
export function SidebarCustomizerButton({
  isCompact = false,
  className,
}: {
  isCompact?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        title="Customize sidebar navigation (Position, Display, Alignment)"
        aria-label="Customize sidebar navigation"
        className={cn(
          "flex items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isCompact
            ? "h-9 w-9 justify-center mx-auto"
            : "gap-2.5 px-3 py-2 text-xs font-medium w-full",
          className
        )}
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
        {!isCompact && <span>Customize navigation</span>}
      </button>

      <SidebarCustomizerDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
