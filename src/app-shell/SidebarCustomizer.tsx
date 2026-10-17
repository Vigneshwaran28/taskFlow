"use client";
import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRight,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/components/shared/Toaster";
import { useCurrentUser, useUpdatePreferences } from "@/features/auth";
import {
  useTheme,
  type AppearancePreferences,
  type SidebarMode,
} from "@/hooks/useTheme";
import { cn } from "@/lib/cn";

interface SidebarCustomizerProps {
  compactTrigger?: boolean;
}

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
    toast.success("Sidebar reset to standard layout");
  }

  return (
    <div className="flex flex-col gap-4 text-xs">
      {user && (
        <div className="flex items-center justify-between rounded-lg bg-accent/40 px-2.5 py-1.5 text-[11px] font-medium text-foreground">
          <span className="flex items-center gap-1.5 truncate">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">Saved for <strong className="font-semibold">{user.name}</strong></span>
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">User-wise</span>
        </div>
      )}

      {/* Position */}
      <div>
        <label className="mb-1.5 flex items-center justify-between font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
          <span>Position</span>
          <span className="font-normal capitalize text-foreground">{position} side</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => update("sidebarPosition", "left")}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              position === "left"
                ? "border-primary bg-accent/70 font-semibold text-accent-foreground shadow-xs"
                : "border-border/60 hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="flex h-7 w-12 items-center rounded border border-border/70 bg-background p-0.5 shadow-2xs">
              <span className="h-full w-3.5 rounded-xs bg-primary/80" />
              <span className="ml-1 h-2 flex-1 rounded-xs bg-muted-foreground/30" />
            </div>
            <span className="flex items-center gap-1">
              {position === "left" && <Check className="h-3 w-3 text-primary" />}
              Left
            </span>
          </button>

          <button
            type="button"
            onClick={() => update("sidebarPosition", "right")}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              position === "right"
                ? "border-primary bg-accent/70 font-semibold text-accent-foreground shadow-xs"
                : "border-border/60 hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="flex h-7 w-12 items-center justify-end rounded border border-border/70 bg-background p-0.5 shadow-2xs">
              <span className="mr-1 h-2 flex-1 rounded-xs bg-muted-foreground/30" />
              <span className="h-full w-3.5 rounded-xs bg-primary/80" />
            </div>
            <span className="flex items-center gap-1">
              {position === "right" && <Check className="h-3 w-3 text-primary" />}
              Right
            </span>
          </button>
        </div>
      </div>

      {/* Display Mode */}
      <div>
        <label className="mb-1.5 flex items-center justify-between font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
          <span>Display Mode</span>
          <span className="font-normal text-foreground">
            {mode === "full" ? "Icon & Label" : "Icon Alone"}
          </span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => update("sidebarMode", "full")}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              mode === "full"
                ? "border-primary bg-accent/70 font-semibold text-accent-foreground shadow-xs"
                : "border-border/60 hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="flex h-7 w-12 items-center gap-1 rounded border border-border/70 bg-background px-1 shadow-2xs">
              <span className="h-3 w-3 shrink-0 rounded-xs bg-primary/80" />
              <span className="h-1.5 flex-1 rounded-xs bg-muted-foreground/40" />
            </div>
            <span className="flex items-center gap-1">
              {mode === "full" && <Check className="h-3 w-3 text-primary" />}
              Icon & Label
            </span>
          </button>

          <button
            type="button"
            onClick={() => update("sidebarMode", "compact")}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              mode === "compact"
                ? "border-primary bg-accent/70 font-semibold text-accent-foreground shadow-xs"
                : "border-border/60 hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="flex h-7 w-12 items-center justify-center gap-1 rounded border border-border/70 bg-background px-1 shadow-2xs">
              <span className="h-3.5 w-3.5 rounded-xs bg-primary/80" />
            </div>
            <span className="flex items-center gap-1">
              {mode === "compact" && <Check className="h-3 w-3 text-primary" />}
              Icon Alone
            </span>
          </button>
        </div>
      </div>

      {/* Alignment */}
      <div>
        <label className="mb-1.5 flex items-center justify-between font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
          <span>Alignment</span>
          <span className="font-normal capitalize text-foreground">{align}</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => update("sidebarAlign", "left")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border p-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              align === "left"
                ? "border-primary bg-accent/70 font-semibold text-accent-foreground shadow-xs"
                : "border-border/60 hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            )}
          >
            <AlignLeft className="h-3.5 w-3.5 shrink-0" />
            <span>Left</span>
            {align === "left" && <Check className="ml-auto h-3 w-3 text-primary" />}
          </button>

          <button
            type="button"
            onClick={() => update("sidebarAlign", "center")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border p-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              align === "center"
                ? "border-primary bg-accent/70 font-semibold text-accent-foreground shadow-xs"
                : "border-border/60 hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            )}
          >
            <AlignCenter className="h-3.5 w-3.5 shrink-0" />
            <span>Center</span>
            {align === "center" && <Check className="ml-auto h-3 w-3 text-primary" />}
          </button>
        </div>
      </div>

      {/* Reset */}
      <div className="pt-1">
        <button
          type="button"
          onClick={resetToDefaults}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/80 px-2.5 py-1.5 text-[11px] text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RotateCcw className="h-3 w-3" />
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

/**
 * 1-click Quick Toggle between Full (icon + label) and Compact (icon alone) modes.
 */
export function SidebarQuickToggle() {
  const toast = useToast();
  const { preferences, setPreference } = useTheme();
  const save = useUpdatePreferences();

  const position = preferences.sidebarPosition ?? "left";
  const mode = preferences.sidebarMode ?? "full";
  const isCompact = mode === "compact";

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

  // Icons adjust visually based on sidebar placement (left vs right)
  const Icon = isCompact
    ? position === "right"
      ? PanelRight
      : PanelLeftOpen
    : position === "right"
    ? PanelRight
    : PanelLeftClose;

  return (
    <button
      type="button"
      onClick={toggle}
      title={isCompact ? "Expand sidebar (Icon + Label)" : "Collapse sidebar (Icon alone)"}
      aria-label={isCompact ? "Expand sidebar" : "Collapse sidebar"}
      className={cn(
        "flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isCompact ? "w-full" : ""
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {!isCompact && <span className="ml-2 text-xs font-medium">Collapse</span>}
    </button>
  );
}

/**
 * Interactive Popover Customizer Menu mounted right on the sidebar.
 */
export function SidebarCustomizer({ compactTrigger = false }: SidebarCustomizerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { preferences } = useTheme();
  const position = preferences.sidebarPosition ?? "left";
  const isCompact = (preferences.sidebarMode ?? "full") === "compact";

  useEffect(() => {
    if (!open) return undefined;
    function onPointer(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(c => !c)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Customize sidebar (Position, Display, Alignment)"
        aria-label="Customize sidebar"
        className={cn(
          "flex items-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isCompact || compactTrigger ? "w-full justify-center" : "w-full gap-2.5 px-3 py-2 text-sm font-medium"
        )}
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
        {(!isCompact && !compactTrigger) && <span>Customize menu</span>}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Customize sidebar navigation"
          className={cn(
            "absolute bottom-full z-50 mb-2 w-72 rounded-xl border bg-card p-3.5 shadow-xl animate-in fade-in zoom-in-95",
            position === "right"
              ? isCompact
                ? "right-full mr-2 bottom-0 mb-0"
                : "right-0"
              : isCompact
              ? "left-full ml-2 bottom-0 mb-0"
              : "left-0"
          )}
        >
          <div className="mb-3 flex items-center justify-between border-b pb-2">
            <div>
              <p className="text-xs font-bold text-foreground">Menu Customization</p>
              <p className="text-[11px] text-muted-foreground">Personal layout settings</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Done
            </button>
          </div>

          <SidebarCustomizerControls onChanged={() => {}} />
        </div>
      )}
    </div>
  );
}
