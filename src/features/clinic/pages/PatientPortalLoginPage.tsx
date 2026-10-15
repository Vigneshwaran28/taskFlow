"use client";
// /<workspace>/patient/login: patients sign in with the patient number and PIN from their patient card. A separate
// sign-in from staff accounts. Already signed in: straight to the portal.
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { KeyRound, LogIn, Stethoscope } from "lucide-react";
import { Redirect } from "@/app-shell/guards";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { EmptyState, FormAlert, LoadingState } from "@/components/shared/States";
import { usePublicWorkspace } from "@/features/auth";
import { ApiError, fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { usePortalLogin, usePortalSession } from "../hooks/usePatientPortal";

export function PatientPortalLoginPage() {
  const params = useParams<{ tenant: string }>();
  const slug = params.tenant ?? "";
  const workspace = usePublicWorkspace(slug);
  const session = usePortalSession();
  const login = usePortalLogin();
  const [patientNumber, setPatientNumber] = useState("");
  const [pin, setPin] = useState("");
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const errors: Record<string, string | undefined> = { ...fieldErrorsOf(login.error), ...localErrors };

  const clear = (key: string) =>
    setLocalErrors(current => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });

  if (workspace.isPending || session.isPending) return <LoadingState className="min-h-screen" />;
  if (session.data) return <Redirect to="/patient" />;
  const unavailable = workspace.error instanceof ApiError && workspace.error.status === 404;
  const noClinic = workspace.data && !workspace.data.features.includes("clinic");
  const clinicName = workspace.data?.companyName || workspace.data?.siteTitle || "Patient portal";

  function submit(event: FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};
    const number = patientNumber.replace(/[\s-]/g, "");
    if (!/^[1-9]\d{7}$/.test(number)) found.patientNumber = "Enter the 8-digit patient number from your card.";
    if (!/^\d{6}$/.test(pin)) found.pin = "Enter your 6-digit PIN.";
    setLocalErrors(found);
    if (Object.keys(found).length) return;
    login.mutate({ patientNumber: number, pin }, { onError: () => setPin("") });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <main className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="rounded-2xl bg-primary p-3 text-primary-foreground">
            <Stethoscope className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{clinicName}</h1>
          <p className="text-sm text-muted-foreground">Patient portal: your token, your turn, and your prescriptions.</p>
        </div>
        {unavailable || noClinic ? (
          <EmptyState title="No patient portal here" message="Check the address on your patient card or token slip, or ask at the reception desk." icon={KeyRound} />
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm">
            {Object.keys(localErrors).length === 0 && <FormAlert message={formErrorOf(login.error)} />}
            <TextField
              label="Patient number"
              required
              inputMode="numeric"
              autoComplete="username"
              placeholder="e.g. 1234 5678"
              value={patientNumber}
              onChange={event => {
                setPatientNumber(event.target.value);
                clear("patientNumber");
              }}
              error={errors.patientNumber}
              hint="On your patient card and token slip."
              autoFocus
            />
            <TextField
              label="PIN"
              required
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={6}
              value={pin}
              onChange={event => {
                setPin(event.target.value.replace(/\D/g, "").slice(0, 6));
                clear("pin");
              }}
              error={errors.pin}
            />
            <Button type="submit" loading={login.isPending} className="w-full">
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Sign in
            </Button>
            <p className="text-center text-xs text-muted-foreground">Forgot your PIN? Ask at the reception desk for a new one.</p>
          </form>
        )}
      </main>
    </div>
  );
}
