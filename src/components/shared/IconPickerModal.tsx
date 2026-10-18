"use client";
import { useId, useMemo, useState } from "react";
import {
  Check,
  ExternalLink,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import {
  ICON_CATALOG,
  ICON_LIBRARIES,
  ICON_LIBRARY_MAP,
  ICON_BY_ID,
  DynamicIcon,
  type IconLibraryKey,
  type NavIconKey,
} from "@/lib/icons";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";

export interface IconPickerModalProps {
  open: boolean;
  onClose: () => void;
  targetKey: NavIconKey | string;
  targetLabel: string;
  currentIconId?: string | null;
  onSelect: (iconId: string | null) => void;
}

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "navigation", label: "Navigation" },
  { value: "operations", label: "Operations" },
  { value: "communication", label: "Communication" },
  { value: "finance", label: "Finance & Billing" },
  { value: "medical", label: "Clinic & Health" },
  { value: "actions", label: "Actions & Badges" },
  { value: "general", label: "General UI" },
  { value: "objects", label: "Files & Objects" },
] as const;

export function IconPickerModal({
  open,
  onClose,
  targetKey,
  targetLabel,
  currentIconId,
  onSelect,
}: IconPickerModalProps) {
  const searchInputId = useId();
  const { preferences } = useTheme();
  const activeLibrary = preferences.iconLibrary || "lucide";

  const [search, setSearch] = useState("");
  const [selectedLibrary, setSelectedLibrary] = useState<IconLibraryKey | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(currentIconId ?? null);

  // Filter icons by library, category, and search text
  const filteredIcons = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ICON_CATALOG.filter((item) => {
      if (selectedLibrary !== "all" && item.library !== selectedLibrary) return false;
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.library.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [search, selectedLibrary, selectedCategory]);

  const activeSelected = selectedId ? ICON_BY_ID[selectedId] : null;

  function handleApply() {
    onSelect(selectedId);
    onClose();
  }

  function handleReset() {
    setSelectedId(null);
    onSelect(null);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Customize Icon: ${targetLabel}`}
      description="Select from 6 world-class open-source icon libraries (Lucide, Tabler, Google Material Symbols, Heroicons, Phosphor, Remix Icon) to personalize this module."
      size="xl"
      headContent={
        <div className="flex flex-col gap-2.5 py-2.5">
          {/* Search bar & Category filter */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id={searchInputId}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search icons by name, action, or tag..."
                className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Library Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedLibrary("all")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                selectedLibrary === "all"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              All Libraries ({ICON_CATALOG.length})
            </button>
            {ICON_LIBRARIES.map((lib) => {
              const active = selectedLibrary === lib.key;
              return (
                <button
                  key={lib.key}
                  type="button"
                  onClick={() => setSelectedLibrary(lib.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span>{lib.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-1 text-[10px] font-semibold",
                      active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-foreground/10 text-muted-foreground"
                    )}
                  >
                    {lib.licenseType}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      }
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset to library default
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleApply}>
              Save icon
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Main Content: Icon Grid + Live Preview */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
          {/* Icon Grid */}
          <div className="flex flex-col rounded-xl border border-border/80 bg-muted/20 p-2.5">
            {filteredIcons.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <Search className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">No matching icons found</p>
                <p className="text-xs">Try searching for other keywords like task, chat, chart, or user.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {filteredIcons.map((item) => {
                  const Icon = item.component;
                  const isSelected = selectedId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        "group relative flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected
                          ? "border-primary bg-accent/70 text-foreground shadow-xs ring-1 ring-primary"
                          : "border-border/60 bg-background/80 hover:border-primary/50 hover:bg-accent/30"
                      )}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-110">
                        <Icon className="h-5 w-5 text-foreground" strokeWidth={preferences.iconStrokeWidth ?? 2} />
                      </div>
                      <span className="line-clamp-1 w-full text-[11px] font-medium text-foreground/90">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground/80 capitalize">
                        {item.library}
                      </span>
                      {isSelected && (
                        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xs">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live Preview Panel */}
          <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/30 p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Live Preview
            </p>

            {/* Mock Navigation Item Preview */}
            <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-background p-2.5 shadow-2xs">
              <span className="text-[10px] font-medium text-muted-foreground">
                In Sidebar Navigation:
              </span>
              <div className="flex items-center gap-2.5 rounded-md bg-accent/60 px-3 py-2 text-accent-foreground font-semibold">
                <div className="flex h-5 w-5 items-center justify-center text-primary">
                  <DynamicIcon
                    iconId={selectedId || undefined}
                    navKey={selectedId ? undefined : targetKey}
                    className="h-5 w-5"
                    strokeWidth={preferences.iconStrokeWidth ?? 2}
                  />
                </div>
                <span className="truncate text-sm">{targetLabel}</span>
              </div>
            </div>

            {/* Selected Metadata */}
            {activeSelected ? (
              <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-card p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{activeSelected.name}</span>
                  <span className="rounded-xs bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary capitalize">
                    {activeSelected.library}
                  </span>
                </div>

                <div className="text-[11px] text-muted-foreground">
                  <p className="font-medium text-foreground/80">
                    {ICON_LIBRARY_MAP[activeSelected.library].name}
                  </p>
                  <p className="mt-0.5">{ICON_LIBRARY_MAP[activeSelected.library].license}</p>
                </div>

                <a
                  href={ICON_LIBRARY_MAP[activeSelected.library].browseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  <span>Browse {ICON_LIBRARY_MAP[activeSelected.library].name}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-border/80 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Using Library Default</p>
                <p className="text-[11px]">
                  Using {ICON_LIBRARY_MAP[activeLibrary].name}&apos;s default icon for {targetLabel}.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
