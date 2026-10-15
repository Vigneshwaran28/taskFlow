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
import { localDay } from "@/lib/format";
import { useModuleSettings } from "@/features/auth";
import { useLeaveBalance, useRequestLeave } from "../hooks/useAttendance";
import type { LeavePortion, LeaveType } from "../services/attendanceService";
import { daysBetween, isLeaveType, isRealDay, LEAVE_PORTIONS, LEAVE_TYPES } from "../utils/attendanceMeta";

/** The workspace's working days between two YYYY-MM-DD dates, inclusive (mirrors the server). */
function workingDays(start: string, end: string, days: number[]) {
  if (!start || !end || end < start) return 0;
  let count = 0;
  for (let day = new Date(`${start}T00:00:00Z`); day <= new Date(`${end}T00:00:00Z`); day = new Date(day.getTime() + 86_400_000)) {
    if (days.includes(day.getUTCDay())) count++;
  }
  return count;
}

interface FormValues {
  type: LeaveType;
  portion: LeavePortion;
  startDate: string;
  endDate: string;
  reason: string;
}

const PORTION_KEYS = Object.keys(LEAVE_PORTIONS) as LeavePortion[];
const MAX_PAST_LEAVE_DAYS = 60;
const MAX_LEAVE_SPAN_DAYS = 90;

type FormErrors = Partial<Record<keyof FormValues, string>>;

/** Mirrors the server's leave rules (dates, span, how far back, reason length). */
function validateLeave(values: FormValues, today: string): FormErrors {
  const errors: FormErrors = {};
  const halfDay = values.portion !== "full";
  const end = halfDay ? values.startDate : values.endDate;
  if (!values.startDate) errors.startDate = "Pick the first day.";
  else if (!isRealDay(values.startDate)) errors.startDate = "That date doesn't exist.";
  else if (daysBetween(values.startDate, today) > MAX_PAST_LEAVE_DAYS) errors.startDate = `Leave can be recorded up to ${MAX_PAST_LEAVE_DAYS} days back.`;
  if (!halfDay) {
    if (!values.endDate) errors.endDate = "Pick the last day.";
    else if (!isRealDay(values.endDate)) errors.endDate = "That date doesn't exist.";
    else if (!errors.startDate && end < values.startDate) errors.endDate = "The last day can't be before the first day.";
    else if (!errors.startDate && daysBetween(values.startDate, end) > MAX_LEAVE_SPAN_DAYS) errors.endDate = `Request at most ${MAX_LEAVE_SPAN_DAYS} days at a time.`;
  }
  if (values.reason.trim().length > 500) errors.reason = "Keep the reason under 500 characters.";
  return errors;
}

/** Feature component: ask for leave, a full day, several days, or half a day. Admins are notified to approve it. */
export function LeaveRequestDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const settings = useModuleSettings("attendance");
  const requestLeave = useRequestLeave();
  const today = localDay();
  const types = ((settings.leaveTypes as string[] | undefined) ?? Object.keys(LEAVE_TYPES)).filter(isLeaveType);
  const [values, setValues] = useState<FormValues>({ type: types[0] ?? "annual", portion: "full", startDate: today, endDate: today, reason: "" });
  const { data: balance } = useLeaveBalance(Number(values.startDate.slice(0, 4)) || new Date().getFullYear());

  const [clientErrors, setClientErrors] = useState<FormErrors>({});
  const errors: FormErrors = { ...fieldErrorsOf(requestLeave.error), ...clientErrors };
  const halfDay = values.portion !== "full";
  const span = workingDays(values.startDate, halfDay ? values.startDate : values.endDate, settings.workingDays ?? [1, 2, 3, 4, 5]);
  const days = halfDay ? (span ? 0.5 : 0) : span;
  const overBalance = Boolean(values.type === "annual" && balance && days > balance.remaining);

  const set = <K extends keyof FormValues>(name: K, value: FormValues[K]) => {
    setValues(current => {
      const next = { ...current, [name]: value };
      if (name === "startDate" && (current.endDate < (value as string) || halfDay)) next.endDate = value as string;
      if (name === "portion" && value !== "full") next.endDate = current.startDate;
      return next;
    });
    // Dates depend on each other (and on the duration), so editing any of them clears all date errors.
    const dateFields = ["startDate", "endDate", "portion"];
    setClientErrors(current => (dateFields.includes(name) ? { ...current, startDate: undefined, endDate: undefined, portion: undefined } : { ...current, [name]: undefined }));
    if (requestLeave.error) requestLeave.reset();
  };

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (requestLeave.isPending) return;
    const next = validateLeave(values, today);
    if (!next.startDate && !next.endDate) {
      if (!days) next.endDate = halfDay ? "That date isn't a working day." : "Those dates are all holidays or days off.";
      else if (overBalance && balance) next.endDate = `Only ${balance.remaining} annual leave day${balance.remaining === 1 ? "" : "s"} left this year.`;
    }
    setClientErrors(next);
    if (Object.values(next).some(Boolean)) return;
    requestLeave.mutate(
      { type: values.type, portion: values.portion, startDate: values.startDate, endDate: halfDay ? values.startDate : values.endDate, reason: values.reason.trim() || null },
      {
        onSuccess: saved => {
          toast.success("Leave requested", `${saved.days} day${saved.days === 1 ? "" : "s"}. Your admin has been notified.`);
          onClose();
        },
      }
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Request leave"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="leave-form" loading={requestLeave.isPending}>
            Send request
          </Button>
        </>
      }
    >
      <form id="leave-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formErrorOf(requestLeave.error)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Type"
            id="leave-type"
            value={values.type}
            error={errors.type}
            options={types.map(type => ({ value: type, label: LEAVE_TYPES[type].label }))}
            onChange={event => set("type", event.target.value as LeaveType)}
          />
          {settings.halfDayLeave !== false && (
            <SelectField
              label="Duration"
              id="leave-portion"
              value={values.portion}
              error={errors.portion}
              options={PORTION_KEYS.map(value => ({ value, label: LEAVE_PORTIONS[value].label }))}
              onChange={event => set("portion", event.target.value as LeavePortion)}
            />
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={halfDay ? "Date" : "First day"} id="leave-start" type="date" required value={values.startDate} error={errors.startDate ?? (halfDay ? errors.endDate : undefined)} onChange={event => set("startDate", event.target.value)} />
          {!halfDay && (
            <TextField label="Last day" id="leave-end" type="date" required min={values.startDate} value={values.endDate} error={errors.endDate} onChange={event => set("endDate", event.target.value)} />
          )}
        </div>
        <div className="-mt-1 flex flex-col gap-1 text-sm" aria-live="polite">
          <p className={days ? "text-muted-foreground" : "text-destructive"}>
            {days
              ? `${days} working day${days === 1 ? "" : "s"}${halfDay ? "" : " (non-working days aren't counted)"}.`
              : halfDay
                ? "That date isn't a working day."
                : "Those dates aren't working days."}
          </p>
          {values.type === "annual" && balance && (
            <p className={overBalance ? "font-medium text-destructive" : "text-muted-foreground"}>
              Annual leave {balance.year}: {balance.remaining} of {balance.allowance} days left
              {balance.pending ? ` (${balance.pending} pending)` : ""}.{overBalance ? " This request is more than you have left." : ""}
            </p>
          )}
        </div>
        <TextAreaField label="Reason (optional)" id="leave-reason" rows={3} maxLength={500} value={values.reason} error={errors.reason} onChange={event => set("reason", event.target.value)} />
      </form>
    </Dialog>
  );
}
