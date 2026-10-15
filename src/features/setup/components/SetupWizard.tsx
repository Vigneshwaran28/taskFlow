"use client";
// Feature component: two-step first-run setup (database → provider console account). No workspace is created here:
// the wizard ends in the provider console (/bunny), where the provider creates each tenant and its owner.
import { useState, type ChangeEvent, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { FormAlert } from "@/components/shared/States";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { useCompleteSetup } from "../hooks/useSetup";
import type { StandaloneEdition } from "../services/setupService";
import { ImportStep } from "./ImportStep";
import { DatabaseStep, toDatabasePayload, validateDatabase, type DatabaseErrors, type DatabaseFormValues, type TestedConnection } from "./DatabaseStep";

const INITIAL_SETTINGS: DatabaseFormValues = {
  client: "sqlite",
  filename: "data/taskflow.db",
  host: "localhost",
  port: "5432",
  database: "taskflow",
  user: "postgres",
  password: "",
  ssl: false,
  createDatabase: true,
};

const STEPS = ["Database", "Console account"];
const STANDALONE_STEPS = ["Database", "Import data"];

const EMPTY_ADMIN = { username: "", password: "", confirm: "" };
type AdminValues = typeof EMPTY_ADMIN;
type AdminErrors = Partial<Record<keyof AdminValues, string>>;

/** Mirrors the server's consoleSchema (server/src/routes/setup.js). */
function validateAdmin(values: AdminValues): AdminErrors {
  const errors: AdminErrors = {};
  const username = values.username.trim();
  if (username.length < 3) errors.username = "Use at least 3 characters.";
  else if (!/^[\w.@+-]+$/.test(username)) errors.username = "Use letters, numbers, and . _ @ + - only.";
  if (values.password.length < 10) errors.password = "Use at least 10 characters.";
  if (values.confirm !== values.password) errors.confirm = "Passwords don't match.";
  return errors;
}

export interface SetupWizardProps {
  /** Standalone edition: the second step imports the exported workspace instead of creating a console account */
  edition?: StandaloneEdition | null;
}

export function SetupWizard({ edition = null }: SetupWizardProps) {
  const completeSetup = useCompleteSetup();
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState<DatabaseFormValues>(INITIAL_SETTINGS);
  const [tested, setTested] = useState<TestedConnection | null>(null);
  const [dbErrors, setDbErrors] = useState<DatabaseErrors>({});
  const [admin, setAdmin] = useState<AdminValues>(EMPTY_ADMIN);
  const [adminErrors, setAdminErrors] = useState<AdminErrors>({});

  const errors: Record<string, string | undefined> = { ...fieldErrorsOf(completeSetup.error), ...adminErrors };

  function handleSettingChange<K extends keyof DatabaseFormValues>(name: K, value: DatabaseFormValues[K]) {
    setSettings(current => ({ ...current, [name]: value }));
    setDbErrors(current => ({ ...current, [name]: undefined }));
    setTested(null); // any change requires a new test
  }

  /** Validate locally before hitting the server. */
  function handleBeforeTest() {
    const nextErrors = validateDatabase(settings);
    setDbErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleAdminChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setAdmin(current => ({ ...current, [name]: value }));
    setAdminErrors(current => ({ ...current, [name]: undefined }));
    if (completeSetup.error) completeSetup.reset();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (completeSetup.isPending) return;
    const nextErrors = validateAdmin(admin);
    setAdminErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    completeSetup.mutate(
      {
        database: toDatabasePayload(settings),
        createDatabase: settings.client === "postgres" && settings.createDatabase,
        console: { username: admin.username.trim(), password: admin.password },
      },
      // A full page load on purpose: the app starts fresh as "configured", already signed in to the console.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      { onSuccess: () => window.location.assign("/bunny") }
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <ol className="flex items-center gap-3" aria-label="Setup progress">
        {(edition ? STANDALONE_STEPS : STEPS).map((label, index, steps) => (
          <li key={label} className="flex flex-1 items-center gap-3" aria-current={index === step ? "step" : undefined}>
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                index < step && "bg-primary text-primary-foreground",
                index === step && "border-2 border-primary text-primary",
                index > step && "border-2 text-muted-foreground"
              )}
            >
              {index + 1}
            </span>
            <span className={cn("text-sm font-medium", index === step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            {index < steps.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <DatabaseStep
          settings={settings}
          onChange={handleSettingChange}
          errors={dbErrors}
          tested={tested}
          onBeforeTest={handleBeforeTest}
          onTested={setTested}
          onNext={() => setStep(1)}
        />
      ) : edition ? (
        <ImportStep
          edition={edition}
          database={toDatabasePayload(settings)}
          createDatabase={settings.client === "postgres" && settings.createDatabase}
          target={settings.client === "sqlite" ? `SQLite (${settings.filename})` : `PostgreSQL (${settings.host}/${settings.database})`}
          onBack={() => setStep(0)}
        />
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex gap-3 rounded-xl border bg-accent/40 p-4 text-sm">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <p className="font-medium">The provider console account</p>
              <p className="text-muted-foreground">
                You&apos;ll use it at <span className="font-mono text-foreground">/bunny</span> to create workspaces (tenants), choose their modules and plans, and add each
                one&apos;s owner. No workspace is created here. Data goes to{" "}
                <span className="font-medium text-foreground">{settings.client === "sqlite" ? `SQLite (${settings.filename})` : `PostgreSQL (${settings.host}/${settings.database})`}</span>.
              </p>
            </div>
          </div>
          <FormAlert message={formErrorOf(completeSetup.error)} />
          <TextField label="Username" name="username" autoComplete="username" autoFocus value={admin.username} error={errors.username} onChange={handleAdminChange} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              hint="At least 10 characters."
              value={admin.password}
              error={errors.password}
              onChange={handleAdminChange}
            />
            <TextField label="Confirm password" name="confirm" type="password" autoComplete="new-password" value={admin.confirm} error={errors.confirm} onChange={handleAdminChange} />
          </div>
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="secondary" onClick={() => setStep(0)} disabled={completeSetup.isPending}>
              Back
            </Button>
            <Button type="submit" loading={completeSetup.isPending}>
              Finish and open the console
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
