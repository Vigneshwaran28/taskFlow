"use client";
import { useState, useMemo } from "react";
import { ExternalLink, Plus, Users, Shield } from "lucide-react";
import type { Meeting } from "../services/meetingService";
import { PlatformIcon } from "./PlatformBadge";
import styles from "./ScheduledMeetingsCard.module.css";

export interface ScheduledMeetingsCardProps {
  meetings: Meeting[];
  onScheduleClick?: () => void;
  onEditMeeting?: (meeting: Meeting) => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ScheduledMeetingsCard({
  meetings,
  onScheduleClick,
  onEditMeeting,
}: ScheduledMeetingsCardProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // Generate 6 days around the selected date / current week
  const daysList = useMemo(() => {
    // Let's create a 6-day window around selectedDate
    const list: Date[] = [];
    const center = new Date(selectedDate);
    // Find Monday of the current week of selectedDate
    const dayOfWeek = center.getDay(); // 0 is Sun, 1 is Mon
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(center);
    monday.setDate(center.getDate() + diffToMon);

    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      list.push(d);
    }
    return list;
  }, [selectedDate]);

  const activeDateIndex = useMemo(() => {
    return daysList.findIndex(
      d =>
        d.getDate() === selectedDate.getDate() &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getFullYear() === selectedDate.getFullYear()
    );
  }, [daysList, selectedDate]);

  // Filter meetings for the selected date
  const selectedDayMeetings = useMemo(() => {
    return meetings.filter(m => {
      const mDate = new Date(m.startAt);
      return (
        mDate.getDate() === selectedDate.getDate() &&
        mDate.getMonth() === selectedDate.getMonth() &&
        mDate.getFullYear() === selectedDate.getFullYear()
      );
    });
  }, [meetings, selectedDate]);

  // Check which days have scheduled meetings for dot indicator highlights
  const daysWithMeetings = useMemo(() => {
    const set = new Set<string>();
    for (const m of meetings) {
      const md = new Date(m.startAt);
      set.add(`${md.getFullYear()}-${md.getMonth()}-${md.getDate()}`);
    }
    return set;
  }, [meetings]);

  function handleSelectDay(day: Date) {
    setSelectedDate(new Date(day));
  }

  function handleCycleMonth() {
    // Advance month by 1 or cycle through
    setMonthOffset(prev => (prev >= 11 ? 0 : prev + 1));
    const nextMonth = new Date(selectedDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setSelectedDate(nextMonth);
  }

  const currentMonthLabel = MONTH_NAMES[selectedDate.getMonth()];
  const formattedDayStr = `${DAY_NAMES[selectedDate.getDay()]}, ${selectedDate.getDate()}`;
  const callsCount = selectedDayMeetings.length;

  return (
    <div className={styles.meetingCard}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.title}>
          Upcoming<br />Meetings
        </div>
        <button
          type="button"
          className={styles.dateSelector}
          id="month-selector"
          onClick={handleCycleMonth}
          title="Click to change month"
        >
          <span>{currentMonthLabel}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            fill="currentColor"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
            />
          </svg>
        </button>
      </div>

      {/* Calls Info */}
      <div className={styles.callsInfo}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          fill="currentColor"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z" />
        </svg>
        <span>
          {callsCount} {callsCount === 1 ? "call" : "calls"} • {formattedDayStr}
        </span>
      </div>

      {/* Date Navigation & Indicators */}
      <div className={styles.dateNavAndIndicators}>
        <div className={styles.dateNavContainer}>
          {daysList.map((d, index) => {
            const isActive = index === activeDateIndex;
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => handleSelectDay(d)}
                className={`${styles.dayItem} ${isActive ? styles.dayActive : ""}`}
              >
                <div className={styles.dayNumber}>{d.getDate()}</div>
                <div className={styles.dayName}>{DAY_NAMES[d.getDay()]}</div>
              </button>
            );
          })}
        </div>

        <div className={styles.indicatorContainer}>
          <div className={styles.indicatorLine} />
          {daysList.map((d, index) => {
            const isActive = index === activeDateIndex;
            const hasMeeting = daysWithMeetings.has(
              `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
            );
            return (
              <div
                key={index}
                className={`${styles.indicatorDot} ${isActive ? styles.indicatorActive : ""} ${
                  !isActive && hasMeeting ? styles.indicatorHasMeetings : ""
                }`}
                title={hasMeeting ? "Has scheduled meetings" : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* Scheduled Calls List for Selected Day */}
      <div className={styles.scheduledList}>
        {selectedDayMeetings.length === 0 ? (
          <div className={styles.emptyCalls}>
            <p className="font-medium text-gray-700">No meetings on this day</p>
            {onScheduleClick && (
              <button
                type="button"
                onClick={onScheduleClick}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gray-900 underline hover:text-black"
              >
                <Plus className="h-3 w-3" /> Schedule a meeting
              </button>
            )}
          </div>
        ) : (
          selectedDayMeetings.map(m => {
            const startTimeStr = new Date(m.startAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div key={m.id} className={styles.callItem}>
                <div className={styles.callItemLeft}>
                  <div className={styles.callTimeBadge}>{startTimeStr}</div>
                  <div className={styles.callItemInfo}>
                    <div className="flex items-center gap-1.5">
                      <PlatformIcon platform={m.platform} className="h-3.5 w-3.5 shrink-0" />
                      <span className={styles.callTitle} title={m.title}>
                        {m.title}
                      </span>
                    </div>
                    <div className={styles.callMeta}>
                      <span>{m.platformLabel}</span>
                      {m.roles && m.roles.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-600">
                          • <Shield className="h-2.5 w-2.5" />
                          {m.roles.map(r => r.name).join(", ")}
                        </span>
                      )}
                      {m.participants && m.participants.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-600">
                          • <Users className="h-2.5 w-2.5" />
                          {m.participants.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.joinButton}
                  >
                    <span>Join</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {onEditMeeting && m.canManage && (
                    <button
                      type="button"
                      onClick={() => onEditMeeting(m)}
                      className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition"
                      title="Edit meeting"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
