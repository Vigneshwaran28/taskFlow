import { Lock } from "lucide-react";
import { MODULES, PERMISSION_GROUPS, type ModuleMeta } from "@/app-shell/modules";
import { cn } from "@/lib/cn";
import type { Permission } from "../services/accessService";

export interface PermissionMatrixProps {
  catalog: readonly Permission[];
  /** Selected permission keys */
  value: readonly string[];
  onChange: (keys: string[]) => void;
  canGrant: (key: string) => boolean;
  readOnly?: boolean;
}

/**
 * Presentational: permissions grouped by module, with a whole-module toggle per group.
 * Permissions the editor can't grant (they don't hold them) are shown but disabled.
 */
export function PermissionMatrix({ catalog, value, onChange, canGrant, readOnly = false }: PermissionMatrixProps) {
  const groups = Object.entries(groupBy(catalog));
  const selected = new Set(value);

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange([...next]);
  }

  function toggleGroup(permissions: readonly Permission[], on: boolean) {
    const next = new Set(selected);
    permissions.filter(permission => canGrant(permission.key)).forEach(permission => (on ? next.add(permission.key) : next.delete(permission.key)));
    onChange([...next]);
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map(([module, permissions]) => {
        const group: { label: string } | undefined = PERMISSION_GROUPS[module];
        // "workspace" isn't a module, so it has no icon.
        const Icon = (MODULES as Readonly<Record<string, ModuleMeta | undefined>>)[module]?.icon;
        const count = permissions.filter(permission => selected.has(permission.key)).length;
        const all = count === permissions.length;
        const editable = permissions.filter(permission => canGrant(permission.key));
        return (
          <fieldset key={module} className="rounded-xl border">
            <legend className="sr-only">{group?.label ?? module}</legend>
            <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2.5">
              {Icon && <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
              <span className="flex-1 text-sm font-semibold">{group?.label ?? module}</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {count} of {permissions.length}
              </span>
              {!readOnly && editable.length > 0 && (
                <button type="button" onClick={() => toggleGroup(permissions, !all)} className="text-xs font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none">
                  {all ? "Clear all" : "Select all"}
                </button>
              )}
            </div>
            <ul className="divide-y">
              {permissions.map(permission => {
                const grantable = canGrant(permission.key);
                const disabled = readOnly || !grantable;
                return (
                  <li key={permission.key}>
                    <label className={cn("flex items-start gap-3 px-4 py-2.5", disabled ? "cursor-default" : "cursor-pointer hover:bg-muted/40")}>
                      <input
                        type="checkbox"
                        checked={selected.has(permission.key)}
                        disabled={disabled}
                        onChange={() => toggle(permission.key)}
                        className="mt-0.5 h-4 w-4 rounded border-input accent-primary disabled:opacity-60"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          {permission.label}
                          {!readOnly && !grantable && (
                            <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                              <Lock className="h-3 w-3" aria-hidden="true" />
                              you don&apos;t have this
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-muted-foreground">{permission.description}</span>
                      </span>
                      <code className="hidden shrink-0 text-[11px] text-muted-foreground md:block">{permission.key}</code>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        );
      })}
    </div>
  );
}

/** Permissions keyed by module, keeping catalog order. */
function groupBy(list: readonly Permission[]) {
  return list.reduce<Record<string, Permission[]>>((groups, permission) => {
    (groups[permission.module] ??= []).push(permission);
    return groups;
  }, {});
}
