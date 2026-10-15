"use client";
import { useState, type FormEvent } from "react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/dates";
import { useSetPlatformMaintenance, useSetTenantMaintenance } from "../hooks/useAdmin";
import type { MaintenanceSetting } from "../services/adminService";

export type MaintenanceTarget = { kind: "platform" } | { kind: "tenant"; id: number; name: string };

const DURATIONS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "4 hours", minutes: 240 },
];

/**
 * Feature component: start a maintenance window now or schedule one, for every tenant or one tenant. Mount with a
 * `key` to reset. Ending a window is a separate action (MaintenanceView).
 */
export function MaintenanceDialog({ target, current, onClose }: { target: MaintenanceTarget; current: MaintenanceSetting; onClose: () => void }) {
  const toast = useToast();
  const setPlatform = useSetPlatformMaintenance();
  const setTenant = useSetTenantMaintenance();
  const mutation = target.kind === "platform" ? setPlatform : setTenant;
  const live = current.state === "active" || current.state === "scheduled";
  const [mode, setMode] = useState<"now" | "scheduled">(live && current.state === "scheduled" ? "scheduled" : "now");
  const [message, setMessage] = useState(live ? current.message : "");
  const [startsAt, setStartsAt] = useState(live && current.startsAt ? toLocalInputValue(current.startsAt) : "");
  const [endsAt, setEndsAt] = useState(live && current.endsAt ? toLocalInputValue(current.endsAt) : "");
  const [allowAdmins, setAllowAdmins] = useState(live ? current.allowAdmins : true);
  const [errors, setErrors] = useState<{ startsAt?: string; endsAt?: string }>({});
  const serverErrors = fieldErrorsOf(mutation.error);
  const who = target.kind === "platform" ? "every tenant" : target.name;

  function setDuration(minutes: number) {
    const start = mode === "scheduled" && startsAt ? new Date(startsAt) : new Date();
    setEndsAt(toLocalInputValue(new Date(start.getTime() + minutes * 60_000).toISOString()));
    setErrors(current => ({ ...current, endsAt: undefined }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const start = mode === "scheduled" ? fromLocalInputValue(startsAt) : null;
    const end = fromLocalInputValue(endsAt);
    const next: typeof errors = {};
    if (mode === "scheduled" && !start) next.startsAt = "Pick when it starts.";
    else if (mode === "scheduled" && start && Date.parse(start) <= Date.now()) next.startsAt = "Pick a time in the future, or start it now.";
    if (end && Date.parse(end) <= (start ? Date.parse(start) : Date.now())) next.endsAt = "The end must be after the start.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const input = { enabled: true, message: message.trim(), startsAt: start, endsAt: end, allowAdmins };
    const onSuccess = () => {
      toast.success(mode === "now" ? `Maintenance started for ${who}` : `Maintenance scheduled for ${who}`, mode === "now" ? "People see the maintenance page right away." : "People see a notice in the app until it starts.");
      onClose();
    };
    if (target.kind === "platform") setPlatform.mutate(input, { onSuccess });
    else setTenant.mutate({ id: target.id, input }, { onSuccess });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={target.kind === "platform" ? "Maintenance for every tenant" : `Maintenance for ${target.name}`}
      description={target.kind === "platform" ? "Closes TaskFlow for all workspaces. The console stays available." : "Closes this workspace only. Other tenants keep working."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="maintenance-form" loading={mutation.isPending}>
            {mode === "now" ? (current.state === "active" ? "Save changes" : "Start maintenance") : "Schedule maintenance"}
          </Button>
        </>
      }
    >
      <form id="maintenance-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <FormAlert message={formErrorOf(mutation.error)} />
        <fieldset>
          <legend className="mb-2 text-sm font-medium">When</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                { value: "now", title: "Start now", text: "The maintenance page shows right away." },
                { value: "scheduled", title: "Schedule", text: "People get a notice in the app first." },
              ] as const
            ).map(option => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  mode === option.value ? "border-primary bg-accent/60" : "hover:bg-muted/60"
                )}
              >
                <input type="radio" name="mode" value={option.value} checked={mode === option.value} onChange={() => setMode(option.value)} className="sr-only" />
                <span className="font-medium">{option.title}</span>
                <span className="text-xs text-muted-foreground">{option.text}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          {mode === "scheduled" && (
            <TextField
              label="Starts"
              type="datetime-local"
              value={startsAt}
              error={errors.startsAt ?? serverErrors.startsAt}
              onChange={event => {
                setStartsAt(event.target.value);
                setErrors(current => ({ ...current, startsAt: undefined }));
              }}
            />
          )}
          <div className={cn("flex flex-col gap-2", mode === "now" && "sm:col-span-2")}>
            <TextField
              label="Expected end"
              type="datetime-local"
              value={endsAt}
              error={errors.endsAt ?? serverErrors.endsAt}
              hint="Optional. It ends by itself then; leave empty to end it yourself."
              onChange={event => {
                setEndsAt(event.target.value);
                setErrors(current => ({ ...current, endsAt: undefined }));
              }}
            />
            <div className="flex flex-wrap gap-1.5" aria-label="Quick durations">
              {DURATIONS.map(duration => (
                <Button key={duration.minutes} variant="ghost" size="sm" onClick={() => setDuration(duration.minutes)}>
                  {duration.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <TextAreaField
          label="Message for people"
          rows={3}
          maxLength={500}
          placeholder="e.g. We're upgrading the database. Your data is safe."
          value={message}
          error={serverErrors.message}
          hint="Shown on the maintenance page and in the advance notice."
          onChange={event => setMessage(event.target.value)}
        />

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={allowAdmins} onChange={event => setAllowAdmins(event.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
          <span>
            Let workspace owners and admins in
            <span className="block text-xs text-muted-foreground">They can sign in to check things and see a banner; everyone else sees the maintenance page.</span>
          </span>
        </label>
      </form>
    </Dialog>
  );
}
