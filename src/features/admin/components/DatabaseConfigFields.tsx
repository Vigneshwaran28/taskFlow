"use client";
// A database connection form: the engine (SQLite, PostgreSQL, MySQL, MariaDB), its settings, and a connection test.
// Used for a tenant's own database and for moving the platform database.
import { useId } from "react";
import { CheckCircle2, Database, PlugZap, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { useTestDatabase } from "../hooks/useAdmin";
import type { DatabaseClient, DatabaseConfigInput, DatabaseEngine } from "../services/adminService";

/** What a server-side engine looks like before the console has loaded the list. */
export const FALLBACK_ENGINES: DatabaseEngine[] = [
  { key: "sqlite", label: "SQLite", defaultPort: null, note: "A file on this server. No database server needed.", available: true },
  { key: "postgres", label: "PostgreSQL", defaultPort: 5432, note: "PostgreSQL 12 or newer.", available: true },
  { key: "mysql", label: "MySQL", defaultPort: 3306, note: "MySQL 8.0.16 or newer.", available: true },
  { key: "mariadb", label: "MariaDB", defaultPort: 3306, note: "MariaDB 10.5 or newer.", available: true },
];

/** A starting connection for an engine (SQLite: a file named after the workspace). */
export function defaultConfig(client: DatabaseClient, name = "tenant", previous?: DatabaseConfigInput): DatabaseConfigInput {
  if (client === "sqlite") return { client, filename: `data/tenants/${name || "tenant"}.db` };
  const port = client === "postgres" ? 5432 : 3306;
  const server = previous && previous.client !== "sqlite" ? previous : null;
  return {
    client,
    host: server?.host ?? "localhost",
    port: server && server.port !== (server.client === "postgres" ? 5432 : 3306) ? server.port : port,
    database: server?.database ?? `taskflow_${(name || "tenant").replace(/[^A-Za-z0-9_]/g, "_")}`,
    user: server?.user ?? (client === "postgres" ? "postgres" : "root"),
    password: server?.password ?? "",
    ssl: server?.ssl ?? false,
  };
}

/** Client-side checks (the server checks the same and more). */
export function validateDatabaseConfig(config: DatabaseConfigInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (config.client === "sqlite") {
    if (!/^[\w./-]+\.(db|sqlite|sqlite3)$/.test(config.filename.trim())) errors["database.filename"] = "Use a relative path ending in .db, .sqlite, or .sqlite3.";
    else if (config.filename.includes("..")) errors["database.filename"] = "The path must stay inside the server folder.";
    return errors;
  }
  if (!config.host.trim()) errors["database.host"] = "Host is required.";
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) errors["database.port"] = "Use a port from 1 to 65535.";
  if (!/^[A-Za-z_][A-Za-z0-9_$-]*$/.test(config.database.trim())) errors["database.database"] = "Use letters, numbers, underscores, and dashes.";
  if (!config.user.trim()) errors["database.user"] = "User is required.";
  return errors;
}

export interface DatabaseConfigFieldsProps {
  value: DatabaseConfigInput;
  onChange: (value: DatabaseConfigInput) => void;
  engines?: DatabaseEngine[];
  /** Field errors keyed database.<field> (server or client) */
  errors?: Record<string, string | undefined>;
  /** For the SQLite file name suggestion */
  name?: string;
  /** Editing a saved connection: an empty password keeps the saved one */
  savedPassword?: boolean;
  /** The tenant whose saved password a test may use */
  tenantId?: number;
  createDatabase?: boolean;
  /** Engines that can't be picked here (editing keeps the engine) */
  lockEngine?: boolean;
}

export function DatabaseConfigFields({ value, onChange, engines = FALLBACK_ENGINES, errors = {}, name, savedPassword = false, tenantId, createDatabase = false, lockEngine = false }: DatabaseConfigFieldsProps) {
  const id = useId();
  const test = useTestDatabase();
  const server = value.client === "sqlite" ? null : value;

  function update(next: DatabaseConfigInput) {
    onChange(next);
    if (test.data || test.error) test.reset();
  }

  function pickEngine(client: DatabaseClient) {
    if (client === value.client) return;
    update(defaultConfig(client, name, value));
  }

  // A failed test highlights the fields it complains about, like a failed save.
  const tested: Record<string, string | undefined> = fieldErrorsOf(test.error);
  const errorOf = (field: string) => errors[`database.${field}`] ?? tested[`database.${field}`];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-medium">Database engine</legend>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {engines.map(engine => {
            const selected = engine.key === value.client;
            const disabled = !engine.available || (lockEngine && !selected);
            return (
              <label
                key={engine.key}
                className={cn(
                  "flex min-w-0 cursor-pointer flex-col gap-1 rounded-xl border p-3 text-left transition-colors focus-within:ring-2 focus-within:ring-ring",
                  selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/60",
                  disabled && "cursor-not-allowed opacity-50"
                )}
              >
                <input type="radio" name={`${id}-engine`} value={engine.key} checked={selected} disabled={disabled} onChange={() => pickEngine(engine.key)} className="sr-only" />
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Database className={cn("h-4 w-4 shrink-0", selected ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                  {engine.label}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:line-clamp-2">{engine.available ? engine.note : "Driver not installed on the server."}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {value.client === "sqlite" ? (
        <TextField
          label="File"
          id={`${id}-file`}
          value={value.filename}
          spellCheck={false}
          autoCapitalize="none"
          hint="Relative to the server folder. A new file is created; an existing one must not hold another workspace."
          error={errorOf("filename")}
          onChange={event => update({ ...value, filename: event.target.value })}
        />
      ) : (
        server && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            <TextField className="sm:col-span-4" label="Host" id={`${id}-host`} value={server.host} spellCheck={false} autoCapitalize="none" error={errorOf("host")} onChange={event => update({ ...server, host: event.target.value })} />
            <TextField
              className="sm:col-span-2"
              label="Port"
              id={`${id}-port`}
              type="number"
              inputMode="numeric"
              min={1}
              max={65535}
              value={String(server.port)}
              error={errorOf("port")}
              onChange={event => update({ ...server, port: Number(event.target.value) })}
            />
            <TextField className="sm:col-span-6" label="Database name" id={`${id}-db`} value={server.database} spellCheck={false} autoCapitalize="none" error={errorOf("database")} onChange={event => update({ ...server, database: event.target.value })} />
            <TextField className="sm:col-span-3" label="User" id={`${id}-user`} value={server.user} spellCheck={false} autoCapitalize="none" autoComplete="off" error={errorOf("user")} onChange={event => update({ ...server, user: event.target.value })} />
            <TextField
              className="sm:col-span-3"
              label="Password"
              id={`${id}-password`}
              type="password"
              autoComplete="new-password"
              value={server.password}
              placeholder={savedPassword ? "Unchanged" : ""}
              hint={savedPassword ? "Leave empty to keep the saved password." : "Stored encrypted on the server."}
              error={errorOf("password")}
              onChange={event => update({ ...server, password: event.target.value })}
            />
            <label className="flex items-center gap-2 text-sm sm:col-span-6">
              <input type="checkbox" checked={server.ssl} onChange={event => update({ ...server, ssl: event.target.checked })} className="h-4 w-4 rounded border-input accent-primary" />
              Use a secure (SSL/TLS) connection
            </label>
          </div>
        )
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" loading={test.isPending} onClick={() => test.mutate({ config: value, createDatabase, tenantId })}>
          <PlugZap className="h-4 w-4" aria-hidden="true" />
          Test connection
        </Button>
        <span role="status" aria-live="polite" className="min-w-0 text-sm">
          {test.data && (
            <span className="flex items-center gap-1.5 text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              Connected: {test.data.version}
              {test.data.createdDatabase ? " (database created)" : ""}
            </span>
          )}
          {test.error && (
            <span className="flex items-start gap-1.5 text-destructive">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="wrap-break-word">{tested.database ?? test.error.message}</span>
            </span>
          )}
        </span>
      </div>
      {errors.database && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive wrap-break-word">
          {errors.database}
        </p>
      )}
    </div>
  );
}
