"use client";
import { useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { roleTone, useCan } from "@/features/auth";
import { cn } from "@/lib/cn";
import { useRoles } from "../hooks/useAccess";
import { RoleEditor } from "./RoleEditor";

export interface RolesWorkspaceProps {
  /** "new" or a role id */
  selected: string | null;
  onSelect: (value: string | null) => void;
}

/** Feature component: every role on the left, the selected role's permissions on the right. */
export function RolesWorkspace({ selected, onSelect }: RolesWorkspaceProps) {
  const { data, isPending, error, refetch } = useRoles();
  const canEdit = useCan("workspace.roles.manage");
  // For "new" / duplicate: a key to remount the editor and the permissions to start from.
  const [draft, setDraft] = useState<{ key: number; permissions: string[] } | null>(null);

  if (isPending) return <LoadingState label="Loading roles…" />;
  if (error) return <ErrorState message="Unable to load roles." onRetry={() => void refetch()} />;

  const role = selected && selected !== "new" ? data.roles.find(item => String(item.id) === selected) : null;
  const current = selected === "new" ? null : (role ?? data.roles[0] ?? null);
  const isNew = selected === "new" && canEdit;

  function startNew(permissions: string[] = []) {
    setDraft(currentDraft => ({ key: (currentDraft?.key ?? 0) + 1, permissions }));
    onSelect("new");
  }

  const handleSaved = (id: number | null) => onSelect(id ? String(id) : null);

  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside aria-label="Roles" className="flex flex-col gap-2">
        {canEdit && (
          <Button onClick={() => startNew()} className="w-full">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New role
          </Button>
        )}
        <ul className="flex flex-col gap-1">
          {data.roles.map(item => {
            const active = !isNew && current?.id === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => onSelect(String(item.id))}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "bg-accent" : "hover:bg-muted"
                  )}
                >
                  <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {item.members} {item.members === 1 ? "person" : "people"} · {item.permissions.length} permissions
                    </span>
                  </span>
                  {item.isSystem && <Badge tone={roleTone(item)}>Built-in</Badge>}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="min-w-0 rounded-xl border bg-card p-5">
        {isNew ? (
          <RoleEditor
            key={`new-${draft?.key ?? 0}`}
            role={null}
            catalog={data.catalog}
            mine={data.mine}
            isOwner={data.isOwner}
            canEdit={canEdit}
            initialPermissions={draft?.permissions}
            onSaved={handleSaved}
            onDuplicate={() => {}}
          />
        ) : current ? (
          <RoleEditor
            key={current.id}
            role={current}
            catalog={data.catalog}
            mine={data.mine}
            isOwner={data.isOwner}
            canEdit={canEdit}
            onSaved={handleSaved}
            onDuplicate={source => startNew(source.permissions)}
          />
        ) : null}
      </section>
    </div>
  );
}
