"use client";
// Feature component: the workspace's restrictions — password rules, how long sign-ins last, which email domains
// accounts may use, and which licensed modules are switched on. The server enforces every one of them.
import { useEffect, useState, type FormEvent } from "react";
import { MODULES } from "@/app-shell/modules";
import { FormAlert, LoadingState, ErrorState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import type { FeatureKey, WorkspaceSettings } from "@/types/session";
import { useUpdateWorkspaceSettings, useWorkspaceSettings } from "../hooks/useWorkspace";

type Security = WorkspaceSettings["security"];

/** Mirrors the server's SESSION_HOUR_CHOICES (services/moduleSettings.js). */
const SESSION_OPTIONS = [
  { value: "8", label: "8 hours (a working day)" },
  { value: "12", label: "12 hours" },
  { value: "24", label: "1 day" },
  { value: "72", label: "3 days" },
  { value: "168", label: "7 days" },
  { value: "336", label: "14 days" },
  { value: "720", label: "30 days" },
];

const DOMAIN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

const parseDomains = (text: string) => [...new Set(text.split(/[\s,;]+/).map(item => item.trim().toLowerCase().replace(/^@/, "")).filter(Boolean))];

export interface SecuritySettingsPanelProps {
  /** Called when the form gains or loses unsaved changes */
  onDirtyChange?: (dirty: boolean) => void;
}

export function SecuritySettingsPanel({ onDirtyChange }: SecuritySettingsPanelProps = {}) {
  const { data, isPending, error, refetch } = useWorkspaceSettings();
  if (isPending) return <LoadingState label="Loading restrictions…" className="py-8" />;
  if (error || !data) return <ErrorState message="Unable to load your workspace's restrictions." onRetry={() => void refetch()} />;
  // Keyed by the saved values: the form starts over from them after every save.
  return <SecurityForm key={JSON.stringify(data.settings.security)} security={data.settings.security} licensed={data.licensed} onDirtyChange={onDirtyChange} />;
}

const ACTIVE_SESSION_OPTIONS = [
  { value: "", label: "Unlimited concurrent sessions" },
  { value: "1", label: "1 session (strict single device)" },
  { value: "2", label: "2 concurrent sessions" },
  { value: "3", label: "3 concurrent sessions" },
  { value: "5", label: "5 concurrent sessions" },
  { value: "10", label: "10 concurrent sessions" },
];

function SecurityForm({ security, licensed, onDirtyChange }: { security: Security; licensed: FeatureKey[]; onDirtyChange?: (dirty: boolean) => void }) {
  const toast = useToast();
  const update = useUpdateWorkspaceSettings();
  const [minLength, setMinLength] = useState(String(security.passwordMinLength));
  const [requireMixed, setRequireMixed] = useState(security.passwordRequireMixed);
  const [sessionHours, setSessionHours] = useState(String(security.sessionHours));
  const [maxActiveSessions, setMaxActiveSessions] = useState(security.maxActiveSessions != null ? String(security.maxActiveSessions) : "");
  const [allowCodeLogin, setAllowCodeLogin] = useState(security.allowCodeLogin !== false);
  const [domains, setDomains] = useState(security.allowedEmailDomains.join(", "));
  const [enabled, setEnabled] = useState<FeatureKey[]>(licensed.filter(key => !security.disabledModules.includes(key)));
  const [errors, setErrors] = useState<{ minLength?: string; domains?: string; modules?: string }>({});
  const serverErrors = fieldErrorsOf(update.error);
  const dirty =
    minLength !== String(security.passwordMinLength) ||
    requireMixed !== security.passwordRequireMixed ||
    sessionHours !== String(security.sessionHours) ||
    maxActiveSessions !== (security.maxActiveSessions != null ? String(security.maxActiveSessions) : "") ||
    allowCodeLogin !== (security.allowCodeLogin !== false) ||
    parseDomains(domains).join() !== security.allowedEmailDomains.join() ||
    [...enabled].sort().join() !== licensed.filter(key => !security.disabledModules.includes(key)).sort().join();

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [onDirtyChange, dirty]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  function toggleModule(key: FeatureKey) {
    setEnabled(current => (current.includes(key) ? current.filter(item => item !== key) : [...current, key]));
    setErrors(current => ({ ...current, modules: undefined }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (update.isPending) return;
    const next: typeof errors = {};
    const length = Number(minLength);
    if (!Number.isInteger(length) || length < 8 || length > 64) next.minLength = "Use a whole number from 8 to 64.";
    const domainList = parseDomains(domains);
    const bad = domainList.find(item => !DOMAIN.test(item));
    if (bad) next.domains = `"${bad}" isn't a domain. Use domains like example.com.`;
    else if (domainList.length > 20) next.domains = "Use at most 20 domains.";
    if (!enabled.length) next.modules = "Keep at least one module switched on.";
    setErrors(next);
    if (Object.keys(next).length) return;

    update.mutate(
      {
        security: {
          passwordMinLength: length,
          passwordRequireMixed: requireMixed,
          sessionHours: Number(sessionHours),
          maxActiveSessions: maxActiveSessions ? Number(maxActiveSessions) : null,
          allowCodeLogin,
          allowedEmailDomains: domainList,
          disabledModules: licensed.filter(key => !enabled.includes(key)),
        },
      },
      { onSuccess: () => toast.success("Restrictions saved", "They apply to everyone in your workspace right away.") }
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-2xl flex-col gap-6">
      <FormAlert message={serverErrors.security ?? formErrorOf(update.error)} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold">Passwords</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Minimum length"
            type="number"
            inputMode="numeric"
            min={8}
            max={64}
            value={minLength}
            error={errors.minLength}
            hint="For new passwords: chosen, temporary, and reset-link ones."
            onChange={event => {
              setMinLength(event.target.value);
              setErrors(current => ({ ...current, minLength: undefined }));
            }}
          />
          <label className="flex items-start gap-2 pt-7 text-sm">
            <input type="checkbox" checked={requireMixed} onChange={event => setRequireMixed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
            <span>
              Require letters and numbers
              <span className="block text-xs text-muted-foreground">Existing passwords keep working until they&apos;re changed.</span>
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold">Sign-in &amp; Active Sessions</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Sessions last"
            options={SESSION_OPTIONS}
            value={sessionHours}
            hint="After this, people sign in again. Shortening it also ends older sessions."
            onChange={event => setSessionHours(event.target.value)}
          />
          <SelectField
            label="Max active sessions per user"
            options={ACTIVE_SESSION_OPTIONS}
            value={maxActiveSessions}
            hint="When exceeded on a new device, the oldest session is automatically ended."
            onChange={event => setMaxActiveSessions(event.target.value)}
          />
          <TextField
            label="Allowed email domains"
            placeholder="example.com, example.in"
            value={domains}
            error={errors.domains}
            className="sm:col-span-2"
            hint="New and imported accounts must use one of these. Leave empty to allow any."
            onChange={event => {
              setDomains(event.target.value);
              setErrors(current => ({ ...current, domains: undefined }));
            }}
          />
          <label className="flex items-start gap-2 pt-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={allowCodeLogin}
              onChange={event => setAllowCodeLogin(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span>
              Enable login with access codes &amp; security PINs
              <span className="block text-xs text-muted-foreground">
                Allows tenant members to sign in directly with their personal login access code or workspace PIN.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3" aria-describedby={errors.modules ? "security-modules-error" : undefined}>
        <legend className="mb-1 text-sm font-semibold">Modules</legend>
        <p className="text-sm text-muted-foreground">
          Your plan includes these modules. Switch off the ones your company doesn&apos;t use: they disappear for everyone and their data is kept, so you can switch them back on any time.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {licensed.map(key => {
            const meta = MODULES[key];
            const Icon = meta?.icon;
            return (
              <li key={key}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm hover:bg-muted/50">
                  <input type="checkbox" checked={enabled.includes(key)} onChange={() => toggleModule(key)} className="h-4 w-4 accent-primary" />
                  {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                  <span className="flex-1">{meta?.label ?? key}</span>
                  {!enabled.includes(key) && <span className="text-xs text-muted-foreground">Off</span>}
                </label>
              </li>
            );
          })}
        </ul>
        {errors.modules && (
          <p id="security-modules-error" className="text-sm text-destructive">
            {errors.modules}
          </p>
        )}
      </fieldset>

      <div>
        <Button type="submit" loading={update.isPending}>
          Save restrictions
        </Button>
      </div>
    </form>
  );
}
