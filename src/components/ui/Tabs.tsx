"use client";
// URL-driven tabs (?tab=…) shared by module pages. Arrow keys move between tabs (WAI-ARIA tabs pattern).
import type { ComponentType, KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  count?: number;
}

export interface TabsProps {
  /** Unique per page: used for element ids */
  name: string;
  label: string;
  tabs: readonly TabItem[];
  active: string;
  onChange: (id: string) => void;
  children: ReactNode;
}

export function Tabs({ name, label, tabs, active, onChange, children }: TabsProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const index = tabs.findIndex(tab => tab.id === active);
    const next = tabs[(index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    if (!next) return;
    onChange(next.id);
    document.getElementById(`${name}-tab-${next.id}`)?.focus();
  }

  return (
    <>
      <div role="tablist" data-tour="tabs" aria-label={label} onKeyDown={handleKeyDown} className="no-print flex gap-1 overflow-x-auto overflow-y-hidden border-b no-scrollbar">
        {tabs.map(item => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${name}-tab-${item.id}`}
            aria-selected={active === item.id}
            aria-controls={`${name}-panel`}
            tabIndex={active === item.id ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cn(
              "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium select-none touch-manipulation cursor-pointer transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              active === item.id ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {item.icon && <item.icon className="h-4 w-4" aria-hidden="true" />}
            {item.label}
            {item.count !== undefined && item.count > 0 && <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{item.count}</span>}
          </button>
        ))}
      </div>
      <div id={`${name}-panel`} role="tabpanel" aria-labelledby={`${name}-tab-${active}`}>
        {children}
      </div>
    </>
  );
}
