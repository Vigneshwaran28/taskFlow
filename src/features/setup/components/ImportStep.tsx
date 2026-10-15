"use client";
// Standalone edition, step 2: import the exported workspace into the chosen database (instead of creating a console
// account). Ends on the workspace's sign-in page.
import type { FormEvent } from "react";
import { DatabaseZap } from "lucide-react";
import { FormAlert, LoadingState } from "@/components/shared/States";
import { Button } from "@/components/ui/Button";
import { formErrorOf } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";
import { useCompleteSetup, useImportSummary } from "../hooks/useSetup";
import type { DatabaseSettings, StandaloneEdition } from "../services/setupService";

export interface ImportStepProps {
  edition: StandaloneEdition;
  database: DatabaseSettings;
  createDatabase: boolean;
  /** Short description of the chosen database */
  target: string;
  onBack: () => void;
}

export function ImportStep({ edition, database, createDatabase, target, onBack }: ImportStepProps) {
  const summary = useImportSummary();
  const completeSetup = useCompleteSetup();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (completeSetup.isPending) return;
    completeSetup.mutate(
      { database, createDatabase },
      // A full page load on purpose: the app starts fresh as "configured", on the workspace's sign-in page.
      { onSuccess: result => window.location.assign(result.next ?? `/${edition.slug}/login`) }
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex gap-3 rounded-xl border bg-accent/40 p-4 text-sm">
        <DatabaseZap className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-medium">Import {edition.name}</p>
          {summary.isPending ? (
            <LoadingState label="Reading the export…" />
          ) : summary.error ? (
            <p className="text-destructive">{formErrorOf(summary.error)}</p>
          ) : (
            <p className="text-muted-foreground">
              {summary.data.users} account{summary.data.users === 1 ? "" : "s"} and {summary.data.rows.toLocaleString()} records
              {summary.data.exportedAt ? `, exported ${formatDate(summary.data.exportedAt)}` : ""}, go to{" "}
              <span className="font-medium text-foreground">{target}</span>. The database must be empty: an existing TaskFlow database is never overwritten.
            </p>
          )}
          <p className="text-muted-foreground">
            Afterwards everyone signs in at <span className="break-all font-mono text-foreground">/{edition.slug}/login</span> with their usual password.
          </p>
        </div>
      </div>
      <FormAlert message={formErrorOf(completeSetup.error)} />
      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="secondary" onClick={onBack} disabled={completeSetup.isPending}>
          Back
        </Button>
        <Button type="submit" loading={completeSetup.isPending} disabled={Boolean(summary.error)}>
          {completeSetup.isPending ? "Importing…" : "Import and finish"}
        </Button>
      </div>
    </form>
  );
}
