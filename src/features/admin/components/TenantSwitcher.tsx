"use client";
// Searchable tenant picker (WAI-ARIA combobox with a listbox popup). The page keeps the choice in ?tenant=<id>.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Building2, Check, ChevronsUpDown, Globe, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TenantStatus } from "../services/adminService";

export interface TenantOption {
  id: number;
  name: string;
  slug: string;
  status: TenantStatus;
}

export interface TenantSwitcherProps {
  tenants: readonly TenantOption[];
  /** Selected tenant id; undefined = all tenants */
  value?: number;
  onChange: (tenantId: number | undefined) => void;
  loading?: boolean;
}

const matches = (tenant: TenantOption, term: string) => !term || tenant.name.toLowerCase().includes(term) || tenant.slug.includes(term) || String(tenant.id) === term;

export function TenantSwitcher({ tenants, value, onChange, loading = false }: TenantSwitcherProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const selected = tenants.find(tenant => tenant.id === value);
  const term = query.trim().toLowerCase();
  // "All tenants" first, then the matches.
  const options: (TenantOption | null)[] = [null, ...tenants.filter(tenant => matches(tenant, term))];

  // Close when clicking outside (document events are an external system).
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function openPopup() {
    setQuery("");
    setActive(Math.max(0, options.findIndex(option => option?.id === value)));
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function choose(option: TenantOption | null) {
    onChange(option?.id);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = (active + step + options.length) % options.length;
      setActive(next);
      document.getElementById(`${id}-option-${next}`)?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = options[active];
      if (option !== undefined) choose(option);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative w-full min-w-0 sm:w-80">
      <span id={`${id}-label`} className="sr-only">
        Tenant
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? setOpen(false) : openPopup())}
        className="flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-card px-3 text-left text-sm shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {selected ? <Building2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
        <span id={`${id}-value`} className="min-w-0 flex-1 truncate">
          {loading ? "Loading tenants…" : selected ? selected.name : "All tenants"}
        </span>
        {selected && <span className="hidden shrink-0 font-mono text-xs text-muted-foreground sm:inline">{selected.slug}</span>}
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
      {selected && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-label="Show all tenants"
          title="Show all tenants"
          className="absolute -right-9 top-1/2 hidden -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:block"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border bg-card shadow-xl">
          <div className="relative border-b">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded="true"
              aria-controls={`${id}-listbox`}
              aria-autocomplete="list"
              aria-activedescendant={options[active] !== undefined ? `${id}-option-${active}` : undefined}
              aria-label="Search tenants"
              placeholder="Search by name, address, or id"
              value={query}
              onChange={event => {
                setQuery(event.target.value);
                setActive(event.target.value.trim() ? 1 : 0);
              }}
              onKeyDown={handleKeyDown}
              className="h-10 w-full bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul id={`${id}-listbox`} role="listbox" aria-label="Tenants" className="max-h-72 overflow-y-auto p-1">
            {options.map((option, index) => {
              const isSelected = option ? option.id === value : value === undefined;
              return (
                <li
                  key={option?.id ?? "all"}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onPointerDown={event => event.preventDefault()}
                  onClick={() => choose(option)}
                  onMouseEnter={() => setActive(index)}
                  className={cn("flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm", index === active && "bg-muted")}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{option ? option.name : "All tenants"}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {option ? (
                        <>
                          <span className="font-mono">{option.slug}</span>
                          {option.status !== "active" && " · Suspended"}
                        </>
                      ) : (
                        "Totals across every tenant"
                      )}
                    </span>
                  </span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
          {options.length === 1 && term && <p className="px-3.5 pb-3 text-sm text-muted-foreground">No tenant matches &quot;{query.trim()}&quot;.</p>}
        </div>
      )}
    </div>
  );
}
