"use client";
// Roles & access → Check access: pick a person and see every permission they have or don't, and why (which role or
// grant gives it, which limit takes it away).
import { useState } from "react";
import { CheckCircle2, MinusCircle, ShieldAlert, UserSearch } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Badge } from "@/components/ui/Badge";
import { SelectField } from "@/components/ui/SelectField";
import { usePeople } from "@/features/people";
import { cn } from "@/lib/cn";
import { useAccessExplanation } from "../hooks/useAccess";
import type { ExplainedPermission } from "../services/accessService";
import { LEVEL_META, moduleLabel, STATE_META } from "../utils/ruleMeta";

function Row({ item }: { item: ExplainedPermission }) {
  return (
    <li className="flex min-w-0 flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {item.granted ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-label="Allowed" /> : <MinusCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Not allowed" />}
        <span className={cn("min-w-0 text-sm", !item.granted && "text-muted-foreground")}>{item.label}</span>
        <span className="hidden shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground sm:inline">{LEVEL_META[item.level].short}</span>
      </span>
      <span className="flex flex-wrap gap-1 pl-6 sm:justify-end sm:pl-0">
        {item.sources.map(source => (
          <Badge key={`${source.type}-${source.id}`} tone={source.type === "grant" ? "success" : "neutral"}>
            {source.type === "grant" ? `Grant: ${source.name}` : source.name}
          </Badge>
        ))}
        {item.limitedBy.map(rule => (
          <Badge key={`limit-${rule.id}`} tone="warning">
            Limited by {rule.name}
          </Badge>
        ))}
      </span>
    </li>
  );
}

export function AccessChecker() {
  const people = usePeople();
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [onlyGranted, setOnlyGranted] = useState(false);
  const explanation = useAccessExplanation(userId);

  const options = [{ value: "", label: "Choose a person…" }, ...(people.data ?? []).map(person => ({ value: String(person.id), label: `${person.name} (${person.email})` }))];
  const data = explanation.data;
  const modules = data ? [...new Set(data.permissions.map(item => item.module))] : [];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <SelectField label="Person" className="w-full sm:w-96" value={userId ? String(userId) : ""} options={options} onChange={event => setUserId(Number(event.target.value) || undefined)} />
        {data && (
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={onlyGranted} onChange={event => setOnlyGranted(event.target.checked)} className="h-4 w-4 rounded border-input accent-primary" />
            Only what they can do
          </label>
        )}
      </div>

      {!userId ? (
        <EmptyState title="Check anyone's access" message="See every permission a person has, the role or rule that gives it, and any limit that takes it away." icon={UserSearch} />
      ) : explanation.isPending ? (
        <LoadingState label="Working out their access…" />
      ) : explanation.error || !data ? (
        <ErrorState message="Unable to load their access." onRetry={() => void explanation.refetch()} />
      ) : (
        <>
          <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border bg-card p-4 text-sm">
            <span className="font-semibold">{data.user.name}</span>
            <span className="text-muted-foreground">has {data.total} permissions</span>
            <span className="text-muted-foreground">· roles:</span>
            {data.roles.map(role => (
              <Badge key={role.id}>{role.name}</Badge>
            ))}
            {data.rules.length > 0 && <span className="text-muted-foreground">· rules:</span>}
            {data.rules.map(rule => (
              <Badge key={rule.id} tone={rule.state === "active" ? (rule.mode === "grant" ? "success" : "warning") : "neutral"}>
                {rule.name}
                {rule.state !== "active" ? ` (${STATE_META[rule.state].label.toLowerCase()})` : ""}
              </Badge>
            ))}
            {data.isOwner && (
              <span className="flex w-full items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                Owners always have every permission; limits don&apos;t apply to them.
              </span>
            )}
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
            {modules.map(module => {
              const items = data.permissions.filter(item => item.module === module && (!onlyGranted || item.granted));
              if (!items.length) return null;
              const granted = data.permissions.filter(item => item.module === module && item.granted).length;
              const total = data.permissions.filter(item => item.module === module).length;
              return (
                <section key={module} aria-label={moduleLabel(module)} className="min-w-0 rounded-xl border bg-card">
                  <h3 className="flex items-center justify-between gap-2 border-b px-3 py-2 text-sm font-semibold">
                    {moduleLabel(module)}
                    <span className="text-xs font-normal text-muted-foreground">
                      {granted} of {total}
                    </span>
                  </h3>
                  <ul className="divide-y">
                    {items.map(item => (
                      <Row key={item.key} item={item} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
