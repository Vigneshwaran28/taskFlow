"use client";
// The tenant dialog's Modules tab: the industry first (which modules it offers), then the modules, with their hard
// dependencies ticked automatically, unticking blocked while another module needs one, and "works well with" hints.
// All rules come from the server's catalog (utils/moduleRules.ts).
import type { ReactNode } from "react";
import { AlertTriangle, Info, Link2, Lock } from "lucide-react";
import { MODULES, type ModuleMeta } from "@/app-shell/modules";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { FeatureKey } from "@/types/session";
import type { IndustryKey, ModuleCatalog } from "../services/adminService";
import { industryMeta, neededBy, outsideIndustry, requiresOf, worksWellWith } from "../utils/moduleRules";
import { IndustryPicker } from "./IndustryPicker";

const labelOf = (key: FeatureKey) => (MODULES[key] as ModuleMeta | undefined)?.label ?? key;
const listOf = (keys: readonly FeatureKey[]) => keys.map(labelOf).join(", ");

export interface TenantModulesFieldProps {
  catalog: ModuleCatalog | null;
  /** Every licensable module, in display order */
  moduleKeys: readonly FeatureKey[];
  industry: IndustryKey;
  onIndustryChange: (industry: IndustryKey) => void;
  features: ReadonlySet<FeatureKey>;
  onToggle: (key: FeatureKey) => void;
  /** Unticks every module the industry doesn't offer (after switching industry on an existing tenant) */
  onRemoveOutside: (keys: FeatureKey[]) => void;
  /** What changed automatically last ("Help desk needs Teams & people: turned on too.") */
  notice: string | null;
  /** New tenants get the industry's recommended modules; existing ones keep theirs */
  isNew: boolean;
  featuresError?: string;
  industryError?: string;
  /** Extra controls under a ticked module (its settings) */
  renderExtra?: (key: FeatureKey) => ReactNode;
}

export function TenantModulesField({
  catalog,
  moduleKeys,
  industry,
  onIndustryChange,
  features,
  onToggle,
  onRemoveOutside,
  notice,
  isNew,
  featuresError,
  industryError,
  renderExtra,
}: TenantModulesFieldProps) {
  const meta = industryMeta(catalog, industry);
  const allowed = meta?.allowed ?? moduleKeys;
  const outside = outsideIndustry(meta, features);
  const shown = [...moduleKeys].sort((a, b) => Number(!allowed.includes(a)) - Number(!allowed.includes(b)));

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {catalog && (
        <section aria-labelledby="tenant-industry-heading" className="flex min-w-0 flex-col gap-2">
          <div>
            <h3 id="tenant-industry-heading" className="text-sm font-medium">
              1. Industry
            </h3>
            <p className="text-xs text-muted-foreground">
              {isNew ? "Choose the kind of business first: it decides which modules fit and picks a starting set." : "Decides which modules this tenant can be licensed for."}
            </p>
          </div>
          <IndustryPicker industries={catalog.industries} value={industry} onChange={onIndustryChange} error={industryError} />
          {outside.length > 0 && (
            <div role="alert" className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {meta?.label} doesn&apos;t include {listOf(outside)}. Remove {outside.length === 1 ? "it" : "them"} to switch: people lose access to{" "}
                  {outside.length === 1 ? "that module" : "those modules"} (the data stays and comes back if you license {outside.length === 1 ? "it" : "them"} again).
                </span>
              </p>
              <Button variant="secondary" size="sm" className="shrink-0" onClick={() => onRemoveOutside(outside)}>
                Remove {outside.length === 1 ? labelOf(outside[0]) : `${outside.length} modules`}
              </Button>
            </div>
          )}
        </section>
      )}

      <fieldset className="min-w-0" aria-describedby={featuresError ? "tenant-features-error" : undefined}>
        <legend className="mb-2 text-sm font-medium">
          {catalog ? "2. Modules" : "Modules"} <span className="font-normal text-muted-foreground">({features.size} enabled)</span>
        </legend>
        {featuresError && (
          <p id="tenant-features-error" className="mb-2 text-sm text-destructive">
            {featuresError}
          </p>
        )}
        <p aria-live="polite" className={cn("mb-2 flex items-start gap-2 rounded-lg bg-accent/50 px-3 py-2 text-xs text-accent-foreground", !notice && "sr-only")}>
          {notice && <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
          {notice}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {shown.map(key => {
            const info = MODULES[key] as ModuleMeta | undefined;
            const Icon = info?.icon;
            const checked = features.has(key);
            const inIndustry = allowed.includes(key);
            const blockers = checked ? neededBy(catalog, key, features) : [];
            const requires = requiresOf(catalog, key);
            const related = inIndustry ? worksWellWith(catalog, key, allowed) : [];
            // Out-of-industry modules can only be unticked; required ones can't be unticked while needed.
            const disabled = (!inIndustry && !checked) || blockers.length > 0;
            const reasonId = `tenant-module-${key}-reason`;
            const reason = !inIndustry ? `Not part of ${meta?.label ?? "this industry"}` : blockers.length ? `Needed by ${listOf(blockers)}` : null;
            return (
              <div
                key={key}
                className={cn(
                  "flex min-w-0 flex-col gap-2 rounded-lg border p-3 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
                  checked ? "border-primary bg-accent/40" : inIndustry ? "hover:bg-muted/60" : "border-dashed bg-muted/30",
                  !inIndustry && checked && "border-amber-400"
                )}
              >
                <label className={cn("flex items-start gap-3", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    aria-describedby={reason ? reasonId : undefined}
                    onChange={() => onToggle(key)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary disabled:cursor-not-allowed"
                  />
                  <span className={cn("min-w-0", !inIndustry && !checked && "opacity-60")}>
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      {Icon && <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                      {info?.label ?? key}
                    </span>
                    {info?.description && <span className="block text-xs text-muted-foreground">{info.description}</span>}
                    {requires.length > 0 && inIndustry && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Needs {listOf(requires)}
                        {catalog?.modules[key]?.note ? `: ${catalog.modules[key]?.note}` : "."}
                      </span>
                    )}
                  </span>
                </label>
                {reason && (
                  <p id={reasonId} className={cn("ml-7 flex items-center gap-1 text-xs", !inIndustry && checked ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
                    <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {reason}
                  </p>
                )}
                {related.length > 0 && (
                  <p className="ml-7 flex items-start gap-1 text-xs text-muted-foreground">
                    <Link2 className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                    <span>Works well with {listOf(related)}</span>
                  </p>
                )}
                {checked && renderExtra?.(key)}
              </div>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
