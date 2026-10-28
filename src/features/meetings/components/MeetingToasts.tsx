"use client";
// 5-minute upcoming meeting reminder toaster with audio sound alert and 1-click Join button.
// Triggers on realtime WebSocket event "meeting.reminder" as well as client-side timer backup.
import { useCallback, useEffect, useRef } from "react";
import { useToast } from "@/components/shared/Toaster";
import { playMeetingChime } from "@/lib/sound";
import { useRealtimeEvent } from "@/realtime";
import { useMeetings } from "../hooks/useMeetings";

interface MeetingReminderEvent {
  meetingId: number;
  title: string;
  platform: string;
  url: string;
  startAt: string;
  reminderMinutes?: number;
}

function platformName(platform: string) {
  switch (platform) {
    case "google_meet":
      return "Google Meet";
    case "zoom":
      return "Zoom";
    case "teams":
      return "Microsoft Teams";
    default:
      return "Video Call";
  }
}

export function MeetingToasts() {
  const toast = useToast();
  const notified = useRef(new Set<string>());
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const { data: upcomingMeetings } = useMeetings({ scope: "upcoming" });

  const triggerMeetingAlert = useCallback((meeting: { id: number; title: string; platform: string; url: string; startAt: string }) => {
    const key = `meeting-${meeting.id}-${meeting.startAt}`;
    if (notified.current.has(key)) return;
    notified.current.add(key);

    // Play pleasant 3-note harmonic chime
    playMeetingChime();

    // Show rich action toast with 1-click Join Meeting button
    const pName = platformName(meeting.platform);
    toast.info(`Upcoming meeting: ${meeting.title}`, `Starts in 5 minutes on ${pName}. Click Join to connect now.`, {
      badge: pName,
      duration: 15000,
      action: {
        label: "Join Meeting",
        onClick: () => {
          if (typeof window !== "undefined" && /^https?:\/\//i.test(meeting.url)) {
            window.open(meeting.url, "_blank", "noopener,noreferrer");
          }
        },
        external: true,
      },
    });
  }, [toast]);

  // 1. Listen for realtime WebSocket meeting.reminder events from server scheduler
  useRealtimeEvent<MeetingReminderEvent>("meeting.reminder", ({ data }) => {
    if (!data?.meetingId || !data.url) return;
    triggerMeetingAlert({
      id: data.meetingId,
      title: data.title,
      platform: data.platform,
      url: data.url,
      startAt: data.startAt,
    });
  });

  // 2. Client-side timer backup: monitors upcoming meetings currently in state
  useEffect(() => {
    if (!upcomingMeetings || !upcomingMeetings.length) return;

    const now = Date.now();
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const TEN_MINUTES_MS = 10 * 60 * 1000;

    for (const meeting of upcomingMeetings) {
      if (!meeting.isParticipant && meeting.participants.length > 0) continue;

      const startTime = new Date(meeting.startAt).getTime();
      const timeUntilMeeting = startTime - now;
      const timeUntilAlert = timeUntilMeeting - FIVE_MINUTES_MS;

      // If meeting starts in <= 5 minutes (and started within the last 10 minutes)
      if (timeUntilMeeting <= FIVE_MINUTES_MS && timeUntilMeeting >= -TEN_MINUTES_MS) {
        triggerMeetingAlert(meeting);
      } else if (timeUntilAlert > 0 && timeUntilAlert <= 24 * 60 * 60 * 1000) {
        // Schedule exact timer for meetings starting later today
        if (!timers.current.has(meeting.id)) {
          const timerId = setTimeout(() => {
            timers.current.delete(meeting.id);
            triggerMeetingAlert(meeting);
          }, timeUntilAlert);
          timers.current.set(meeting.id, timerId);
        }
      }
    }
  }, [upcomingMeetings, triggerMeetingAlert]);

  // Cleanup pending timers on unmount
  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const t of activeTimers.values()) clearTimeout(t);
      activeTimers.clear();
    };
  }, []);

  return null;
}
