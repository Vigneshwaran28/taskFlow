// Words and colours for access rules (server: services/permissions.js PERMISSION_LEVEL, routes/accessRules.js).
import { PERMISSION_GROUPS } from "@/app-shell/modules";
import type { Tone } from "@/components/ui/Badge";
import type { AccessLevel, CatalogPermission, RuleLevel, RuleMode, RuleState } from "../services/accessService";

export const LEVEL_META: Record<RuleLevel, { label: string; short: string; hint: string }> = {
  none: { label: "No access", short: "None", hint: "Nothing in this module." },
  read: { label: "Read", short: "Read", hint: "See, but not change." },
  write: { label: "Read & write", short: "Write", hint: "Create and edit everyday records." },
  manage: { label: "Full", short: "Full", hint: "Everything, including deleting, approving, and sensitive records." },
  custom: { label: "Custom", short: "Custom", hint: "Exactly the permissions you tick." },
};

export const RULE_LEVELS: RuleLevel[] = ["none", "read", "write", "manage", "custom"];

export const MODE_META: Record<RuleMode, { label: string; hint: string; tone: Tone }> = {
  grant: { label: "Grant", hint: "Adds access on top of the person's roles.", tone: "success" },
  limit: { label: "Limit", hint: "Caps the modules it names, whatever the person's roles say. Owners are never limited.", tone: "warning" },
};

export const STATE_META: Record<RuleState, { label: string; tone: Tone }> = {
  active: { label: "In effect", tone: "success" },
  scheduled: { label: "Scheduled", tone: "info" },
  expired: { label: "Ended", tone: "neutral" },
  off: { label: "Off", tone: "neutral" },
};

const RANK: Record<AccessLevel, number> = { none: 0, read: 1, write: 2, manage: 3 };

export const moduleLabel = (module: string) => (PERMISSION_GROUPS as Record<string, { label: string }>)[module]?.label ?? module;

/** The permissions a module level covers (custom: the ticked ones). */
export function keysFor(catalog: CatalogPermission[], module: string, level: RuleLevel, custom: string[]) {
  const ofModule = catalog.filter(permission => permission.module === module);
  if (level === "custom") return ofModule.filter(permission => custom.includes(permission.key)).map(permission => permission.key);
  return ofModule.filter(permission => RANK[permission.level] <= RANK[level]).map(permission => permission.key);
}

/** "Sales: Read · Inventory: No access" */
export function describeLevels(levels: Record<string, RuleLevel>) {
  return Object.entries(levels).map(([module, level]) => `${moduleLabel(module)}: ${LEVEL_META[level]?.label ?? level}`);
}
