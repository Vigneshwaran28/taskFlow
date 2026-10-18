"use client";

import { useMemo, useState } from "react";
import { Check, Compass, Search, X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { LOGO_ICONS, LogoGlyph } from "@/components/shared/logoIcons";
import { ICON_CATALOG } from "@/lib/icons/registry";
import { ACCENT_META, type Accent } from "@/hooks/useTheme";
import type { IconCategoryKey, IconItem, IconLibraryKey } from "@/lib/icons/types";
import { cn } from "@/lib/cn";

export interface LogoIconPickerModalProps {
  open: boolean;
  onClose: () => void;
  currentIcon: string;
  onSelect: (iconKey: string) => void;
  accent?: Accent;
  title?: string;
}

const LIBRARY_TABS: readonly { key: string; label: string; badge?: string }[] = [
  { key: "all", label: "All Packs" },
  { key: "classic", label: "Classic Logos", badge: "20" },
  { key: "lucide", label: "Lucide", badge: "ISC" },
  { key: "tabler", label: "Tabler", badge: "MIT" },
  { key: "material", label: "Google Material", badge: "Apache" },
  { key: "heroicons", label: "Heroicons", badge: "MIT" },
  { key: "phosphor", label: "Phosphor", badge: "MIT" },
  { key: "remix", label: "Remix Icon", badge: "Apache" },
];

const CATEGORIES: readonly { key: string; label: string }[] = [
  { key: "all", label: "All Categories" },
  { key: "general", label: "Brand & Identity" },
  { key: "operations", label: "Operations" },
  { key: "finance", label: "Finance & Sales" },
  { key: "communication", label: "Communication" },
  { key: "medical", label: "Medical & Health" },
  { key: "actions", label: "Actions & Badges" },
  { key: "navigation", label: "Navigation" },
  { key: "objects", label: "Objects & Tools" },
];

// Convert classic LOGO_ICONS to unified IconItem list for seamless search & display
const CLASSIC_ITEMS: IconItem[] = Object.entries(LOGO_ICONS).map(([key, item]) => ({
  id: key,
  name: item.label,
  library: "lucide" as IconLibraryKey,
  category: "general" as IconCategoryKey,
  tags: [key, item.label.toLowerCase(), "brand", "logo"],
  component: item.icon as unknown as IconItem["component"],
}));

export function LogoIconPickerModal({
  open,
  onClose,
  currentIcon,
  onSelect,
  accent = "indigo",
  title = "Workspace Logo",
}: LogoIconPickerModalProps) {
  const [search, setSearch] = useState("");
  const [selectedLibrary, setSelectedLibrary] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [userSelectedIcon, setUserSelectedIcon] = useState<string | null>(null);
  const [prevCurrentIcon, setPrevCurrentIcon] = useState(currentIcon);

  if (prevCurrentIcon !== currentIcon) {
    setPrevCurrentIcon(currentIcon);
    setUserSelectedIcon(null);
  }

  const selectedIconKey = userSelectedIcon ?? (currentIcon || "check");

  // Combine classic items with rich multi-pack catalog
  const allIcons = useMemo(() => {
    const combined: (IconItem & { isClassic?: boolean })[] = [
      ...CLASSIC_ITEMS.map(item => ({ ...item, isClassic: true })),
      ...ICON_CATALOG,
    ];
    return combined;
  }, []);

  // Filter based on search, library, and category
  const filteredIcons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allIcons.filter(item => {
      // Library filter
      if (selectedLibrary === "classic") {
        if (!item.isClassic) return false;
      } else if (selectedLibrary !== "all") {
        if (item.isClassic || item.library !== selectedLibrary) return false;
      }

      // Category filter
      if (selectedCategory !== "all") {
        if (item.category !== selectedCategory) return false;
      }

      // Search query filter
      if (query) {
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesId = item.id.toLowerCase().includes(query);
        const matchesTags = item.tags.some(t => t.toLowerCase().includes(query));
        if (!matchesName && !matchesId && !matchesTags) return false;
      }

      return true;
    });
  }, [allIcons, search, selectedLibrary, selectedCategory]);

  const handleApply = () => {
    onSelect(selectedIconKey);
    onClose();
  };

  // Find preview item metadata
  const selectedItem = useMemo(() => {
    return allIcons.find(i => i.id === selectedIconKey);
  }, [allIcons, selectedIconKey]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Choose Logo Icon"
      description={`Pick an icon for ${title || "workspace logo"} across 6 open-source icon libraries and classic branding sets.`}
      size="xl"
      headContent={
        <div className="flex flex-col gap-2.5 py-2.5">
          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search icons (e.g. shield, rocket, clinic, check, chart, coffee)..."
              className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-9 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Library / Pack Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {LIBRARY_TABS.map(tab => {
              const isSelected = selectedLibrary === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedLibrary(tab.key)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={cn(
                        "rounded px-1 text-[10px] uppercase",
                        isSelected ? "bg-white/20 text-white" : "bg-background/80 text-muted-foreground"
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                    isSelected
                      ? "border-primary bg-accent text-accent-foreground font-semibold"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      }
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Live Preview Box */}
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm transition-all",
                ACCENT_META[accent]?.swatch || "bg-primary"
              )}
              aria-hidden="true"
            >
              <LogoGlyph name={selectedIconKey} className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <span className="block truncate text-xs font-semibold text-foreground">
                {selectedItem?.name || selectedIconKey}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                Key: <code className="rounded bg-muted px-1 py-0.5">{selectedIconKey}</code>
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleApply} className="gap-1.5">
              <Check className="h-4 w-4" aria-hidden="true" />
              Apply Icon
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        {/* Header count info */}
        <div className="flex items-center justify-between pb-1 text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{filteredIcons.length}</strong> icons
          </span>
          <span className="text-[11px]">Click any icon to preview & select</span>
        </div>

        {/* Icons Grid - uses dialog's responsive scroll without inner double scrollbar */}
        <div
          role="radiogroup"
          aria-label="Choose logo icon"
          className="grid grid-cols-6 gap-2 p-1 sm:grid-cols-8 md:grid-cols-10"
        >
          {filteredIcons.map(item => {
            const isSelected = selectedIconKey === item.id;
            const IconComp = item.component;

            return (
              <button
                key={item.id}
                type="button"
                title={`${item.name} (${item.isClassic ? "Classic" : item.library})`}
                onClick={() => setUserSelectedIcon(item.id)}
                aria-pressed={isSelected}
                className={cn(
                  "group relative flex h-12 w-full flex-col items-center justify-center rounded-xl border p-1 text-center transition-all",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xs"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground"
                )}
              >
                <IconComp className="h-5 w-5 transition-transform group-hover:scale-110" />
                <span className="mt-0.5 block w-full truncate text-[9px] font-medium opacity-80">
                  {item.name.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>

          {filteredIcons.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Compass className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm font-medium">No matching icons found</p>
              <p className="text-xs">Try searching for generic terms like &quot;star&quot;, &quot;chart&quot;, or &quot;shield&quot;.</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedLibrary("all");
                  setSelectedCategory("all");
                }}
                className="mt-3 text-xs text-primary"
              >
                Reset filters
              </Button>
            </div>
          )}
        </div>
    </Dialog>
  );
}
