"use client";
// Create or edit an access rule: grant or limit, a level per module (or a custom list of its permissions), when it
// applies, and who it applies to.
import { useMemo, useState, type FormEvent } from "react";
import { CalendarRange, Check, Search, Trash2, Users } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { usePeople } from "@/features/people";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { useCreateRule, useDeleteRule, useUpdateRule } from "../hooks/useAccess";
import type { AccessRule, AccessRuleInput, AccessRulesResponse, RuleLevel, RuleMode } from "../services/accessService";
import { keysFor, LEVEL_META, MODE_META, moduleLabel, RULE_LEVELS } from "../utils/ruleMeta";

export interface AccessRuleDialogProps {
  rule: AccessRule | null;
  data: AccessRulesResponse;
  canEdit: boolean;
  onClose: () => void;
}

function Segmented<T extends string>({ name, value, options, labels, onChange, disabled }: { name: string; value: T | ""; options: readonly T[]; labels: Record<string, string>; onChange: (next: T) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
      {options.map(option => {
        const selected = option === value;
        return (
          <label
            key={option}
            className={cn(
              "flex-1 cursor-pointer whitespace-nowrap rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-ring",
              selected ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <input type="radio" name={name} value={option} checked={selected} disabled={disabled} onChange={() => onChange(option)} className="sr-only" />
            {labels[option] ?? option}
          </label>
        );
      })}
    </div>
  );
}

export function AccessRuleDialog({ rule, data, canEdit, onClose }: AccessRuleDialogProps) {
  const toast = useToast();
  const create = useCreateRule();
  const update = useUpdateRule();
  const remove = useDeleteRule();
  const mutation = rule ? update : create;
  const people = usePeople();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [search, setSearch] = useState("");
  const [values, setValues] = useState<AccessRuleInput>(() => ({
    name: rule?.name ?? "",
    description: rule?.description ?? "",
    mode: rule?.mode ?? "grant",
    levels: rule?.levels ?? {},
    permissions: rule?.permissions ?? [],
    startsOn: rule?.startsOn ?? null,
    endsOn: rule?.endsOn ?? null,
    isActive: rule?.isActive ?? true,
    userIds: rule?.users.map(user => user.id) ?? [],
  }));
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const errors = { ...fieldErrorsOf(mutation.error), ...clientErrors };
  const disabled = !canEdit;

  function set<K extends keyof AccessRuleInput>(key: K, value: AccessRuleInput[K]) {
    setValues(current => ({ ...current, [key]: value }));
    setClientErrors(current => ({ ...current, [key]: "" }));
    if (mutation.error) mutation.reset();
  }

  function setLevel(module: string, level: RuleLevel | "") {
    const next = { ...values.levels };
    if (level === "") delete next[module];
    else next[module] = level;
    // Switching a module to custom starts from what its current level covers.
    let permissions = values.permissions.filter(key => key.split(".")[0] !== module || level === "custom");
    if (level === "custom" && values.levels[module] && values.levels[module] !== "custom") permissions = [...permissions, ...keysFor(data.catalog, module, values.levels[module], [])];
    setValues(current => ({ ...current, levels: next, permissions: [...new Set(permissions)] }));
    setClientErrors(current => ({ ...current, levels: "" }));
  }

  const togglePermission = (key: string) => set("permissions", values.permissions.includes(key) ? values.permissions.filter(item => item !== key) : [...values.permissions, key]);

  // The directory lists the workspace's people; people already on the rule stay listed.
  const everyone = useMemo(() => people.data ?? [], [people.data]);
  const term = search.trim().toLowerCase();
  const listed = everyone.filter(person => !term || `${person.name} ${person.email}`.toLowerCase().includes(term));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending || disabled) return;
    const next: Record<string, string> = {};
    if (!values.name.trim()) next.name = "Name the rule.";
    if (!Object.keys(values.levels).length) next.levels = "Set the access of at least one module.";
    if (values.startsOn && values.endsOn && values.endsOn < values.startsOn) next.endsOn = "The end date can't be before the start date.";
    setClientErrors(next);
    if (Object.keys(next).length) return;
    const input = { ...values, name: values.name.trim(), description: values.description?.trim() || null };
    const onSuccess = () => {
      toast.success(rule ? "Rule saved" : "Rule created", "People it applies to get the new access right away.");
      onClose();
    };
    if (rule) update.mutate({ id: rule.id, changes: input }, { onSuccess });
    else create.mutate(input, { onSuccess });
  }

  const modeOptions: RuleMode[] = ["grant", "limit"];
  const levelOptions = RULE_LEVELS.filter(level => values.mode === "limit" || level !== "none");
  const ruleLabels = Object.fromEntries(RULE_LEVELS.map(level => [level, LEVEL_META[level].short]));

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        size="xl"
        title={rule ? `Edit ${rule.name}` : "New access rule"}
        description="Give people extra access, or cap what they can do, on top of their roles."
        footer={
          <>
            {rule && canEdit && (
              <Button variant="ghost" className="mr-auto text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              {canEdit ? "Cancel" : "Close"}
            </Button>
            {canEdit && (
              <Button type="submit" form="access-rule-form" loading={mutation.isPending}>
                <Check className="h-4 w-4" aria-hidden="true" />
                {rule ? "Save rule" : "Create rule"}
              </Button>
            )}
          </>
        }
      >
        <form id="access-rule-form" onSubmit={handleSubmit} noValidate className="flex min-w-0 flex-col gap-5">
          <FormAlert message={formErrorOf(mutation.error)} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Name" required maxLength={80} placeholder="e.g. Sales read-only, Weekend help desk cover" value={values.name} error={errors.name} disabled={disabled} onChange={event => set("name", event.target.value)} />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Type</span>
              <Segmented name="Rule type" value={values.mode} options={modeOptions} labels={{ grant: "Grant access", limit: "Limit access" }} disabled={disabled} onChange={mode => set("mode", mode)} />
              <span className="text-xs text-muted-foreground">{MODE_META[values.mode].hint}</span>
            </div>
          </div>
          <TextAreaField label="Description (optional)" rows={2} maxLength={300} value={values.description ?? ""} disabled={disabled} onChange={event => set("description", event.target.value)} />

          <fieldset className="flex min-w-0 flex-col gap-3 rounded-xl border p-4">
            <legend className="px-1 text-sm font-semibold">Access per module</legend>
            <p className="text-xs text-muted-foreground">
              {values.mode === "grant" ? "Pick what each module gets; leave the rest untouched (—)." : "Pick the most each module allows; modules left untouched (—) keep the person's role access."} Levels add up: Full includes Read &amp;
              write, which includes Read.
            </p>
            {errors.levels && (
              <p role="alert" className="text-sm text-destructive">
                {errors.levels}
              </p>
            )}
            <ul className="flex flex-col divide-y">
              {data.modules.map(module => {
                const level = values.levels[module] ?? "";
                const covered = level ? keysFor(data.catalog, module, level, values.permissions) : [];
                const ofModule = data.catalog.filter(permission => permission.module === module);
                return (
                  <li key={module} className="flex min-w-0 flex-col gap-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center">
                      <span className="text-sm font-medium md:w-48 md:shrink-0">{moduleLabel(module)}</span>
                      <div className="min-w-0 flex-1">
                        <Segmented name={`${moduleLabel(module)} access`} value={level} options={["" as RuleLevel, ...levelOptions] as RuleLevel[]} labels={{ "": "—", ...ruleLabels }} disabled={disabled} onChange={next => setLevel(module, next)} />
                      </div>
                    </div>
                    {level === "custom" ? (
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:ml-48">
                        {ofModule.map(permission => (
                          <label key={permission.key} className="flex items-start gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/60">
                            <input type="checkbox" checked={values.permissions.includes(permission.key)} disabled={disabled} onChange={() => togglePermission(permission.key)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary" />
                            <span className="min-w-0">
                              <span className="block">{permission.label}</span>
                              <span className="block text-xs text-muted-foreground">{permission.description}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      level && (
                        <p className="text-xs text-muted-foreground md:ml-48">
                          {covered.length
                            ? `${values.mode === "limit" ? "Allows at most" : "Gives"}: ${covered.map(key => ofModule.find(permission => permission.key === key)?.label ?? key).join(", ")}.`
                            : values.mode === "limit"
                              ? "Blocks the whole module."
                              : "Nothing at this level in this module."}
                        </p>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          </fieldset>

          <fieldset className="flex min-w-0 flex-col gap-3 rounded-xl border p-4">
            <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold">
              <CalendarRange className="h-4 w-4 text-primary" aria-hidden="true" />
              When
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextField label="From (optional)" type="date" value={values.startsOn ?? ""} error={errors.startsOn} disabled={disabled} onChange={event => set("startsOn", event.target.value || null)} />
              <TextField label="Until (optional)" type="date" value={values.endsOn ?? ""} error={errors.endsOn} disabled={disabled} onChange={event => set("endsOn", event.target.value || null)} />
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" checked={values.isActive} disabled={disabled} onChange={event => set("isActive", event.target.checked)} className="h-4 w-4 rounded border-input accent-primary" />
                Switched on
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Leave the dates empty for a permanent rule. Temporary access (cover, audits, contractors) ends by itself.</p>
          </fieldset>

          <fieldset className="flex min-w-0 flex-col gap-3 rounded-xl border p-4">
            <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold">
              <Users className="h-4 w-4 text-primary" aria-hidden="true" />
              People ({values.userIds.length})
            </legend>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                type="search"
                aria-label="Find people"
                placeholder="Find people by name or email"
                value={search}
                onChange={event => setSearch(event.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {errors.userIds && <p className="text-sm text-destructive">{errors.userIds}</p>}
            <ul className="grid max-h-60 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
              {people.isPending && <li className="text-sm text-muted-foreground">Loading people…</li>}
              {listed.map(person => {
                const checked = values.userIds.includes(person.id);
                return (
                  <li key={person.id}>
                    <label className={cn("flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted", checked && "bg-primary/5")}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => set("userIds", checked ? values.userIds.filter(id => id !== person.id) : [...values.userIds, person.id])}
                        className="h-4 w-4 shrink-0 rounded border-input accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{person.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{person.email}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${rule?.name ?? "this rule"}?`}
        message="The people it applies to go back to the access their roles give them."
        confirmLabel="Delete rule"
        tone="danger"
        pending={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          rule &&
          remove.mutate(rule.id, {
            onSuccess: () => {
              toast.success("Rule deleted");
              onClose();
            },
          })
        }
      />
    </>
  );
}
