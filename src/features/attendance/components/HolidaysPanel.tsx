"use client";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Download, List, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useCan } from "@/features/auth";
import { formatDay, localDay } from "@/lib/format";
import { useDeleteHoliday, useHolidays, usePickHoliday } from "../hooks/useAttendance";
import type { Holiday, HolidayYear } from "../services/attendanceService";
import { HOLIDAY_TYPE_KEYS, HOLIDAY_TYPES, isWeeklyOff } from "../utils/attendanceMeta";
import { downloadCsv, holidaysToCsv } from "../utils/holidayCsv";
import { HolidayFormDialog } from "./HolidayFormDialog";
import { HolidayImportDialog } from "./HolidayImportDialog";

const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];
const monthName = new Intl.DateTimeFormat(undefined, { month: "long" });
const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th"];
const VIEWS = [
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "list", label: "List", icon: List },
] as const;

type View = (typeof VIEWS)[number]["id"];
type Weekend = HolidayYear["weekend"];

/** Plain-language summary of the weekly days off. */
function describeWeekend({ workingDays, saturdaysOff }: Weekend) {
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const off = names.filter((_, index) => !workingDays.includes(index));
  let text = off.length ? `Weekly off: ${off.join(", ")}.` : "Every day is a working day.";
  if (workingDays.includes(6) && saturdaysOff.length) text += ` ${saturdaysOff.map(week => ORDINALS[week - 1]).join(" & ")} Saturday of each month off.`;
  return text;
}

interface MonthGridProps {
  year: number;
  /** 0-based */
  month: number;
  byDate: Map<string, Holiday[]>;
  weekend: Weekend;
  today: string;
  onDayClick: (date: string, holidays: Holiday[]) => void;
}

/** One month of the year view. Holidays get a coloured dot; weekly offs are dimmed. */
function MonthGrid({ year, month, byDate, weekend, today, onDayClick }: MonthGridProps) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array<null>(first.getDay()).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
  return (
    <div className="rounded-xl border p-3">
      <h4 className="mb-2 text-sm font-semibold">{monthName.format(first)}</h4>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs" role="grid" aria-label={`${monthName.format(first)} ${year}`}>
        {WEEKDAY_INITIALS.map((initial, index) => (
          <span key={index} className="py-0.5 font-medium text-muted-foreground" aria-hidden="true">
            {initial}
          </span>
        ))}
        {cells.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} />;
          const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const holidays = byDate.get(date) ?? [];
          const off = isWeeklyOff(date, weekend);
          const label = [formatDay(date), ...holidays.map(holiday => `${holiday.name} (${HOLIDAY_TYPES[holiday.type].short.toLowerCase()})`), off && !holidays.length ? "day off" : null]
            .filter(Boolean)
            .join(", ");
          return (
            <button
              key={date}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => onDayClick(date, holidays)}
              className={cn(
                "relative flex h-7 items-center justify-center rounded-md tabular-nums transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                off && "text-muted-foreground/60",
                holidays.some(holiday => holiday.type !== "optional") && "bg-red-50 font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300",
                holidays.length > 0 && holidays.every(holiday => holiday.type === "optional") && "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
                holidays.some(holiday => holiday.picked) && "ring-1 ring-amber-500",
                date === today && "outline outline-2 outline-primary"
              )}
            >
              {day}
              {holidays.length > 0 && <span className={cn("absolute bottom-0.5 h-1 w-1 rounded-full", HOLIDAY_TYPES[holidays[0].type].dot)} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Feature component: the workspace's holiday calendar for a year. Everyone sees it and picks optional
 * holidays; people with "Manage holidays" add, edit, import, and export.
 */
export function HolidaysPanel() {
  const toast = useToast();
  const today = localDay();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [view, setView] = useState<View>("calendar");
  // One dialog at a time: opening "Add holiday" can never leave the import dialog on screen (or the reverse).
  const [dialog, setDialog] = useState<{ kind: "form"; holiday: Holiday | null; date?: string; key: number } | { kind: "import"; key: number } | null>(null);
  const [deleting, setDeleting] = useState<Holiday | null>(null);
  const { data, isPending, error, refetch } = useHolidays(year);
  const pick = usePickHoliday();
  // Picking needs "attendance.self"; holiday managers without it only manage the calendar.
  const canPick = useCan("attendance.self");
  const remove = useDeleteHoliday();

  const byDate = useMemo(() => {
    const map = new Map<string, Holiday[]>();
    for (const holiday of data?.holidays ?? []) map.set(holiday.date, [...(map.get(holiday.date) ?? []), holiday]);
    return map;
  }, [data]);

  if (error) return <ErrorState message="Unable to load holidays." onRetry={() => void refetch()} />;
  if (isPending) return <LoadingState />;

  const { holidays, optional, weekend, canManage } = data;
  const quotaLeft = Math.max(0, optional.quota - optional.picked);
  const upcoming = holidays.filter(holiday => holiday.date >= today && (holiday.type !== "optional" || holiday.picked));
  const counts = HOLIDAY_TYPE_KEYS.map(type => [type, holidays.filter(holiday => holiday.type === type).length] as const);
  const listed = view === "list" ? holidays : upcoming;
  const pickable = canPick ? holidays.filter(holiday => holiday.type === "optional" && holiday.date >= today && !holiday.picked) : [];

  function togglePick(holiday: Holiday) {
    pick.mutate(
      { id: holiday.id, picked: !holiday.picked },
      {
        onSuccess: () => toast.success(holiday.picked ? "Optional holiday dropped" : "Optional holiday picked", `${holiday.name}, ${formatDay(holiday.date)}`),
        onError: err => toast.error("Couldn't change your pick", err.message),
      }
    );
  }

  const openForm = (holiday: Holiday | null, date?: string) => setDialog({ kind: "form", holiday, date, key: Date.now() });
  const openImport = () => setDialog({ kind: "import", key: Date.now() });
  /** New holidays start today when the shown year is this year, otherwise on 1 January of the shown year. */
  const newHolidayDate = () => (today.startsWith(`${year}-`) ? today : `${year}-01-01`);

  function handleDayClick(date: string, dayHolidays: Holiday[]) {
    if (dayHolidays.length === 1 && canManage) openForm(dayHolidays[0]);
    else if (!dayHolidays.length && canManage) openForm(null, date);
    else if (dayHolidays.length) toast.info(dayHolidays.map(holiday => holiday.name).join(", "), formatDay(date));
  }

  function handleDelete() {
    if (!deleting) return;
    const target = deleting;
    remove.mutate(target.id, {
      onSuccess: () => {
        toast.success("Holiday removed", target.name);
        setDeleting(null);
      },
      onError: err => toast.error("Couldn't remove the holiday", err.message),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setYear(current => current - 1)} aria-label="Previous year">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <h3 className="min-w-16 text-center text-lg font-semibold tabular-nums" aria-live="polite">
            {year}
          </h3>
          <Button variant="ghost" size="icon" onClick={() => setYear(current => current + 1)} aria-label="Next year">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="ml-2 flex rounded-lg border p-0.5" role="group" aria-label="View">
            {VIEWS.map(option => (
              <button
                key={option.id}
                type="button"
                aria-pressed={view === option.id}
                onClick={() => setView(option.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  view === option.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <option.icon className="h-3.5 w-3.5" aria-hidden="true" />
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" disabled={!holidays.length} onClick={() => downloadCsv(`holidays-${year}.csv`, holidaysToCsv(holidays))}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
          {canManage && (
            <>
              <Button variant="secondary" size="sm" onClick={openImport}>
                <Upload className="h-4 w-4" aria-hidden="true" />
                Import CSV
              </Button>
              <Button size="sm" onClick={() => openForm(null, newHolidayDate())}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add holiday
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4">
          <p className="text-xs font-medium text-muted-foreground">Holidays in {year}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{holidays.length}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {counts.map(([type, count]) => (
              <Badge key={type} tone={HOLIDAY_TYPES[type].tone}>
                {count} {HOLIDAY_TYPES[type].short.toLowerCase()}
              </Badge>
            ))}
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs font-medium text-muted-foreground">Your optional holidays</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {optional.picked} <span className="text-base font-normal text-muted-foreground">of {optional.quota} picked</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {optional.quota ? (quotaLeft ? `You can pick ${quotaLeft} more.` : "You've used your quota. Drop one to pick another.") : "Optional holidays aren't available."}
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs font-medium text-muted-foreground">Week</p>
          <p className="mt-1 text-sm">{describeWeekend(weekend)}</p>
          {canManage && <p className="mt-2 text-xs text-muted-foreground">Change this under Settings → Modules → Attendance.</p>}
        </div>
      </div>

      {view === "calendar" ? (
        <>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground" aria-hidden="true">
            {HOLIDAY_TYPE_KEYS.map(type => (
              <span key={type} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", HOLIDAY_TYPES[type].dot)} />
                {HOLIDAY_TYPES[type].label}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded ring-1 ring-amber-500" />
              Picked by you
            </span>
            <span className="text-muted-foreground/60">Dimmed: weekly off</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }, (_, month) => (
              <MonthGrid key={month} year={year} month={month} byDate={byDate} weekend={weekend} today={today} onDayClick={handleDayClick} />
            ))}
          </div>
          {canManage && <p className="text-xs text-muted-foreground">Click a date to add a holiday, or a holiday to edit it.</p>}
        </>
      ) : null}

      {view === "list" || upcoming.length ? (
        <section aria-labelledby="holiday-list-heading" className="flex flex-col gap-2">
          <h3 id="holiday-list-heading" className="text-sm font-semibold">
            {view === "list" ? `All holidays in ${year}` : "Your upcoming days off"}
          </h3>
          {listed.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={`No holidays in ${year}`}
              message={canManage ? "Add them one by one, or import a CSV of the year's holidays." : "Your admin hasn't published holidays for this year."}
              action={
                canManage && (
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button size="sm" onClick={() => openForm(null, newHolidayDate())}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add holiday
                    </Button>
                    <Button size="sm" variant="secondary" onClick={openImport}>
                      <Upload className="h-4 w-4" aria-hidden="true" />
                      Import CSV
                    </Button>
                  </div>
                )
              }
            />
          ) : (
            <ul className="divide-y rounded-xl border">
              {listed.map(holiday => {
                const past = holiday.date < today;
                return (
                  <li key={holiday.id} className={cn("flex flex-wrap items-center gap-3 px-4 py-3", past && "opacity-60")}>
                    <div className="w-28 shrink-0 text-sm tabular-nums">{formatDay(holiday.date)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{holiday.name}</p>
                      {holiday.description && <p className="truncate text-xs text-muted-foreground">{holiday.description}</p>}
                    </div>
                    <Badge tone={HOLIDAY_TYPES[holiday.type].tone}>{HOLIDAY_TYPES[holiday.type].short}</Badge>
                    {canManage && holiday.type === "optional" && <span className="text-xs text-muted-foreground">{holiday.pickCount ?? 0} picked</span>}
                    {canPick && holiday.type === "optional" && !past && (
                      <Button
                        size="sm"
                        variant={holiday.picked ? "secondary" : "primary"}
                        disabled={pick.isPending || (!holiday.picked && !quotaLeft)}
                        onClick={() => togglePick(holiday)}
                        aria-label={`${holiday.picked ? "Drop" : "Pick"} ${holiday.name}`}
                      >
                        {holiday.picked ? "Drop" : "Pick"}
                      </Button>
                    )}
                    {canManage && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openForm(holiday)} aria-label={`Edit ${holiday.name}`}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleting(holiday)} aria-label={`Remove ${holiday.name}`}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {view === "calendar" && pickable.length > 0 && (
        <section aria-labelledby="optional-heading" className="flex flex-col gap-2">
          <h3 id="optional-heading" className="text-sm font-semibold">
            Optional holidays you can pick
          </h3>
          <ul className="flex flex-wrap gap-2">
            {pickable.map(holiday => (
              <li key={holiday.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{holiday.name}</span> <span className="text-muted-foreground">· {formatDay(holiday.date)}</span>
                </span>
                <Button size="sm" variant="secondary" disabled={pick.isPending || !quotaLeft} onClick={() => togglePick(holiday)} aria-label={`Pick ${holiday.name}`}>
                  Pick
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dialog?.kind === "form" && <HolidayFormDialog key={dialog.key} holiday={dialog.holiday} defaultDate={dialog.date} onClose={() => setDialog(null)} />}
      {dialog?.kind === "import" && <HolidayImportDialog key={dialog.key} onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove this holiday?"
        message={
          deleting ? `${deleting.name} on ${formatDay(deleting.date)} becomes a normal working day${deleting.type === "optional" ? ", and people's picks are removed" : ""}.` : ""
        }
        confirmLabel="Remove"
        pending={remove.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
