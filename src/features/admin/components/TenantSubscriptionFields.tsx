"use client";
// The Subscription tab of the tenant dialog: plan, start and end dates, and grace days before sign-in stops.
import { useId } from "react";
import { TextField } from "@/components/ui/TextField";
import { formatDate } from "@/lib/format";
import type { TenantSubscription } from "../services/adminService";

export const PLAN_SUGGESTIONS = ["Trial", "Standard", "Business", "Enterprise"] as const;
export const PLAN_MAX = 40;
export const GRACE_MAX = 90;

export interface SubscriptionValues {
  plan: string;
  /** YYYY-MM-DD or "" */
  startsOn: string;
  endsOn: string;
  /** Text from the number input */
  graceDays: string;
}

export type SubscriptionErrors = Partial<Record<"plan" | "subscriptionStartsOn" | "subscriptionEndsOn" | "graceDays", string>>;

/** Server field names, so 422 errors land on the right input. */
export const SUBSCRIPTION_FIELDS = ["plan", "subscriptionStartsOn", "subscriptionEndsOn", "graceDays"] as const;

const today = () => new Date().toISOString().slice(0, 10);

export function subscriptionValues(subscription?: TenantSubscription): SubscriptionValues {
  return {
    plan: subscription?.plan || "Standard",
    startsOn: subscription?.startsOn ?? today(),
    endsOn: subscription?.endsOn ?? "",
    graceDays: String(subscription?.graceDays ?? 7),
  };
}

export function validateSubscription(value: SubscriptionValues): SubscriptionErrors {
  const errors: SubscriptionErrors = {};
  if (!value.plan.trim()) errors.plan = "Plan is required.";
  else if (value.plan.trim().length > PLAN_MAX) errors.plan = `Use at most ${PLAN_MAX} characters.`;
  const grace = Number(value.graceDays);
  if (value.graceDays.trim() === "" || !Number.isInteger(grace) || grace < 0 || grace > GRACE_MAX) errors.graceDays = `Use a whole number from 0 to ${GRACE_MAX}.`;
  if (value.startsOn && value.endsOn && value.endsOn < value.startsOn) errors.subscriptionEndsOn = "The end date can't be before the start date.";
  return errors;
}

/** The API payload for the subscription fields. */
export const subscriptionPayload = (value: SubscriptionValues) => ({
  plan: value.plan.trim(),
  subscriptionStartsOn: value.startsOn || null,
  subscriptionEndsOn: value.endsOn || null,
  graceDays: Number(value.graceDays),
});

function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export interface TenantSubscriptionFieldsProps {
  value: SubscriptionValues;
  onChange: (next: SubscriptionValues) => void;
  errors: SubscriptionErrors;
}

export function TenantSubscriptionFields({ value, onChange, errors }: TenantSubscriptionFieldsProps) {
  const listId = useId();
  const set = (key: keyof SubscriptionValues, next: string) => onChange({ ...value, [key]: next });
  const grace = Number(value.graceDays);
  const lastDay = value.endsOn && Number.isInteger(grace) && grace >= 0 ? addDays(value.endsOn, grace) : null;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <TextField
            label="Plan"
            id="tenant-plan"
            required
            maxLength={PLAN_MAX}
            list={listId}
            autoComplete="off"
            hint="Free text, e.g. Trial, Standard, Business, Enterprise."
            value={value.plan}
            error={errors.plan}
            onChange={event => set("plan", event.target.value)}
          />
          <datalist id={listId}>
            {PLAN_SUGGESTIONS.map(plan => (
              <option key={plan} value={plan} />
            ))}
          </datalist>
        </div>
        <TextField
          label="Grace days"
          id="tenant-grace-days"
          type="number"
          inputMode="numeric"
          min="0"
          max={String(GRACE_MAX)}
          step="1"
          hint={`Days after the end date before sign-in stops (0–${GRACE_MAX}).`}
          value={value.graceDays}
          error={errors.graceDays}
          onChange={event => set("graceDays", event.target.value)}
        />
        <TextField label="Start date" id="tenant-starts-on" type="date" value={value.startsOn} error={errors.subscriptionStartsOn} onChange={event => set("startsOn", event.target.value)} />
        <TextField
          label="End date (optional)"
          id="tenant-ends-on"
          type="date"
          min={value.startsOn || undefined}
          hint="Leave empty for no end date."
          value={value.endsOn}
          error={errors.subscriptionEndsOn}
          onChange={event => set("endsOn", event.target.value)}
        />
      </div>
      <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground" data-testid="subscription-preview">
        {lastDay
          ? `Admins get reminders 30, 14, 7, 3, 1 and 0 days before ${formatDate(value.endsOn)}. Sign-in stops after ${formatDate(lastDay)}${grace ? ` (${grace} grace day${grace === 1 ? "" : "s"})` : ""}; extending the end date restores access at once.`
          : "No end date: the subscription never expires."}
      </p>
    </div>
  );
}
