"use client";
import dynamic from "next/dynamic";
// Roles & access → Access rules: every rule with what it does, when, and for whom; opens the editor.
import { useState } from "react";
import { CalendarRange, Plus, ShieldMinus, ShieldPlus, Users } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useCan } from "@/features/auth";
import { formatDay } from "@/lib/format";
import { useAccessRules } from "../hooks/useAccess";
import type { AccessRule } from "../services/accessService";
import { describeLevels, MODE_META, STATE_META } from "../utils/ruleMeta";

// Loaded when first opened: keeps it out of the page's first download.
const AccessRuleDialog = dynamic(() => import("./AccessRuleDialog").then(module => module.AccessRuleDialog), { ssr: false });

function when(rule: AccessRule) {
  if (rule.startsOn && rule.endsOn) return `${formatDay(rule.startsOn)} – ${formatDay(rule.endsOn)}`;
  if (rule.startsOn) return `From ${formatDay(rule.startsOn)}`;
  if (rule.endsOn) return `Until ${formatDay(rule.endsOn)}`;
  return "Always";
}

export function AccessRulesView() {
  const query = useAccessRules();
  const canEdit = useCan("workspace.roles.manage");
  // undefined: closed; null: new; a rule: editing (a key remounts the dialog)
  const [open, setOpen] = useState<{ rule: AccessRule | null; key: number } | null>(null);

  if (query.isPending) return <LoadingState label="Loading access rules…" />;
  if (query.error) return <ErrorState message="Unable to load access rules." onRetry={() => void query.refetch()} />;
  const { rules } = query.data;
  const openRule = (rule: AccessRule | null) => setOpen(current => ({ rule, key: (current?.key ?? 0) + 1 }));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Rules adjust access for chosen people on top of their roles: <strong className="font-medium text-foreground">grant</strong> extra access (cover, projects, contractors) or{" "}
          <strong className="font-medium text-foreground">limit</strong> a module to read-only or nothing. Limits win; owners are never limited.
        </p>
        {canEdit && (
          <Button onClick={() => openRule(null)} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New rule
          </Button>
        )}
      </div>

      {rules.length === 0 ? (
        <EmptyState
          title="No access rules yet"
          message="Roles cover most needs. Add a rule when one person needs a little more, or a little less, than their role."
          icon={ShieldPlus}
          action={
            canEdit ? (
              <Button variant="secondary" onClick={() => openRule(null)}>
                Create the first rule
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
          {rules.map(rule => {
            const ModeIcon = rule.mode === "grant" ? ShieldPlus : ShieldMinus;
            const state = STATE_META[rule.state];
            return (
              <li key={rule.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => openRule(rule)}
                  className="flex h-full w-full min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={rule.mode === "grant" ? "rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}>
                      <ModeIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{rule.name}</span>
                      {rule.description && <span className="line-clamp-2 block text-sm text-muted-foreground">{rule.description}</span>}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={MODE_META[rule.mode].tone}>{MODE_META[rule.mode].label}</Badge>
                      <Badge tone={state.tone}>{state.label}</Badge>
                    </span>
                  </div>
                  <ul className="flex flex-wrap gap-1.5" aria-label="Modules">
                    {describeLevels(rule.levels).map(text => (
                      <li key={text} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                        {text}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {rule.users.length ? rule.users.slice(0, 3).map(user => user.name).join(", ") + (rule.users.length > 3 ? ` +${rule.users.length - 3}` : "") : "Nobody yet"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
                      {when(rule)}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && <AccessRuleDialog key={open.key} rule={open.rule} data={query.data} canEdit={canEdit} onClose={() => setOpen(null)} />}
    </div>
  );
}
