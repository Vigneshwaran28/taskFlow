"use client";
import { Users } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AnnouncementAudience, AudienceRole } from "../services/announcementService";

export interface AudienceFieldProps {
  audience: AnnouncementAudience;
  roleIds: readonly number[];
  roles: readonly AudienceRole[];
  rolesLoading: boolean;
  rolesError: boolean;
  onAudienceChange: (audience: AnnouncementAudience) => void;
  onRoleIdsChange: (ids: number[]) => void;
  error?: string;
}

const OPTIONS: { value: AnnouncementAudience; label: string; hint: string }[] = [
  { value: "all", label: "Everyone", hint: "Everyone in the workspace" },
  { value: "roles", label: "Specific roles", hint: "Only people holding one of the chosen roles" },
];

/** Presentational: who an announcement is addressed to: everyone, or the holders of chosen roles. */
export function AudienceField({ audience, roleIds, roles, rolesLoading, rolesError, onAudienceChange, onRoleIdsChange, error }: AudienceFieldProps) {
  const toggle = (id: number) => onRoleIdsChange(roleIds.includes(id) ? roleIds.filter(item => item !== id) : [...roleIds, id]);
  const errorId = "announcement-audience-error";
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-1.5 text-sm font-medium">Audience</legend>
      <div role="radiogroup" aria-label="Audience" className="grid gap-2 sm:grid-cols-2">
        {OPTIONS.map(option => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring",
              audience === option.value ? "border-primary bg-accent/60" : "hover:bg-muted/50"
            )}
          >
            <input
              type="radio"
              name="announcement-audience"
              value={option.value}
              checked={audience === option.value}
              onChange={() => onAudienceChange(option.value)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span className="min-w-0">
              <span className="block font-medium">{option.label}</span>
              <span className="block text-xs text-muted-foreground">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>
      {audience === "roles" &&
        (rolesLoading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading roles…
          </p>
        ) : rolesError ? (
          <p role="alert" className="text-sm text-destructive">
            Unable to load the workspace&apos;s roles.
          </p>
        ) : (
          <ul aria-label="Roles" className="max-h-56 divide-y overflow-y-auto rounded-lg border">
            {roles.map(role => (
              <li key={role.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50">
                  <input type="checkbox" checked={roleIds.includes(role.id)} onChange={() => toggle(role.id)} className="h-4 w-4 rounded border-input accent-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{role.name}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" aria-hidden="true" />
                    {role.members} {role.members === 1 ? "person" : "people"}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ))}
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
