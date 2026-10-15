"use client";
// The tables a workspace gets for its modules, grouped by module, with how each table links to the others. Links to a
// table of a module that isn't selected are shown dimmed: they are added when that module is.
import type { ComponentType } from "react";
import { ArrowRight, Link2, Settings2, Table2 } from "lucide-react";
import { MODULES } from "@/app-shell/modules";
import { LoadingState } from "@/components/shared/States";
import { cn } from "@/lib/cn";
import type { FeatureKey } from "@/types/session";
import { useDatabaseSchema } from "../hooks/useAdmin";
import type { TableRelation } from "../services/adminService";
import { TABLE_ICONS } from "../utils/tableMeta";

const label = (name: string) => name.replace(/_/g, " ");

function TableRow({ table, present, sharedWith }: { table: TableRelation; present: Set<string>; sharedWith: string[] }) {
  const Icon = TABLE_ICONS[table.name] ?? Table2;
  const links = table.references.filter(ref => ref.table !== "tenants" && ref.table !== table.name);
  return (
    <li className="flex min-w-0 flex-col gap-1 rounded-lg border bg-card px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 truncate font-mono text-xs font-medium" title={table.name}>
          {table.name}
        </span>
        <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">{table.columns} cols</span>
      </div>
      {links.length > 0 && (
        <ul className="flex flex-wrap gap-1" aria-label={`${label(table.name)} links to`}>
          {links.map(ref => {
            const live = present.has(ref.table);
            return (
              <li
                key={`${ref.columns.join()}-${ref.table}`}
                title={live ? `${ref.columns.join(", ")} → ${ref.table}.id${ref.onDelete ? ` (on delete ${ref.onDelete.toLowerCase()})` : ""}` : `Linked when the module with ${ref.table} is added`}
                className={cn("inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px]", live ? "bg-primary/10 text-primary" : "border border-dashed text-muted-foreground")}
              >
                <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate font-mono">{ref.table}</span>
              </li>
            );
          })}
        </ul>
      )}
      {sharedWith.length > 0 && <p className="text-[11px] text-muted-foreground">Shared with {sharedWith.join(", ")}</p>}
    </li>
  );
}

export interface ModuleTablesPreviewProps {
  features: FeatureKey[];
  /** Tables that exist now (an existing dedicated database); others are marked "to be added" */
  existing?: string[];
  className?: string;
}

export function ModuleTablesPreview({ features, existing, className }: ModuleTablesPreviewProps) {
  const schema = useDatabaseSchema();
  if (schema.isPending) return <LoadingState label="Loading the schema…" className="py-6" />;
  if (schema.error || !schema.data) return <p className="text-sm text-muted-foreground">The table list isn&apos;t available from this server.</p>;

  const { core, modules, tables } = schema.data;
  const byName = new Map(tables.map(table => [table.name, table]));
  const present = new Set<string>(core);
  for (const key of features) for (const name of modules[key] ?? []) present.add(name);
  // Each table is listed once, under the first selected module that brings it; the others are "shared with".
  const owners = new Map<string, FeatureKey[]>();
  for (const key of features) for (const name of modules[key] ?? []) if (!core.includes(name)) owners.set(name, [...(owners.get(name) ?? []), key]);
  const groups: { key: string; title: string; icon: ComponentType<{ className?: string }>; names: string[] }[] = [{ key: "core", title: "Workspace (always)", icon: Settings2, names: core }];
  for (const key of features) {
    const names = (modules[key] ?? []).filter(name => owners.get(name)?.[0] === key);
    const meta = MODULES[key];
    if (names.length) groups.push({ key, title: meta?.label ?? key, icon: meta?.icon ?? Table2, names });
  }
  const links = [...present].reduce((sum, name) => sum + (byName.get(name)?.references.filter(ref => present.has(ref.table) && ref.table !== "tenants").length ?? 0), 0);
  const missing = existing ? [...present].filter(name => !existing.includes(name)) : [];

  return (
    <section aria-label="Tables and relationships" className={cn("flex min-w-0 flex-col gap-3", className)}>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          {present.size} tables · {links} links
        </span>
        <span className="inline-flex items-center gap-1">
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          Every table also links to its workspace (tenants).
        </span>
      </p>
      {missing.length > 0 && <p className="text-xs text-warning">Added on save: {missing.join(", ")}</p>}
      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
        {groups.map(({ key, title, icon: Icon, names }) => (
          <div key={key} className="flex min-w-0 flex-col gap-2 rounded-xl border bg-muted/30 p-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
              {title}
              <span className="ml-auto text-xs font-normal text-muted-foreground">{names.length}</span>
            </h4>
            <ul className="flex flex-col gap-1.5">
              {names.map(name => {
                const table = byName.get(name);
                if (!table) return null;
                const sharedWith = (owners.get(name) ?? []).slice(1).map(owner => MODULES[owner]?.label ?? owner);
                return <TableRow key={name} table={table} present={present} sharedWith={sharedWith} />;
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
