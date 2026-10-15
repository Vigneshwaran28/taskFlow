"use client";
// Console → Databases: the platform database (engine, version, last move), moving it to another engine or server, and
// where every tenant's data lives.
import { useState, type FormEvent } from "react";
import { ArrowRightLeft, CheckCircle2, Database, HardDrive, Server, ShieldAlert } from "lucide-react";
import { ErrorState, FormAlert, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/dates";
import { useDatabases, useSwitchPlatformDatabase } from "../hooks/useAdmin";
import type { DatabaseConfigInput } from "../services/adminService";
import { DatabaseConfigFields, defaultConfig, validateDatabaseConfig } from "./DatabaseConfigFields";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm wrap-break-word">{children}</dd>
    </div>
  );
}

export function DatabasesView({ onOpenTenant }: { onOpenTenant: (id: number) => void }) {
  const toast = useToast();
  const query = useDatabases();
  const switchDb = useSwitchPlatformDatabase();
  const [target, setTarget] = useState<DatabaseConfigInput>(() => defaultConfig("postgres", "platform"));
  const [createDatabase, setCreateDatabase] = useState(true);
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (query.isPending) return <LoadingState label="Loading databases…" />;
  if (query.error) return <ErrorState message={`Unable to load databases: ${query.error.message}`} onRetry={() => void query.refetch()} />;
  const { platform, engines, tenants } = query.data;
  const dedicated = tenants.filter(tenant => tenant.mode === "dedicated" && !tenant.deleted);
  const serverErrors = fieldErrorsOf(switchDb.error);

  function handleSwitch(event: FormEvent) {
    event.preventDefault();
    const next = validateDatabaseConfig(target);
    if (confirm.trim() !== "SWITCH") next.confirm = "Type SWITCH to confirm.";
    setErrors(next);
    if (Object.keys(next).length) return;
    switchDb.mutate(
      { config: target, createDatabase, confirm: "SWITCH" },
      {
        onSuccess: result => {
          setConfirm("");
          toast.success("Platform database moved", `${result.rows.toLocaleString()} rows in ${result.tables} tables copied to ${result.to}.`);
        },
      }
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section aria-labelledby="platform-db-heading" className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Server className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="platform-db-heading" className="text-base font-semibold">
              Platform database
            </h2>
            <p className="text-sm text-muted-foreground">The tenant registry, the console&apos;s records, and every tenant without a database of its own.</p>
          </div>
          {platform.switching ? <Badge tone="warning">Moving to {platform.switching.to}…</Badge> : <Badge tone="success">In use</Badge>}
        </div>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Engine">{platform.config.label}</Fact>
          <Fact label="Location">{platform.label}</Fact>
          <Fact label="Version">{platform.version ?? "—"}</Fact>
          <Fact label="Last moved">{platform.switchedAt ? `${formatDateTime(platform.switchedAt)}${platform.previous ? ` (from ${platform.previous})` : ""}` : "Never"}</Fact>
        </dl>
      </section>

      <section aria-labelledby="switch-db-heading" className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <ArrowRightLeft className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <h2 id="switch-db-heading" className="text-base font-semibold">
              Move the platform database
            </h2>
            <p className="text-sm text-muted-foreground">
              Copies every table and row to an empty database on another engine or server, checks the copy, and switches to it without a restart. The current
              database is left as it is (a fallback). Workspaces pause while the copy runs; tenants with their own database are not moved.
            </p>
          </div>
        </div>
        <form onSubmit={handleSwitch} noValidate className="flex min-w-0 flex-col gap-4">
          <FormAlert message={formErrorOf(switchDb.error)} />
          <DatabaseConfigFields
            value={target}
            onChange={next => {
              setTarget(next);
              setErrors({});
              if (switchDb.error) switchDb.reset();
            }}
            engines={engines}
            errors={{ ...serverErrors, ...errors }}
            name="platform"
            createDatabase={createDatabase}
          />
          {target.client !== "sqlite" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={createDatabase} onChange={event => setCreateDatabase(event.target.checked)} className="h-4 w-4 rounded border-input accent-primary" />
              Create the database if it doesn&apos;t exist
            </label>
          )}
          <div className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 sm:flex-row sm:items-end">
            <p className="flex min-w-0 flex-1 items-start gap-2 text-sm">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <span>Take a backup first. Everyone is paused for the copy (usually under a minute).</span>
            </p>
            <TextField label="Type SWITCH to confirm" id="switch-confirm" className="w-full sm:w-48" autoCapitalize="characters" value={confirm} error={errors.confirm ?? serverErrors.confirm} onChange={event => setConfirm(event.target.value)} />
            <Button type="submit" loading={switchDb.isPending} className="w-full sm:w-auto">
              Move database
            </Button>
          </div>
          {switchDb.data && (
            <p role="status" className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Now running on {switchDb.data.to} ({switchDb.data.version}).
            </p>
          )}
        </form>
      </section>

      <section aria-labelledby="tenant-db-heading" className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="tenant-db-heading" className="text-base font-semibold">
            Tenant databases
          </h2>
          <p className="text-sm text-muted-foreground">
            {dedicated.length} of {tenants.filter(tenant => !tenant.deleted).length} tenants have their own database. Choose it when creating a tenant (Database tab).
          </p>
        </div>
        {tenants.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No tenants yet.</p>
        ) : (
          <ul className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {tenants.map(tenant => (
              <li key={tenant.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => onOpenTenant(tenant.id)}
                  disabled={tenant.deleted}
                  className="flex w-full min-w-0 items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  {tenant.mode === "dedicated" ? <Database className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /> : <HardDrive className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{tenant.name}</span>
                    <span className="block truncate text-xs text-muted-foreground" title={tenant.label}>
                      {tenant.label}
                    </span>
                  </span>
                  <Badge tone={tenant.mode === "dedicated" ? "primary" : "neutral"}>{tenant.deleted ? "Recycle bin" : tenant.mode === "dedicated" ? "Own" : "Shared"}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
