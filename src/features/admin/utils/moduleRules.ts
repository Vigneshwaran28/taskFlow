// Module rules for the tenant dialog, computed from the server's catalog (GET /bunny/tenants -> catalog), so the
// console never keeps its own copy of the dependency graph or the industries.
import type { FeatureKey } from "@/types/session";
import type { IndustryKey, IndustryMeta, ModuleCatalog } from "../services/adminService";

/** What an industry allows: every given key when there is no catalog (older server) or the industry is unknown. */
export function industryMeta(catalog: ModuleCatalog | null, key: IndustryKey | undefined): IndustryMeta | null {
  if (!catalog) return null;
  return catalog.industries.find(industry => industry.key === (key ?? catalog.defaultIndustry)) ?? catalog.industries.find(industry => industry.key === catalog.defaultIndustry) ?? null;
}

export const requiresOf = (catalog: ModuleCatalog | null, key: FeatureKey): FeatureKey[] => catalog?.modules[key]?.requires ?? [];
export const enhancesOf = (catalog: ModuleCatalog | null, key: FeatureKey): FeatureKey[] => catalog?.modules[key]?.enhances ?? [];

/** The set plus everything it requires, transitively, and the modules that were added. */
export function withRequirements(catalog: ModuleCatalog | null, features: Iterable<FeatureKey>) {
  const result = new Set(features);
  const added: FeatureKey[] = [];
  const queue = [...result];
  while (queue.length) {
    const key = queue.shift()!;
    for (const dependency of requiresOf(catalog, key)) {
      if (!result.has(dependency)) {
        result.add(dependency);
        added.push(dependency);
        queue.push(dependency);
      }
    }
  }
  return { features: result, added };
}

/** Enabled modules that require `key` (it can't be switched off while any of them is on). */
export function neededBy(catalog: ModuleCatalog | null, key: FeatureKey, enabled: ReadonlySet<FeatureKey>): FeatureKey[] {
  return [...enabled].filter(other => other !== key && requiresOf(catalog, other).includes(key));
}

/** Both directions of "works well with", limited to modules the industry allows. */
export function worksWellWith(catalog: ModuleCatalog | null, key: FeatureKey, allowed: readonly FeatureKey[]): FeatureKey[] {
  if (!catalog) return [];
  const related = new Set<FeatureKey>(enhancesOf(catalog, key));
  for (const [other, relation] of Object.entries(catalog.modules) as [FeatureKey, ModuleCatalog["modules"][FeatureKey]][]) {
    if (relation?.enhances.includes(key)) related.add(other);
  }
  related.delete(key);
  return [...related].filter(other => allowed.includes(other));
}

/** Licensed modules an industry doesn't offer (switching to it would need them removed first). */
export const outsideIndustry = (industry: IndustryMeta | null, features: Iterable<FeatureKey>): FeatureKey[] =>
  industry ? [...features].filter(key => !industry.allowed.includes(key)) : [];
