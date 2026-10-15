"use client";
import { useState, type FormEvent } from "react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { formatMoney, localDay } from "@/lib/format";
import { useModuleSettings } from "@/features/auth";
import { useSubmitClaim } from "../hooks/useExpenses";

interface FormValues {
  title: string;
  category: string;
  amount: string;
  spentOn: string;
  notes: string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

const MAX_AGE_DAYS = 90;

/** True for a real YYYY-MM-DD calendar day (rejects 2026-02-30). */
function isRealDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** Mirrors the server's claim schema and workspace rules. */
function validateClaim(values: FormValues, categories: string[], maxAmount: number | null): FormErrors {
  const errors: FormErrors = {};
  const title = values.title.trim();
  if (!title) errors.title = "Describe the expense.";
  else if (title.length > 160) errors.title = "Keep it under 160 characters.";
  if (!values.category || !categories.includes(values.category)) errors.category = "Pick a category.";
  const text = values.amount.trim();
  const amount = Number(text);
  if (!text) errors.amount = "Enter the amount.";
  else if (!/^\d*\.?\d*$/.test(text) || !Number.isFinite(amount)) errors.amount = "Enter a number, like 250.50.";
  else if (amount <= 0) errors.amount = "Enter an amount above zero.";
  else if (!/^\d*(\.\d{1,2})?$/.test(text)) errors.amount = "Use at most 2 decimal places.";
  else if (amount > 1e12) errors.amount = "That amount is too large.";
  else if (maxAmount != null && amount > maxAmount) errors.amount = `Claims are limited to ${formatMoney(maxAmount)} each.`;
  const today = localDay();
  if (!values.spentOn) errors.spentOn = "Pick the date you spent it.";
  else if (!isRealDay(values.spentOn)) errors.spentOn = "That date doesn't exist.";
  else if (values.spentOn > today) errors.spentOn = "The date can't be in the future.";
  else if ((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${values.spentOn}T00:00:00Z`)) / 86_400_000 > MAX_AGE_DAYS) {
    errors.spentOn = `Claims must be submitted within ${MAX_AGE_DAYS} days of the expense.`;
  }
  if (values.notes.trim().length > 1000) errors.notes = "Keep notes under 1000 characters.";
  return errors;
}

/** Feature component: submit an expense claim. Admins are notified to review it. */
export function ClaimDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const settings = useModuleSettings("expenses");
  const submit = useSubmitClaim();
  const categories = settings.categories ?? ["Other"];
  const [values, setValues] = useState<FormValues>({ title: "", category: categories[0] ?? "Other", amount: "", spentOn: localDay(), notes: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const serverErrors = fieldErrorsOf(submit.error);
  const set = (name: keyof FormValues, value: string) => {
    setValues(current => ({ ...current, [name]: value }));
    setErrors(current => ({ ...current, [name]: undefined }));
    if (submit.error) submit.reset();
  };

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submit.isPending) return;
    const amount = Number(values.amount.trim());
    const next = validateClaim(values, categories, settings.maxAmount ?? null);
    setErrors(next);
    if (Object.keys(next).length) return;
    submit.mutate(
      { title: values.title.trim(), category: values.category, amount, spentOn: values.spentOn, notes: values.notes.trim() || null },
      {
        onSuccess: claim => {
          toast.success(`${claim.key} submitted`, `${formatMoney(claim.amount)} sent for approval.`);
          onClose();
        },
      }
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="New expense claim"
      description={settings.maxAmount != null ? `Up to ${formatMoney(settings.maxAmount)} per claim, within 90 days of the expense.` : "Submit within 90 days of the expense."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="claim-form" loading={submit.isPending}>
            Submit claim
          </Button>
        </>
      }
    >
      <form id="claim-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formErrorOf(submit.error)} />
        <TextField
          label="What was it for?"
          id="claim-title"
          required
          autoFocus
          maxLength={160}
          placeholder="e.g. Taxi to client meeting"
          value={values.title}
          error={errors.title ?? serverErrors.title}
          onChange={event => set("title", event.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Category"
            id="claim-category"
            value={values.category}
            error={errors.category ?? serverErrors.category}
            options={categories.map(category => ({ value: category, label: category }))}
            onChange={event => set("category", event.target.value)}
          />
          <TextField
            label="Amount"
            id="claim-amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            required
            value={values.amount}
            error={errors.amount ?? serverErrors.amount}
            onChange={event => set("amount", event.target.value)}
          />
          <TextField
            label="Date spent"
            id="claim-date"
            type="date"
            required
            max={localDay()}
            value={values.spentOn}
            error={errors.spentOn ?? serverErrors.spentOn}
            onChange={event => set("spentOn", event.target.value)}
          />
        </div>
        <TextAreaField
          label="Notes (optional)"
          id="claim-notes"
          rows={3}
          maxLength={1000}
          placeholder="Receipt number, client name, anything that helps approval."
          value={values.notes}
          error={errors.notes ?? serverErrors.notes}
          onChange={event => set("notes", event.target.value)}
        />
      </form>
    </Dialog>
  );
}
