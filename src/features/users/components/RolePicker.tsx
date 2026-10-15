import { Lock } from "lucide-react";
import type { Role } from "@/features/access";
import { cn } from "@/lib/cn";

export interface RolePickerProps {
  roles: readonly Role[];
  value: readonly number[];
  onChange: (ids: number[]) => void;
  /** null when the manager may grant the role */
  blockedReason: (role: Role) => string | null;
  error?: string;
}

/** Presentational: choose one or more roles. Roles the manager can't grant are shown disabled with the reason. */
export function RolePicker({ roles, value, onChange, blockedReason, error }: RolePickerProps) {
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter(item => item !== id) : [...value, id]);
  return (
    <fieldset aria-describedby={error ? "role-picker-error" : undefined}>
      <legend className="mb-1.5 text-sm font-medium">Roles</legend>
      <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border">
        {roles.map(role => {
          const checked = value.includes(role.id);
          const reason = blockedReason(role);
          // Already-held roles can always be kept; only adding a blocked role is prevented.
          const disabled = Boolean(reason) && !checked;
          return (
            <li key={role.id}>
              <label className={cn("flex items-start gap-3 px-3 py-2", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/50")}>
                <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(role.id)} className="mt-0.5 h-4 w-4 rounded border-input accent-primary" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {role.name}
                    <span className="text-xs font-normal text-muted-foreground">{role.permissions.length} permissions</span>
                  </span>
                  {role.description && <span className="block text-xs text-muted-foreground">{role.description}</span>}
                  {reason && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      {reason}
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {error && (
        <p id="role-picker-error" className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
