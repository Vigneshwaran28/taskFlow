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
import { useCreateHoliday, useUpdateHoliday } from "../hooks/useAttendance";
import type { Holiday, HolidayInput, HolidayType } from "../services/attendanceService";
import { HOLIDAY_TYPE_KEYS, HOLIDAY_TYPES, isRealDay } from "../utils/attendanceMeta";

const TYPE_HINTS: Record<HolidayType, string> = {
  public: "A day off for everyone.",
  company: "A day off for everyone, set by your company.",
  optional: "People choose a few of these each year (see the yearly quota in attendance settings).",
};

interface FormValues {
  date: string;
  name: string;
  type: HolidayType;
  description: string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

/** Mirrors the server's holiday schema. */
function validateHoliday(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.date) errors.date = "Pick the holiday's date.";
  else if (!isRealDay(values.date)) errors.date = "That date doesn't exist.";
  else if (Number(values.date.slice(0, 4)) < 2000 || Number(values.date.slice(0, 4)) > 2100) errors.date = "Pick a date between 2000 and 2100.";
  if (!values.name.trim()) errors.name = "Name the holiday.";
  else if (values.name.trim().length > 120) errors.name = "Keep the name under 120 characters.";
  if (values.description.trim().length > 300) errors.description = "Keep the description under 300 characters.";
  return errors;
}

export interface HolidayFormDialogProps {
  holiday?: Holiday | null;
  defaultDate?: string;
  onClose: () => void;
}

/** Feature component: add or edit one holiday. */
export function HolidayFormDialog({ holiday = null, defaultDate = "", onClose }: HolidayFormDialogProps) {
  const toast = useToast();
  const create = useCreateHoliday();
  const update = useUpdateHoliday();
  const mutation = holiday ? update : create;
  const [values, setValues] = useState<FormValues>({
    date: holiday?.date ?? defaultDate,
    name: holiday?.name ?? "",
    type: holiday?.type ?? "public",
    description: holiday?.description ?? "",
  });
  const [clientErrors, setClientErrors] = useState<FormErrors>({});
  const serverErrors = fieldErrorsOf(mutation.error);
  const errors: FormErrors = { ...serverErrors, ...clientErrors };

  const set = <K extends keyof FormValues>(name: K, value: FormValues[K]) => {
    setValues(current => ({ ...current, [name]: value }));
    setClientErrors(current => ({ ...current, [name]: undefined }));
    if (mutation.error) mutation.reset();
  };

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const next = validateHoliday(values);
    setClientErrors(next);
    if (Object.keys(next).length) return;
    const input: HolidayInput = { date: values.date, name: values.name.trim(), type: values.type, description: values.description.trim() || null };
    const onSuccess = (saved: Holiday) => {
      toast.success(holiday ? "Holiday updated" : "Holiday added", saved.name);
      onClose();
    };
    if (holiday) update.mutate({ id: holiday.id, ...input }, { onSuccess });
    else create.mutate(input, { onSuccess });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={holiday ? "Edit holiday" : "Add holiday"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="holiday-form" loading={mutation.isPending}>
            {holiday ? "Save" : "Add holiday"}
          </Button>
        </>
      }
    >
      <form id="holiday-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formErrorOf(mutation.error)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Date" id="holiday-date" type="date" required value={values.date} error={errors.date} onChange={event => set("date", event.target.value)} />
          <SelectField
            label="Type"
            id="holiday-type"
            value={values.type}
            error={errors.type}
            hint={TYPE_HINTS[values.type]}
            options={HOLIDAY_TYPE_KEYS.map(value => ({ value, label: HOLIDAY_TYPES[value].label }))}
            onChange={event => set("type", event.target.value as HolidayType)}
          />
        </div>
        <TextField label="Name" id="holiday-name" required maxLength={120} value={values.name} error={errors.name} onChange={event => set("name", event.target.value)} placeholder="e.g. Diwali" />
        <TextAreaField
          label="Description (optional)"
          id="holiday-description"
          rows={2}
          maxLength={300}
          value={values.description}
          error={errors.description}
          onChange={event => set("description", event.target.value)}
        />
        {holiday && holiday.type === "optional" && values.type !== "optional" && (holiday.pickCount ?? 0) > 0 && (
          <p className="text-sm text-warning">
            {holiday.pickCount} {holiday.pickCount === 1 ? "person has" : "people have"} picked this holiday. Changing the type removes their picks; it becomes a day off for everyone.
          </p>
        )}
      </form>
    </Dialog>
  );
}
