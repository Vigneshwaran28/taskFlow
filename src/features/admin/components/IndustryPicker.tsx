"use client";
// Industry cards (a radio group: arrow keys move between them) and the small industry badge used on tenant cards.
import type { ComponentType } from "react";
import { Briefcase, Puzzle, ShoppingBag, Stethoscope, Truck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { IndustryKey, IndustryMeta } from "../services/adminService";

export const INDUSTRY_ICONS: Readonly<Record<IndustryKey, ComponentType<{ className?: string }>>> = Object.freeze({
  hospital: Stethoscope,
  logistics: Truck,
  retail: ShoppingBag,
  services: Briefcase,
  custom: Puzzle,
});

export interface IndustryPickerProps {
  industries: readonly IndustryMeta[];
  value: IndustryKey;
  onChange: (industry: IndustryKey) => void;
  error?: string;
}

export function IndustryPicker({ industries, value, onChange, error }: IndustryPickerProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div role="radiogroup" aria-label="Industry" aria-describedby={error ? "tenant-industry-error" : undefined} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {industries.map(industry => {
          const Icon = INDUSTRY_ICONS[industry.key] ?? Puzzle;
          const selected = industry.key === value;
          return (
            <label
              key={industry.key}
              className={cn(
                "flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
                selected ? "border-primary bg-accent/40" : "hover:bg-muted/60"
              )}
            >
              <input type="radio" name="tenant-industry" value={industry.key} checked={selected} onChange={() => onChange(industry.key)} className="sr-only" />
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{industry.label}</span>
                <span className="block text-xs text-muted-foreground">{industry.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id="tenant-industry-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** The tenant's industry as a small badge (nothing for Custom, the default). */
export function IndustryBadge({ industry }: { industry: IndustryMeta | null }) {
  if (!industry || industry.key === "custom") return null;
  const Icon = INDUSTRY_ICONS[industry.key] ?? Puzzle;
  return (
    <Badge tone="info">
      <Icon className="h-3 w-3" aria-hidden="true" />
      {industry.label}
    </Badge>
  );
}
