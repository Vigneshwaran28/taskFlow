"use client";
// A practitioner's clinic profile and weekly schedule (Sun–Sat, each with any number of start–end sessions).
import { useId, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { controlClass } from "@/components/ui/FieldShell";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/shared/Toaster";
import { useModuleSettings } from "@/features/auth";
import { ACCENTS, type Accent } from "@/hooks/useTheme";
import { fieldErrorsOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { getCurrency } from "@/lib/format";
import { useProviderCandidates, useSaveProvider } from "../hooks/useClinic";
import type { Provider, Weekday, WeeklySchedule } from "../services/clinicService";
import { accentClasses, WEEKDAYS } from "../utils/clinicMeta";
import { isClock, minutesOf } from "../utils/time";
import { ClinicFormAlert } from "./ClinicBadges";

interface Session {
  key: number;
  start: string;
  end: string;
}

type ScheduleState = Record<Weekday, Session[]>;

const DAY_KEYS: Weekday[] = ["0", "1", "2", "3", "4", "5", "6"];
const MAX_SESSIONS = 8;
let sessionKey = 1;

function toState(schedule: WeeklySchedule | undefined): ScheduleState {
  const fallback: WeeklySchedule = { "1": [["09:00", "13:00"], ["14:00", "17:00"]], "2": [["09:00", "17:00"]], "3": [["09:00", "17:00"]], "4": [["09:00", "17:00"]], "5": [["09:00", "17:00"]] };
  const source = schedule ?? fallback;
  return Object.fromEntries(DAY_KEYS.map(day => [day, (source[day] ?? []).map(([start, end]) => ({ key: sessionKey++, start, end }))])) as ScheduleState;
}

/** Per-day problems: start before end, and no overlapping sessions. */
function scheduleErrors(schedule: ScheduleState) {
  const errors: Partial<Record<Weekday, string>> = {};
  for (const day of DAY_KEYS) {
    const sessions = schedule[day];
    if (sessions.some(item => !isClock(item.start) || !isClock(item.end))) {
      errors[day] = "Enter a start and end time for every session.";
      continue;
    }
    const bad = sessions.find(item => minutesOf(item.start) >= minutesOf(item.end));
    if (bad) {
      errors[day] = `${bad.start}–${bad.end} must end after it starts.`;
      continue;
    }
    const sorted = [...sessions].sort((a, b) => minutesOf(a.start) - minutesOf(b.start));
    for (let i = 1; i < sorted.length; i++) {
      if (minutesOf(sorted[i].start) < minutesOf(sorted[i - 1].end)) {
        errors[day] = `${sorted[i - 1].start}–${sorted[i - 1].end} overlaps ${sorted[i].start}–${sorted[i].end}.`;
        break;
      }
    }
  }
  return errors;
}

export interface ProviderEditorDialogProps {
  /** Editing an existing profile */
  provider?: Provider | null;
  /** Setting up a profile for this person (e.g. a practitioner's own) */
  person?: { id: number; name: string } | null;
  onClose: () => void;
}

export function ProviderEditorDialog({ provider, person, onClose }: ProviderEditorDialogProps) {
  const toast = useToast();
  const formId = useId();
  const settings = useModuleSettings("clinic");
  const choosing = !provider && !person;
  const candidates = useProviderCandidates(choosing);
  const save = useSaveProvider();
  const serverErrors = fieldErrorsOf(save.error);

  const [userId, setUserId] = useState<number | null>(provider?.userId ?? person?.id ?? null);
  const [specialty, setSpecialty] = useState(provider?.specialty ?? "");
  const [qualification, setQualification] = useState(provider?.qualification ?? "");
  const [registrationNo, setRegistrationNo] = useState(provider?.registrationNo ?? "");
  const [slotMinutes, setSlotMinutes] = useState(String(provider?.slotMinutes ?? settings.defaultSlotMinutes ?? 15));
  const [fee, setFee] = useState(provider?.consultationFee != null ? String(provider.consultationFee) : "");
  const [room, setRoom] = useState(provider?.room ?? "");
  const [isAccepting, setIsAccepting] = useState(provider?.isAccepting ?? true);
  const [color, setColor] = useState<Accent>(provider?.color ?? "teal");
  const [schedule, setSchedule] = useState<ScheduleState>(() => toState(provider?.schedule));
  const [showErrors, setShowErrors] = useState(false);

  const dayErrors = scheduleErrors(schedule);
  const hasDayErrors = Object.keys(dayErrors).length > 0;
  const name = provider?.name ?? person?.name ?? candidates.data?.find(item => item.id === userId)?.name;
  const currency = getCurrency();

  const updateDay = (day: Weekday, update: (sessions: Session[]) => Session[]) => setSchedule(current => ({ ...current, [day]: update(current[day]) }));

  function addSession(day: Weekday) {
    updateDay(day, sessions => {
      const last = sessions.at(-1);
      const start = last && isClock(last.end) ? last.end : "09:00";
      const startMin = minutesOf(start);
      const end = startMin + 60 <= 23 * 60 + 59 ? `${String(Math.floor((startMin + 60) / 60)).padStart(2, "0")}:${String((startMin + 60) % 60).padStart(2, "0")}` : "23:59";
      return [...sessions, { key: sessionKey++, start, end }];
    });
  }

  function submit() {
    setShowErrors(true);
    if (!userId || !specialty.trim() || hasDayErrors) return;
    const payload: WeeklySchedule = {};
    for (const day of DAY_KEYS) {
      if (schedule[day].length) payload[day] = [...schedule[day]].sort((a, b) => minutesOf(a.start) - minutesOf(b.start)).map(item => [item.start, item.end]);
    }
    save.mutate(
      {
        userId,
        specialty: specialty.trim(),
        qualification: qualification.trim() || null,
        registrationNo: registrationNo.trim() || null,
        slotMinutes: Number(slotMinutes) || undefined,
        consultationFee: fee.trim() === "" ? null : Number(fee),
        room: room.trim() || null,
        schedule: payload,
        isAccepting,
        color,
      },
      {
        onSuccess: saved => {
          toast.success(provider ? "Practitioner updated" : `${saved.name} added`);
          onClose();
        },
      }
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title={provider ? `Edit ${provider.name}` : name ? `Set up ${name}` : "Add practitioner"}
      description="Clinic profile and weekly hours. Free slots are cut from these sessions."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={save.isPending}>
            {provider ? "Save changes" : "Add practitioner"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <ClinicFormAlert error={save.error} shown={["userId", "specialty", "qualification", "registrationNo", "slotMinutes", "consultationFee", "room", "schedule", "color"]} />

        {choosing && (
          <SelectField
            label="Person"
            required
            value={userId ? String(userId) : ""}
            onChange={event => setUserId(event.target.value ? Number(event.target.value) : null)}
            error={serverErrors.userId ?? (showErrors && !userId ? "Choose who to add." : null)}
            hint={candidates.data && !candidates.data.length ? "Everyone with the practitioner permission already has a profile. Give someone a practitioner role first." : "People whose role includes the practitioner permission."}
            options={[
              { value: "", label: candidates.isPending ? "Loading…" : "Choose a person" },
              ...(candidates.data ?? []).map(item => ({ value: String(item.id), label: `${item.name}${item.jobTitle ? ` — ${item.jobTitle}` : ""} (${item.email})` })),
            ]}
          />
        )}
        {!choosing && serverErrors.userId && <p className="text-sm text-destructive">{serverErrors.userId}</p>}

        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Specialty"
            required
            value={specialty}
            onChange={event => setSpecialty(event.target.value)}
            error={serverErrors.specialty ?? (showErrors && !specialty.trim() ? "Enter a specialty, e.g. General medicine." : null)}
            maxLength={80}
            placeholder="General medicine"
          />
          <TextField label="Qualification" value={qualification} onChange={event => setQualification(event.target.value)} error={serverErrors.qualification} maxLength={120} placeholder="MBBS, MD" />
          <TextField label="Registration number" value={registrationNo} onChange={event => setRegistrationNo(event.target.value)} error={serverErrors.registrationNo} maxLength={60} />
          <TextField label="Slot length (minutes)" type="number" min={5} max={240} step={5} value={slotMinutes} onChange={event => setSlotMinutes(event.target.value)} error={serverErrors.slotMinutes} />
          <TextField
            label={`Consultation fee${currency ? ` (${currency})` : ""}`}
            type="number"
            min={0}
            step="0.01"
            value={fee}
            onChange={event => setFee(event.target.value)}
            error={serverErrors.consultationFee}
          />
          <TextField label="Room" value={room} onChange={event => setRoom(event.target.value)} error={serverErrors.room} maxLength={40} placeholder="Room 3" />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isAccepting}
              aria-labelledby={`${formId}-accepting`}
              onClick={() => setIsAccepting(value => !value)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isAccepting ? "bg-primary" : "bg-input"
              )}
            >
              <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", isAccepting ? "translate-x-5" : "translate-x-0.5")} />
            </button>
            <span id={`${formId}-accepting`} className="text-sm">
              <span className="font-medium">Accepting appointments</span>
              <span className="block text-xs text-muted-foreground">Turn off to stop new bookings (existing ones stay).</span>
            </span>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Colour</legend>
            <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2">
              {ACCENTS.map(accent => (
                <button
                  key={accent}
                  type="button"
                  role="radio"
                  aria-checked={color === accent}
                  aria-label={accent}
                  onClick={() => setColor(accent)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    accentClasses(accent).swatch,
                    color === accent && "ring-2 ring-foreground"
                  )}
                >
                  {color === accent && <Check className="h-4 w-4" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Weekly schedule</legend>
          {serverErrors.schedule && <p className="text-sm text-destructive">{serverErrors.schedule}</p>}
          <ul className="divide-y rounded-lg border">
            {DAY_KEYS.map(day => {
              const sessions = schedule[day];
              const error = dayErrors[day];
              return (
                <li key={day} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start">
                  <span className="w-28 shrink-0 pt-2 text-sm font-medium">{WEEKDAYS[Number(day)]}</span>
                  <div className="flex flex-1 flex-col gap-2">
                    {sessions.length === 0 && <span className="pt-2 text-sm text-muted-foreground">Not working</span>}
                    {sessions.map((session, index) => (
                      <div key={session.key} className="flex flex-wrap items-center gap-2">
                        <label className="sr-only" htmlFor={`${formId}-${day}-${session.key}-start`}>
                          {WEEKDAYS[Number(day)]} session {index + 1} start
                        </label>
                        <input
                          id={`${formId}-${day}-${session.key}-start`}
                          type="time"
                          value={session.start}
                          onChange={event => updateDay(day, list => list.map(item => (item.key === session.key ? { ...item, start: event.target.value } : item)))}
                          aria-invalid={Boolean(error)}
                          className={controlClass(error, "h-9 w-32")}
                        />
                        <span aria-hidden="true" className="text-muted-foreground">
                          –
                        </span>
                        <label className="sr-only" htmlFor={`${formId}-${day}-${session.key}-end`}>
                          {WEEKDAYS[Number(day)]} session {index + 1} end
                        </label>
                        <input
                          id={`${formId}-${day}-${session.key}-end`}
                          type="time"
                          value={session.end}
                          onChange={event => updateDay(day, list => list.map(item => (item.key === session.key ? { ...item, end: event.target.value } : item)))}
                          aria-invalid={Boolean(error)}
                          className={controlClass(error, "h-9 w-32")}
                        />
                        <Button variant="ghost" size="icon" onClick={() => updateDay(day, list => list.filter(item => item.key !== session.key))} aria-label={`Remove ${WEEKDAYS[Number(day)]} session ${index + 1}`}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                    {error && (
                      <p role="alert" className="text-sm text-destructive">
                        {error}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => addSession(day)} disabled={sessions.length >= MAX_SESSIONS} aria-label={`Add a session on ${WEEKDAYS[Number(day)]}`}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add hours
                  </Button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </div>
    </Dialog>
  );
}
