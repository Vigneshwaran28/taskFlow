"use client";
import { KeyRound } from "lucide-react";
import { PERMISSION_GROUPS } from "@/app-shell/modules";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Badge } from "@/components/ui/Badge";
import { useTenantRoles } from "../hooks/useAdmin";
import type { TenantRole } from "../services/adminService";

/** "billing.invoices.manage" -> group "billing"; permissions are grouped by module for reading. */
function groupPermissions(permissions: readonly string[]) {
  const groups = new Map<string, string[]>();
  for (const key of permissions) {
    const group = key.split(".")[0] ?? key;
    groups.set(group, [...(groups.get(group) ?? []), key]);
  }
  return [...groups.entries()].map(([group, keys]) => ({ group, label: PERMISSION_GROUPS[group]?.label ?? group, keys }));
}

function RoleCard({ role }: { role: TenantRole }) {
  const groups = groupPermissions(role.permissions);
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold">{role.name}</span>
            <Badge tone={role.isSystem ? "info" : "neutral"}>{role.isSystem ? "Built-in" : "Custom"}</Badge>
          </p>
          {role.description && <p className="text-sm text-muted-foreground">{role.description}</p>}
        </div>
        <p className="shrink-0 text-right text-sm">
          <span className="block font-semibold tabular-nums">{role.members.active}</span>
          <span className="block text-xs text-muted-foreground">{role.members.active === 1 ? "person" : "people"}</span>
        </p>
      </div>
      <details className="group rounded-lg border bg-muted/30 px-3 py-2 text-sm">
        <summary className="cursor-pointer select-none font-medium text-muted-foreground hover:text-foreground">
          {role.permissions.length} permission{role.permissions.length === 1 ? "" : "s"}
          {role.members.total > role.members.active ? ` · ${role.members.total - role.members.active} deactivated holder(s)` : ""}
        </summary>
        {groups.length ? (
          <dl className="mt-2 flex flex-col gap-2">
            {groups.map(group => (
              <div key={group.group}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {group.keys.map(key => (
                    <code key={key} className="break-all rounded bg-card px-1.5 py-0.5 font-mono text-xs ring-1 ring-inset ring-border">
                      {key}
                    </code>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-muted-foreground">No permissions.</p>
        )}
      </details>
    </li>
  );
}

/** Feature component: a tenant's roles, what each allows, and how many people hold it. */
export function RolesView({ tenantId }: { tenantId: number }) {
  const { data, isPending, error, refetch } = useTenantRoles(tenantId);
  if (isPending) return <LoadingState label="Loading roles…" />;
  if (error) return <ErrorState message="Unable to load this tenant's roles." onRetry={() => void refetch()} />;
  if (!data.length) return <EmptyState title="No roles" message="This tenant has no roles yet." icon={KeyRound} />;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Built-in roles come with every tenant. The tenant&apos;s admins create custom roles and assign them in their workspace.</p>
      <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data.map(role => (
          <RoleCard key={role.id} role={role} />
        ))}
      </ul>
    </div>
  );
}
