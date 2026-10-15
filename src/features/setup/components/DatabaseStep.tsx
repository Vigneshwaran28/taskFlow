"use client";
import { useState, type ChangeEvent, type ComponentType } from "react";
import { CheckCircle2, Database, HardDrive, Server, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { useTestConnection } from "../hooks/useSetup";
import type { ConnectionTestResult, DatabaseClient, DatabaseSettings } from "../services/setupService";

/** The database form's values (strings as typed, before conversion). */
export interface DatabaseFormValues {
  client: DatabaseClient;
  filename: string;
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  createDatabase: boolean;
}

type TextKey = "filename" | "host" | "port" | "database" | "user" | "password";
export type DatabaseErrors = Partial<Record<keyof DatabaseFormValues, string>>;
export type TestedConnection = Pick<ConnectionTestResult, "version" | "createdDatabase">;

const ENGINES: { value: DatabaseClient; title: string; icon: ComponentType<{ className?: string }>; description: string }[] = [
  {
    value: "sqlite",
    title: "SQLite",
    icon: HardDrive,
    description: "A single file on this server. Zero configuration: great for personal use and small teams.",
  },
  {
    value: "postgres",
    title: "PostgreSQL / Neon",
    icon: Server,
    description: "Cloud PostgreSQL (Neon, Supabase, RDS) or local server. Best for teams and production.",
  },
];

function parseConnectionString(str: string): Partial<DatabaseFormValues> | null {
  try {
    const raw = str.trim();
    if (!raw.startsWith("postgres://") && !raw.startsWith("postgresql://")) return null;
    const url = new URL(raw);
    return {
      host: url.hostname,
      port: url.port || "5432",
      database: url.pathname.replace(/^\//, ""),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl: true,
    };
  } catch {
    return null;
  }
}

/** Settings form values → API payload. */
export function toDatabasePayload(settings: DatabaseFormValues): DatabaseSettings {
  if (settings.client === "sqlite") return { client: "sqlite", filename: settings.filename.trim() };
  return {
    client: "postgres",
    host: settings.host.trim(),
    port: Number(settings.port),
    database: settings.database.trim(),
    user: settings.user.trim(),
    password: settings.password,
    ssl: settings.ssl,
  };
}

export function validateDatabase(settings: DatabaseFormValues): DatabaseErrors {
  const errors: DatabaseErrors = {};
  if (settings.client === "sqlite") {
    if (!/^[\w./-]+\.(db|sqlite|sqlite3)$/.test(settings.filename.trim()) || settings.filename.includes("..")) {
      errors.filename = "Use a relative path ending in .db, .sqlite, or .sqlite3 (e.g. data/taskflow.db).";
    }
    return errors;
  }
  if (!settings.host.trim()) errors.host = "Host is required.";
  const port = Number(settings.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.port = "Enter a port between 1 and 65535.";
  if (!settings.database.trim()) errors.database = "Database name is required.";
  else if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(settings.database.trim())) errors.database = "Use letters, numbers, and underscores only.";
  if (!settings.user.trim()) errors.user = "User is required.";
  return errors;
}

export interface DatabaseStepProps {
  settings: DatabaseFormValues;
  onChange: <K extends keyof DatabaseFormValues>(name: K, value: DatabaseFormValues[K]) => void;
  errors: DatabaseErrors;
  /** Runs local validation; false cancels the test */
  onBeforeTest: () => boolean;
  onTested: (result: TestedConnection | null) => void;
  tested: TestedConnection | null;
  onNext: () => void;
}

/** Step 1: choose the database engine and verify the connection. */
export function DatabaseStep({ settings, onChange, errors, onBeforeTest, onTested, tested, onNext }: DatabaseStepProps) {
  const [urlInput, setUrlInput] = useState("");
  const [urlDetected, setUrlDetected] = useState<string | null>(null);
  const testConnection = useTestConnection();
  const testError = testConnection.error instanceof ApiError ? testConnection.error.message : testConnection.error ? "Connection test failed." : null;

  function handleTest() {
    if (!onBeforeTest()) return;
    testConnection.mutate(
      { database: toDatabasePayload(settings), createDatabase: settings.client === "postgres" && settings.createDatabase },
      { onSuccess: result => onTested(result) }
    );
  }

  function field(name: TextKey) {
    return {
      name,
      value: settings[name],
      error: errors[name],
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        onChange(name, event.target.value);
        testConnection.reset();
      },
    };
  }

  function toggle(name: "createDatabase" | "ssl") {
    return (event: ChangeEvent<HTMLInputElement>) => {
      onChange(name, event.target.checked);
      testConnection.reset();
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-3 text-sm font-medium">Database engine</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ENGINES.map(engine => {
            const selected = settings.client === engine.value;
            const Icon = engine.icon;
            return (
              <label
                key={engine.value}
                className={cn(
                  "relative flex cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  selected ? "border-primary bg-accent/60" : "hover:bg-muted/60"
                )}
              >
                <input
                  type="radio"
                  name="client"
                  value={engine.value}
                  checked={selected}
                  onChange={() => {
                    onChange("client", engine.value);
                    testConnection.reset();
                  }}
                  className="sr-only"
                />
                <span className="flex items-center gap-2 font-medium">
                  <Icon className={cn("h-5 w-5", selected ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                  {engine.title}
                  {selected && <CheckCircle2 className="ml-auto h-5 w-5 text-primary" aria-hidden="true" />}
                </span>
                <span className="text-sm text-muted-foreground">{engine.description}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {settings.client === "sqlite" ? (
        <TextField label="Database file" hint="Relative to the server folder. Created automatically." {...field("filename")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-6 rounded-xl border border-primary/30 bg-muted/30 p-3.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Quick Connect (Neon / Cloud PostgreSQL)</span>
            </div>
            <TextField
              label="Paste Connection URL (optional)"
              placeholder="postgresql://neondb_owner:password@ep-name.neon.tech/neondb?sslmode=require"
              hint={urlDetected || "Paste your Neon connection string to automatically fill the fields below."}
              value={urlInput}
              autoComplete="off"
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const val = e.target.value;
                setUrlInput(val);
                const parsed = parseConnectionString(val);
                if (parsed) {
                  if (parsed.host) onChange("host", parsed.host);
                  if (parsed.port) onChange("port", parsed.port);
                  if (parsed.database) onChange("database", parsed.database);
                  if (parsed.user) onChange("user", parsed.user);
                  if (parsed.password !== undefined) onChange("password", parsed.password);
                  onChange("ssl", true);
                  setUrlDetected("✓ Successfully parsed Neon connection URL and populated connection fields.");
                  testConnection.reset();
                } else if (!val.trim()) {
                  setUrlDetected(null);
                } else {
                  setUrlDetected("Enter a valid postgresql:// connection string");
                }
              }}
            />
          </div>

          <TextField label="Host" className="sm:col-span-4" autoComplete="off" {...field("host")} />
          <TextField label="Port" className="sm:col-span-2" inputMode="numeric" {...field("port")} />
          <TextField label="Database name" className="sm:col-span-6" {...field("database")} />
          <TextField label="User" className="sm:col-span-3" autoComplete="off" {...field("user")} />
          <TextField label="Password" type="password" className="sm:col-span-3" autoComplete="new-password" {...field("password")} />
          <div className="flex flex-col gap-2 sm:col-span-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.createDatabase} onChange={toggle("createDatabase")} className="h-4 w-4 accent-primary" />
              Create the database if it doesn&apos;t exist
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.ssl} onChange={toggle("ssl")} className="h-4 w-4 accent-primary" />
              Use SSL (required by most cloud providers)
            </label>
          </div>
        </div>
      )}

      {testError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {testError}
        </div>
      )}
      {tested && !testError && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Connected to {tested.version}.{tested.createdDatabase && " The database was created."}
          </span>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="secondary" onClick={handleTest} loading={testConnection.isPending}>
          <Database className="h-4 w-4" aria-hidden="true" />
          Test connection
        </Button>
        <Button onClick={onNext} disabled={!tested}>
          Continue
        </Button>
      </div>
    </div>
  );
}
