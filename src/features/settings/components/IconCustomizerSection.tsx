"use client";
import { useState } from "react";
import {
  Check,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/components/shared/Toaster";
import { useUpdatePreferences } from "@/features/auth";
import {
  ICON_LIBRARIES,
  ICON_LIBRARY_MAP,
  NAV_ICONS,
  ICON_BY_ID,
  type IconLibraryKey,
  type NavIconKey,
} from "@/lib/icons";
import { IconPickerModal } from "@/components/shared/IconPickerModal";
import { useTheme, type AppearancePreferences } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";

const STROKE_OPTIONS = [
  { value: 1.5, label: "Delicate", desc: "1.5px fine line" },
  { value: 2, label: "Balanced", desc: "2.0px standard" },
  { value: 2.5, label: "Bold", desc: "2.5px punchy" },
] as const;

interface ModuleEntry {
  key: NavIconKey;
  label: string;
  category: string;
}

const MODULE_ENTRIES: readonly ModuleEntry[] = [
  { key: "home", label: "Home", category: "Core" },
  { key: "tasks", label: "Tasks", category: "Core" },
  { key: "meetings", label: "Meetings", category: "Workspace" },
  { key: "messaging", label: "Messages", category: "Workspace" },
  { key: "notes", label: "Notes", category: "Workspace" },
  { key: "announcements", label: "Announcements", category: "Workspace" },
  { key: "helpdesk", label: "Help desk", category: "Operations" },
  { key: "teams", label: "Teams", category: "Directory" },
  { key: "people", label: "People", category: "Directory" },
  { key: "sales", label: "Sales", category: "Operations" },
  { key: "billing", label: "Billing", category: "Finance" },
  { key: "inventory", label: "Inventory", category: "Operations" },
  { key: "logistics", label: "Logistics", category: "Operations" },
  { key: "clinic", label: "Clinic", category: "Healthcare" },
  { key: "attendance", label: "Attendance", category: "People ops" },
  { key: "expenses", label: "Expenses", category: "Finance" },
  { key: "admin", label: "Workspace admin", category: "System" },
  { key: "users", label: "Manage users", category: "System" },
  { key: "roles", label: "Roles & access", category: "System" },
  { key: "audit", label: "Audit log", category: "System" },
  { key: "settings", label: "Settings", category: "General" },
];

export function IconCustomizerSection() {
  const toast = useToast();
  const { preferences, setPreference } = useTheme();
  const save = useUpdatePreferences();

  const currentLibrary = preferences.iconLibrary || "lucide";
  const currentStroke = preferences.iconStrokeWidth || 2;
  const customIcons = preferences.customIcons || {};

  // Modal state
  const [modalTarget, setModalTarget] = useState<ModuleEntry | null>(null);

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
            "Couldn't save your icon preference",
            "It still applies on this device."
          ),
      }
    );
  }

  function handleSelectLibrary(libKey: IconLibraryKey) {
    update("iconLibrary", libKey);
    toast.success(`Active icon set updated to ${ICON_LIBRARY_MAP[libKey].name}`);
  }

  function handleStrokeChange(val: number) {
    update("iconStrokeWidth", val);
  }

  function handleModuleIconSelect(targetKey: string, iconId: string | null) {
    const nextCustomIcons = { ...customIcons };
    if (!iconId) {
      delete nextCustomIcons[targetKey];
    } else {
      nextCustomIcons[targetKey] = iconId;
    }
    update("customIcons", nextCustomIcons);
    toast.success(
      iconId
        ? `Custom icon applied to ${modalTarget?.label || targetKey}`
        : `Reset ${modalTarget?.label || targetKey} to default icon`
    );
  }

  function handleResetAllCustomIcons() {
    update("customIcons", {});
    toast.success("All module icons reset to library defaults");
  }

  const hasCustomIcons = Object.keys(customIcons).length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Icon Library Selector Cards */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Icon Library</legend>
        <p className="mb-3 text-xs text-muted-foreground">
          Choose which open-source icon family powers navigation, badges, and modules throughout Taskflow.
        </p>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {ICON_LIBRARIES.map((lib) => {
            const isSelected = currentLibrary === lib.key;
            const sampleIcons = NAV_ICONS[lib.key];

            return (
              <div
                key={lib.key}
                onClick={() => handleSelectLibrary(lib.key)}
                className={cn(
                  "group relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all duration-150 has-focus-visible:ring-2 has-focus-visible:ring-ring",
                  isSelected
                    ? "border-primary bg-accent/50 shadow-xs ring-1 ring-primary"
                    : "border-border/70 bg-card hover:border-primary/50 hover:bg-muted/40"
                )}
              >
                <div>
                  {/* Header: Title + License pill */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {lib.name}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground"
                      )}
                    >
                      {lib.licenseType}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {lib.description}
                  </p>
                </div>

                {/* Live Sample Icons Row */}
                <div className="mt-4 flex flex-col gap-2.5 border-t border-border/50 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">Sample glyphs:</span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                        <Check className="h-3 w-3" />
                        In use
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/80 px-2.5 py-1.5 shadow-2xs">
                    {/* Render 5 sample icons from this library */}
                    <sampleIcons.home className="h-4 w-4 text-foreground/90 shrink-0" strokeWidth={currentStroke} />
                    <sampleIcons.tasks className="h-4 w-4 text-primary shrink-0" strokeWidth={currentStroke} />
                    <sampleIcons.messaging className="h-4 w-4 text-foreground/90 shrink-0" strokeWidth={currentStroke} />
                    <sampleIcons.sales className="h-4 w-4 text-foreground/90 shrink-0" strokeWidth={currentStroke} />
                    <sampleIcons.clinic className="h-4 w-4 text-foreground/90 shrink-0" strokeWidth={currentStroke} />
                    <sampleIcons.settings className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={currentStroke} />
                  </div>

                  {/* External links: Browse and License */}
                  <div className="flex items-center gap-3 pt-1 text-[11px]">
                    <a
                      href={lib.browseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <span>Browse icons</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                    <span className="text-border">·</span>
                    <a
                      href={lib.licenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      License
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* 2. Stroke Thickness & Weight */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Icon Stroke & Line Weight</legend>
        <div className="grid max-w-md grid-cols-3 gap-3">
          {STROKE_OPTIONS.map((opt) => {
            const active = currentStroke === opt.value;
            const SampleIcon = NAV_ICONS[currentLibrary].tasks;
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
                  active
                    ? "border-primary bg-accent/60 text-accent-foreground"
                    : "hover:bg-muted"
                )}
              >
                <input
                  type="radio"
                  name="icon-stroke"
                  value={opt.value}
                  checked={active}
                  onChange={() => handleStrokeChange(opt.value)}
                  className="sr-only"
                />
                <SampleIcon className="h-5 w-5 text-primary" strokeWidth={opt.value} />
                <span className="text-sm font-semibold">{opt.label}</span>
                <span className="text-[11px] text-muted-foreground">{opt.desc}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* 3. Per-Module Custom Icons Manager */}
      <fieldset>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <legend className="text-sm font-medium">Custom Module Icons</legend>
            <p className="text-xs text-muted-foreground">
              Customize any specific module icon by picking from Lucide, Tabler, Material Symbols, Heroicons, Phosphor, or Remix Icon.
            </p>
          </div>
          {hasCustomIcons && (
            <button
              type="button"
              onClick={handleResetAllCustomIcons}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Reset all to defaults
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {MODULE_ENTRIES.map((entry) => {
            const isCustom = Boolean(customIcons[entry.key]);
            const customItem = isCustom ? ICON_BY_ID[customIcons[entry.key]] : null;
            const DefaultIcon = NAV_ICONS[currentLibrary][entry.key];
            const ActiveIcon = customItem ? customItem.component : DefaultIcon;

            return (
              <div
                key={entry.key}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl border p-2.5 transition-colors",
                  isCustom ? "border-primary/60 bg-accent/30" : "border-border/70 bg-card"
                )}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                      isCustom
                        ? "border-primary bg-primary/10 text-primary shadow-2xs"
                        : "border-border bg-muted/60 text-foreground"
                    )}
                  >
                    <ActiveIcon className="h-4 w-4" strokeWidth={currentStroke} />
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {entry.label}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {isCustom && customItem ? (
                        <span className="font-medium text-primary">Custom ({customItem.library})</span>
                      ) : (
                        <span>Default ({currentLibrary})</span>
                      )}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalTarget(entry)}
                  title={`Customize icon for ${entry.label}`}
                  className="rounded-lg border border-border/80 bg-background px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isCustom ? "Edit" : "Change"}
                </button>
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* Interactive Icon Picker Modal */}
      {modalTarget && (
        <IconPickerModal
          open={Boolean(modalTarget)}
          onClose={() => setModalTarget(null)}
          targetKey={modalTarget.key}
          targetLabel={modalTarget.label}
          currentIconId={customIcons[modalTarget.key]}
          onSelect={(iconId) => handleModuleIconSelect(modalTarget.key, iconId)}
        />
      )}
    </div>
  );
}
