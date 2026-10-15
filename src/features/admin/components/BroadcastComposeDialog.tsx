"use client";
// Feature component: compose, edit (before it is published), or duplicate a provider announcement. The audience is
// every tenant, chosen tenants, or individual people (pick a tenant, then its admins or users); within a tenant it
// reaches its admins only or everyone. Publish now or at a time, with an optional expiry.
import { useState, type FormEvent, type ReactNode } from "react";
import { Search, ShieldCheck, X } from "lucide-react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/dates";
import { useCreateBroadcast, useTenantPeople, useTenants, useUpdateBroadcast } from "../hooks/useAdmin";
import type { Broadcast, BroadcastAudience, BroadcastInput, BroadcastRecipients, BroadcastSeverity } from "../services/adminService";

export const TITLE_MAX = 160;
export const BODY_MAX = 5000;

const KIND_OPTIONS = [
  { value: "announcement", label: "Announcement" },
  { value: "maintenance", label: "Maintenance" },
] as const;
const SEVERITY_OPTIONS = [
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning (banner)" },
  { value: "critical", label: "Critical (banner)" },
] as const;

interface PickedPerson {
  id: number;
  tenantId: number;
  name: string;
  tenantName: string;
}

/** People are picked per tenant: tenants with their own database number their people independently. */
const personKey = (tenantId: number, id: number) => `${tenantId}:${id}`;

export interface BroadcastComposeDialogProps {
  /** edit = change a scheduled broadcast; duplicate = a new one prefilled from it; neither = blank */
  source?: { broadcast: Broadcast; mode: "edit" | "duplicate" } | null;
  onClose: () => void;
}

function Choice({ name, value, checked, onChange, label, hint }: { name: string; value: string; checked: boolean; onChange: () => void; label: string; hint?: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring", checked ? "border-primary bg-accent/40" : "hover:bg-muted/60")}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

function Fieldset({ legend, children, error }: { legend: string; children: ReactNode; error?: string }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      {children}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function BroadcastComposeDialog({ source = null, onClose }: BroadcastComposeDialogProps) {
  const toast = useToast();
  const create = useCreateBroadcast();
  const update = useUpdateBroadcast();
  const editing = source?.mode === "edit" ? source.broadcast : null;
  const mutation = editing ? update : create;
  const from = source?.broadcast;

  const [kind, setKind] = useState<BroadcastInput["kind"]>(from && from.kind !== "subscription" ? from.kind : "announcement");
  const [severity, setSeverity] = useState<BroadcastSeverity>(from?.severity ?? "info");
  const [title, setTitle] = useState(from?.title ?? "");
  const [body, setBody] = useState(from?.body ?? "");
  const [audience, setAudience] = useState<BroadcastAudience>(from?.audience ?? "all");
  const [recipients, setRecipients] = useState<BroadcastRecipients>(from?.recipients ?? "admins");
  const [tenantIds, setTenantIds] = useState<Set<number>>(() => new Set(from?.audience === "tenants" ? from.targets.map(target => target.tenantId) : []));
  const [people, setPeople] = useState<Map<string, PickedPerson>>(
    () =>
      new Map(
        from?.audience === "users"
          ? from.targets
              .filter(target => target.userId)
              .map(target => [personKey(target.tenantId, target.userId!), { id: target.userId!, tenantId: target.tenantId, name: target.userName ?? `#${target.userId}`, tenantName: target.tenantName ?? "" }])
          : []
      )
  );
  const [scheduled, setScheduled] = useState(Boolean(editing));
  const [publishAt, setPublishAt] = useState(editing ? toLocalInputValue(editing.publishAt) : "");
  const [hasExpiry, setHasExpiry] = useState(Boolean(editing?.expiresAt));
  const [expiresAt, setExpiresAt] = useState(editing?.expiresAt ? toLocalInputValue(editing.expiresAt) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const serverErrors = fieldErrorsOf(mutation.error);
  const shownErrors: Record<string, string | undefined> = { ...serverErrors, ...errors };

  function touch(field: string) {
    if (errors[field]) setErrors(current => ({ ...current, [field]: "" }));
    if (mutation.error) mutation.reset();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Title is required.";
    if (!body.trim()) next.body = "Message is required.";
    if (audience === "tenants" && !tenantIds.size) next.tenantIds = "Choose at least one tenant.";
    if (audience === "users" && !people.size) next.userIds = "Choose at least one person.";
    const publishIso = scheduled ? fromLocalInputValue(publishAt) : null;
    if (scheduled && !publishIso) next.publishAt = "Choose when to publish.";
    else if (publishIso && publishIso <= new Date().toISOString()) next.publishAt = "Pick a time in the future, or publish now.";
    const expiresIso = hasExpiry ? fromLocalInputValue(expiresAt) : null;
    if (hasExpiry && !expiresIso) next.expiresAt = "Choose when it stops showing.";
    else if (expiresIso && expiresIso <= (publishIso ?? new Date().toISOString())) next.expiresAt = "The expiry must be after the publish time.";
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    const input: BroadcastInput = {
      kind,
      severity,
      title: title.trim(),
      body: body.trim(),
      audience,
      recipients,
      tenantIds: audience === "tenants" ? [...tenantIds] : [],
      userIds: [],
      users: audience === "users" ? [...people.values()].map(person => ({ tenantId: person.tenantId, userId: person.id })) : [],
      publishAt: publishIso,
      expiresAt: expiresIso,
    };
    const done = (state: string) => {
      toast.success(state === "scheduled" ? "Announcement scheduled" : "Announcement published", state === "scheduled" ? "It goes out at the chosen time." : "Recipients see it now.");
      onClose();
    };
    if (editing) update.mutate({ id: editing.id, input }, { onSuccess: result => done(result.state) });
    else create.mutate(input, { onSuccess: result => done(result.state) });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title={editing ? "Edit scheduled announcement" : source?.mode === "duplicate" ? "Duplicate announcement" : "New announcement"}
      description="Shown in each recipient's workspace under “From your provider”; warnings and critical messages also appear as a banner."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="broadcast-form" loading={mutation.isPending}>
            {editing ? "Save changes" : scheduled ? "Schedule" : "Publish now"}
          </Button>
        </>
      }
    >
      <form id="broadcast-form" onSubmit={handleSubmit} noValidate className="flex min-w-0 flex-col gap-5">
        <FormAlert message={formErrorOf(mutation.error)} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="Kind" id="broadcast-kind" value={kind} options={KIND_OPTIONS} onChange={event => setKind(event.target.value as BroadcastInput["kind"])} />
          <SelectField label="Severity" id="broadcast-severity" value={severity} options={SEVERITY_OPTIONS} onChange={event => setSeverity(event.target.value as BroadcastSeverity)} />
        </div>
        <TextField
          label="Title"
          id="broadcast-title"
          required
          maxLength={TITLE_MAX}
          value={title}
          error={shownErrors.title}
          hint={`${title.length} / ${TITLE_MAX}`}
          onChange={event => {
            setTitle(event.target.value);
            touch("title");
          }}
        />
        <TextAreaField
          label="Message"
          id="broadcast-body"
          required
          rows={5}
          maxLength={BODY_MAX}
          value={body}
          error={shownErrors.body}
          hint={`${body.length} / ${BODY_MAX}`}
          onChange={event => {
            setBody(event.target.value);
            touch("body");
          }}
        />

        <Fieldset legend="Audience" error={shownErrors.tenantIds || shownErrors.userIds}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Choice name="broadcast-audience" value="all" checked={audience === "all"} onChange={() => setAudience("all")} label="All tenants" hint="Every workspace" />
            <Choice name="broadcast-audience" value="tenants" checked={audience === "tenants"} onChange={() => setAudience("tenants")} label="Chosen tenants" hint="Pick workspaces" />
            <Choice name="broadcast-audience" value="users" checked={audience === "users"} onChange={() => setAudience("users")} label="Individual people" hint="Pick admins or users" />
          </div>
          {audience === "tenants" && (
            <TenantPicker
              value={tenantIds}
              onChange={next => {
                setTenantIds(next);
                touch("tenantIds");
              }}
            />
          )}
          {audience === "users" && (
            <PeoplePicker
              value={people}
              onChange={next => {
                setPeople(next);
                touch("userIds");
              }}
            />
          )}
        </Fieldset>

        {audience !== "users" && (
          <Fieldset legend="Recipients in each tenant">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Choice name="broadcast-recipients" value="admins" checked={recipients === "admins"} onChange={() => setRecipients("admins")} label="Tenant admins only" hint="Owners and people who manage users" />
              <Choice name="broadcast-recipients" value="everyone" checked={recipients === "everyone"} onChange={() => setRecipients("everyone")} label="Everyone" hint="Every active user" />
            </div>
          </Fieldset>
        )}

        <Fieldset legend="Schedule">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Choice name="broadcast-schedule" value="now" checked={!scheduled} onChange={() => setScheduled(false)} label="Publish now" />
            <Choice name="broadcast-schedule" value="later" checked={scheduled} onChange={() => setScheduled(true)} label="At a time" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {scheduled ? (
              <TextField
                label="Publish at"
                id="broadcast-publish-at"
                type="datetime-local"
                value={publishAt}
                error={shownErrors.publishAt}
                onChange={event => {
                  setPublishAt(event.target.value);
                  touch("publishAt");
                }}
              />
            ) : (
              <span className="hidden sm:block" />
            )}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={hasExpiry}
                  onChange={event => {
                    setHasExpiry(event.target.checked);
                    touch("expiresAt");
                  }}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                Stop showing it at a time
              </label>
              {hasExpiry && (
                <TextField
                  label="Expires at"
                  id="broadcast-expires-at"
                  type="datetime-local"
                  value={expiresAt}
                  error={shownErrors.expiresAt}
                  onChange={event => {
                    setExpiresAt(event.target.value);
                    touch("expiresAt");
                  }}
                />
              )}
            </div>
          </div>
        </Fieldset>
      </form>
    </Dialog>
  );
}

const searchClass =
  "h-9 w-full rounded-lg border border-input bg-card pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SearchBox({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={label} className={searchClass} />
    </label>
  );
}

/** Multi-select of live tenants (checkbox list with a filter). */
function TenantPicker({ value, onChange }: { value: Set<number>; onChange: (next: Set<number>) => void }) {
  const { data, isPending } = useTenants("live");
  const [term, setTerm] = useState("");
  const tenants = (data?.tenants ?? []).filter(tenant => !term.trim() || tenant.name.toLowerCase().includes(term.trim().toLowerCase()) || tenant.slug.includes(term.trim().toLowerCase()));
  const toggle = (id: number) => {
    const next = new Set(value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-2 rounded-xl border p-3" data-testid="tenant-picker">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{value.size} chosen</p>
        {value.size > 0 && (
          <button type="button" onClick={() => onChange(new Set())} className="text-xs font-medium text-primary hover:underline">
            Clear
          </button>
        )}
      </div>
      <SearchBox value={term} onChange={setTerm} label="Find tenants" />
      <ul className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2" aria-label="Tenants">
        {isPending && <li className="text-sm text-muted-foreground">Loading…</li>}
        {tenants.map(tenant => (
          <li key={tenant.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              <input type="checkbox" checked={value.has(tenant.id)} onChange={() => toggle(tenant.id)} className="h-4 w-4 shrink-0 rounded border-input accent-primary" />
              <span className="min-w-0 flex-1 truncate">{tenant.name}</span>
              {tenant.status !== "active" && <Badge tone="danger">Suspended</Badge>}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Pick a tenant, then its admins or users; the picks from several tenants add up. */
function PeoplePicker({ value, onChange }: { value: Map<string, PickedPerson>; onChange: (next: Map<string, PickedPerson>) => void }) {
  const tenantsQuery = useTenants("live");
  const tenants = tenantsQuery.data?.tenants ?? [];
  const [tenantId, setTenantId] = useState<number | undefined>(undefined);
  const peopleQuery = useTenantPeople(tenantId);
  const [term, setTerm] = useState("");
  const tenant = tenants.find(item => item.id === tenantId);
  const people = (peopleQuery.data ?? []).filter(person => person.isActive && (!term.trim() || `${person.name} ${person.email}`.toLowerCase().includes(term.trim().toLowerCase())));

  function toggle(person: { id: number; name: string }) {
    if (!tenantId) return;
    const next = new Map(value);
    const key = personKey(tenantId, person.id);
    if (next.has(key)) next.delete(key);
    else next.set(key, { id: person.id, tenantId, name: person.name, tenantName: tenant?.name ?? "" });
    onChange(next);
  }

  function remove(person: PickedPerson) {
    const next = new Map(value);
    next.delete(personKey(person.tenantId, person.id));
    onChange(next);
  }

  function addAdmins() {
    if (!tenantId) return;
    const next = new Map(value);
    for (const person of peopleQuery.data ?? []) if (person.isActive && person.isAdmin) next.set(personKey(tenantId, person.id), { id: person.id, tenantId, name: person.name, tenantName: tenant?.name ?? "" });
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-3" data-testid="people-picker">
      {value.size > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Chosen people">
          {[...value.values()].map(person => (
            <li key={personKey(person.tenantId, person.id)}>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent py-0.5 pl-2.5 pr-1 text-xs font-medium text-accent-foreground">
                {person.name}
                {person.tenantName && <span className="opacity-70">· {person.tenantName}</span>}
                <button type="button" onClick={() => remove(person)} aria-label={`Remove ${person.name}`} className="rounded-full p-0.5 hover:bg-background/60">
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <SelectField
        label="Tenant"
        id="broadcast-people-tenant"
        value={tenantId ? String(tenantId) : ""}
        options={[{ value: "", label: tenantsQuery.isPending ? "Loading…" : "Choose a tenant" }, ...tenants.map(item => ({ value: String(item.id), label: item.name }))]}
        onChange={event => {
          setTenantId(Number(event.target.value) || undefined);
          setTerm("");
        }}
      />
      {tenantId && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <SearchBox value={term} onChange={setTerm} label="Find people" />
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addAdmins} disabled={!peopleQuery.data?.some(person => person.isAdmin)}>
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Add all admins
            </Button>
          </div>
          <ul className="flex max-h-56 flex-col gap-0.5 overflow-y-auto" aria-label={`People in ${tenant?.name ?? "the tenant"}`}>
            {peopleQuery.isPending && <li className="text-sm text-muted-foreground">Loading…</li>}
            {!peopleQuery.isPending && !people.length && <li className="text-sm text-muted-foreground">No active people match.</li>}
            {people.map(person => (
              <li key={person.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                  <input type="checkbox" checked={tenantId ? value.has(personKey(tenantId, person.id)) : false} onChange={() => toggle(person)} className="h-4 w-4 shrink-0 rounded border-input accent-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{person.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{person.email}</span>
                  </span>
                  {person.isAdmin && <Badge tone="primary">Admin</Badge>}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
