"use client";
// Tenant form → Database: where a workspace's data lives. A new tenant goes in the platform database (shared, the
// default) or a database of its own on SQLite, PostgreSQL, MySQL, or MariaDB; a dedicated database gets only the tables
// of the chosen modules (listed below with their links). An existing tenant shows its database; a dedicated one can
// update its connection details.
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Server } from "lucide-react";
import { LoadingState } from "@/components/shared/States";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { FeatureKey } from "@/types/session";
import { useDatabases, useTenantDatabase } from "../hooks/useAdmin";
import type { DatabaseConfigInput, DatabaseConfigView } from "../services/adminService";
import { DatabaseConfigFields, FALLBACK_ENGINES } from "./DatabaseConfigFields";
import { ModuleTablesPreview } from "./ModuleTablesPreview";

export interface DatabaseFormValue {
  mode: "platform" | "dedicated";
  config: DatabaseConfigInput;
  createDatabase: boolean;
  /** Editing: the connection details were changed (only then are they sent) */
  changed: boolean;
}

/** A saved connection as editable values (the password field starts empty: it keeps the saved one). */
export function configFromView(view: DatabaseConfigView): DatabaseConfigInput {
  if (view.client === "sqlite") return { client: "sqlite", filename: view.filename };
  return { client: view.client, host: view.host, port: view.port, database: view.database, user: view.user, password: "", ssl: view.ssl };
}

function ModeCard({ selected, onSelect, icon: Icon, title, text, name, value }: { selected: boolean; onSelect: () => void; icon: typeof Database; title: string; text: string; name: string; value: string }) {
  return (
    <label className={cn("flex min-w-0 cursor-pointer gap-3 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-ring", selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/60")}>
      <input type="radio" name={name} value={value} checked={selected} onChange={onSelect} className="sr-only" />
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{text}</span>
      </span>
    </label>
  );
}

export interface TenantDatabaseFieldProps {
  value: DatabaseFormValue;
  onChange: (value: DatabaseFormValue) => void;
  features: FeatureKey[];
  /** The tenant being edited (null: a new tenant) */
  tenantId?: number | null;
  slug: string;
  errors?: Record<string, string | undefined>;
}

export function TenantDatabaseField({ value, onChange, features, tenantId = null, slug, errors = {} }: TenantDatabaseFieldProps) {
  const databases = useDatabases();
  const current = useTenantDatabase(tenantId ?? undefined);
  const [editing, setEditing] = useState(false);
  const engines = databases.data?.engines ?? FALLBACK_ENGINES;
  const platformLabel = databases.data?.platform.label ?? "the platform database";

  if (tenantId) {
    if (current.isPending) return <LoadingState label="Loading the tenant's database…" className="py-8" />;
    const info = current.data;
    return (
      <div className="flex min-w-0 flex-col gap-5">
        {info && (
          <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border bg-muted/30 p-4">
            <Database className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold wrap-break-word">{info.mode === "dedicated" ? info.label : `Platform database (${platformLabel})`}</p>
              <p className="text-xs text-muted-foreground">{info.mode === "dedicated" ? "This tenant's own database: only its modules' tables." : "Shared with the other tenants on the platform database."}</p>
            </div>
            {info.status === "ok" ? (
              <Badge tone="success">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Connected
              </Badge>
            ) : (
              <Badge tone="danger">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Unreachable
              </Badge>
            )}
            {info.error && <p className="w-full text-xs text-destructive wrap-break-word">{info.error}</p>}
          </div>
        )}
        {info?.mode === "dedicated" && info.config && (
          <div className="flex min-w-0 flex-col gap-3">
            {!editing ? (
              <button
                type="button"
                className="self-start text-sm font-medium text-primary hover:underline"
                onClick={() => {
                  setEditing(true);
                  onChange({ ...value, mode: "dedicated", config: configFromView(info.config!), changed: true });
                }}
              >
                Change connection details
              </button>
            ) : (
              <fieldset className="flex min-w-0 flex-col gap-3 rounded-xl border p-4">
                <legend className="px-1 text-sm font-medium">Connection details</legend>
                <p className="text-xs text-muted-foreground">For a database that was moved or got new credentials. It must already hold this tenant&apos;s data.</p>
                <DatabaseConfigFields value={value.config} onChange={config => onChange({ ...value, config, changed: true })} engines={engines} errors={errors} savedPassword tenantId={tenantId} lockEngine />
                <button
                  type="button"
                  className="self-start text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setEditing(false);
                    onChange({ ...value, changed: false });
                  }}
                >
                  Keep the current connection
                </button>
              </fieldset>
            )}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-2">
          <h3 className="text-sm font-semibold">Tables for its modules</h3>
          <ModuleTablesPreview features={features} existing={info?.mode === "dedicated" ? info.tables.filter(name => !info.missing?.includes(name)) : undefined} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-medium">Where this workspace&apos;s data lives</legend>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ModeCard name="tenant-db-mode" value="platform" selected={value.mode === "platform"} onSelect={() => onChange({ ...value, mode: "platform" })} icon={Server} title="Platform database" text={`Shared with other tenants (${platformLabel}). Nothing to set up.`} />
          <ModeCard name="tenant-db-mode" value="dedicated" selected={value.mode === "dedicated"} onSelect={() => onChange({ ...value, mode: "dedicated" })} icon={Database} title="Its own database" text="SQLite, PostgreSQL, MySQL, or MariaDB. Only the tables its modules need." />
        </div>
      </fieldset>
      {value.mode === "dedicated" && (
        <div className="flex min-w-0 flex-col gap-3 rounded-xl border p-4">
          <DatabaseConfigFields value={value.config} onChange={config => onChange({ ...value, config })} engines={engines} errors={errors} name={slug} createDatabase={value.createDatabase} />
          {value.config.client !== "sqlite" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={value.createDatabase} onChange={event => onChange({ ...value, createDatabase: event.target.checked })} className="h-4 w-4 rounded border-input accent-primary" />
              Create the database if it doesn&apos;t exist
            </label>
          )}
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-2">
        <h3 className="text-sm font-semibold">{value.mode === "dedicated" ? "Tables created for the selected modules" : "Tables the selected modules use"}</h3>
        <ModuleTablesPreview features={features} />
      </div>
    </div>
  );
}
