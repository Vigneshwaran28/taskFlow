"use client";
import { useEffect, useState, type ReactNode } from "react";
import { CalendarHeart, CalendarOff, LogIn, LogOut, Palmtree, Sparkles } from "lucide-react";
import { ErrorState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDay, formatTime, localDay } from "@/lib/format";
import { useCheckIn, useCheckOut, useToday } from "../hooks/useAttendance";
import { formatHours, formatMinutes, LEAVE_PORTIONS, LEAVE_TYPES, localTime } from "../utils/attendanceMeta";

/** Re-render every half minute while checked in, so the elapsed time stays current. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  // A timer is an external system → effect is correct.
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

/** Feature component: today's attendance. Shows automatic check-in, lateness, leave, and check-out. */
export function TodayCard({ compact = false }: { compact?: boolean }) {
  const toast = useToast();
  const date = localDay();
  const { data, isPending, error, refetch } = useToday(date);
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const record = data?.record ?? null;
  const working = Boolean(record && !record.checkOutAt);
  const now = useNow(working);

  if (error) return <ErrorState message="Unable to load today's attendance." onRetry={() => void refetch()} />;

  function handleCheckIn() {
    checkIn.mutate(
      { date, localTime: localTime() },
      { onSuccess: saved => toast.success(`Checked in at ${formatTime(saved.checkInAt)}`), onError: err => toast.error("Check-in failed", err.message) }
    );
  }
  function handleCheckOut() {
    checkOut.mutate({ date }, { onSuccess: saved => toast.success(`Checked out · ${formatHours(saved.hours)} today`), onError: err => toast.error("Check-out failed", err.message) });
  }

  const leave = data?.leave ?? null;
  const leaveLabel = leave ? `${LEAVE_TYPES[leave.type]?.label ?? "Leave"}${leave.portion !== "full" ? `, ${LEAVE_PORTIONS[leave.portion].short}` : ""}` : "";
  let status: ReactNode;
  let action: ReactNode = null;
  const badges: ReactNode[] = [];

  if (isPending) status = <p className="text-sm text-muted-foreground">Loading…</p>;
  else if (!record) {
    if (leave?.portion === "full") {
      status = (
        <p className="flex items-center gap-2 text-sm">
          <Palmtree className="h-4 w-4 text-primary" aria-hidden="true" />
          You&apos;re on {leaveLabel.toLowerCase()} today. No attendance is needed.
        </p>
      );
    } else if (data.holiday) {
      status = (
        <p className="flex items-center gap-2 text-sm">
          <CalendarHeart className="h-4 w-4 text-primary" aria-hidden="true" />
          Enjoy {data.holiday.name}! It&apos;s a {data.holiday.type === "optional" ? "holiday you picked" : "holiday"}, so no attendance is needed.
        </p>
      );
    } else if (!data.workingDay) {
      status = (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarOff className="h-4 w-4" aria-hidden="true" />
          {data.offReason ? `Today is ${data.offReason}. No attendance is needed.` : "Today isn't a working day."}
        </p>
      );
    } else {
      status = (
        <p className="text-sm text-muted-foreground">
          {data.autoCheckIn ? "Attendance is taken when you open TaskFlow. It hasn't been recorded yet today." : "You haven't checked in yet."}
          {` Workday starts at ${data.workdayStart}.`}
        </p>
      );
      action = (
        <Button onClick={handleCheckIn} loading={checkIn.isPending}>
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Check in
        </Button>
      );
    }
  } else {
    if (record.source === "auto") {
      badges.push(
        <Badge key="auto" tone="info">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Automatic
        </Badge>
      );
    }
    if (record.lateMinutes > 0)
      badges.push(
        <Badge key="late" tone="warning">
          {formatMinutes(record.lateMinutes)} late
        </Badge>
      );
    if (leave)
      badges.push(
        <Badge key="leave" tone="primary">
          {leaveLabel}
        </Badge>
      );

    if (working) {
      const elapsed = (now - new Date(record.checkInAt).getTime()) / 3_600_000;
      status = (
        <p className="text-sm">
          Working since <span className="font-semibold tabular-nums">{formatTime(record.checkInAt)}</span>
          <span className="text-muted-foreground"> · {formatHours(Math.max(0, elapsed))} so far</span>
        </p>
      );
      action = (
        <Button variant="secondary" onClick={handleCheckOut} loading={checkOut.isPending}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Check out
        </Button>
      );
    } else {
      status = (
        <p className="text-sm">
          <span className="tabular-nums">
            {formatTime(record.checkInAt)} to {formatTime(record.checkOutAt)}
          </span>
          <span className="font-semibold"> · {formatHours(record.hours)}</span>
          <span className="text-muted-foreground"> worked today</span>
        </p>
      );
    }
  }

  return (
    <section aria-labelledby="attendance-today-heading" className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="attendance-today-heading" className={compact ? "text-sm font-semibold" : "font-semibold"}>
            Attendance · {formatDay(date)}
          </h2>
          {badges}
        </div>
        <div className="mt-1">{status}</div>
      </div>
      {action}
    </section>
  );
}
