"use client";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/shared/Toaster";
import { localDay } from "@/lib/format";
import { useAutoAttendance } from "../hooks/useAttendance";
import { formatMinutes, localTime } from "../utils/attendanceMeta";

const STORAGE_KEY = "tf-auto-attendance";

/** Whether this browser already asked the server today (avoids a request on every page load). */
function askedToday(userId: number, day: string) {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === `${userId}:${day}`;
  } catch {
    return false;
  }
}

function rememberAsked(userId: number, day: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, `${userId}:${day}`);
  } catch {
    // Storage blocked: the server call is idempotent, so asking again later is harmless.
  }
}

/**
 * Feature component (renders nothing): when someone opens the app on a working day, the server takes
 * their attendance unless they're on full-day leave or the workspace turned automatic check-in off.
 */
export function AutoAttendance({ userId }: { userId: number }) {
  const toast = useToast();
  const { mutate } = useAutoAttendance();
  const started = useRef(false);

  // Opening the app is the trigger: an effect on mount is the right tool for this one-time side effect.
  useEffect(() => {
    const day = localDay();
    if (started.current || !userId || askedToday(userId, day)) return;
    started.current = true;
    mutate(
      { date: day, localTime: localTime() },
      {
        onSuccess: result => {
          rememberAsked(userId, day);
          if (!result.recorded || !result.record) return;
          const { lateMinutes, checkInLocal } = result.record;
          toast.success("Attendance taken", lateMinutes ? `Checked in at ${checkInLocal}, ${formatMinutes(lateMinutes)} late.` : `Checked in at ${checkInLocal}.`);
        },
      }
    );
  }, [userId, mutate, toast]);

  return null;
}
