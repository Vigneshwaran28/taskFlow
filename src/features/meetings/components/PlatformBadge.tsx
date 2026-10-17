"use client";
import { Video } from "lucide-react";
import { cn } from "@/lib/cn";
import type { MeetingPlatform } from "../services/meetingService";

export function PlatformIcon({ platform, className }: { platform: MeetingPlatform; className?: string }) {
  if (platform === "google_meet") {
    return (
      <svg className={cn("h-4 w-4 shrink-0", className)} viewBox="0 0 24 24" fill="none">
        <path d="M14 8.5V4.5C14 3.95 13.55 3.5 13 3.5H3C2.45 3.5 2 3.95 2 4.5V19.5C2 20.05 2.45 20.5 3 20.5H13C13.55 20.5 14 20.05 14 19.5V15.5L20 20.5C20.55 20.95 21.5 20.55 21.5 19.8V4.2C21.5 3.45 20.55 3.05 20 3.5L14 8.5Z" fill="#00832d" />
        <path d="M14 8.5L20 3.5C20.55 3.05 21.5 3.45 21.5 4.2V10L14 13.5V8.5Z" fill="#00ac47" />
        <path d="M14 13.5L21.5 10V19.8C21.5 20.55 20.55 20.95 20 20.5L14 15.5V13.5Z" fill="#ea4335" />
        <path d="M2 14.5V19.5C2 20.05 2.45 20.5 3 20.5H8.5L2 14.5Z" fill="#2684fc" />
        <path d="M8.5 20.5H13C13.55 20.5 14 20.05 14 19.5V14.5L8.5 20.5Z" fill="#00832d" />
        <path d="M2 4.5V9.5L8.5 3.5H3C2.45 3.5 2 3.95 2 4.5Z" fill="#ffba00" />
      </svg>
    );
  }

  if (platform === "zoom") {
    return (
      <svg className={cn("h-4 w-4 shrink-0", className)} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="5" fill="#2D8CFF" />
        <path d="M4.5 15.2V8.8C4.5 7.8 5.3 7 6.3 7H13.7C14.7 7 15.5 7.8 15.5 8.8V15.2C15.5 16.2 14.7 17 13.7 17H6.3C5.3 17 4.5 16.2 4.5 15.2Z" fill="white" />
        <path d="M16.5 10.2L19.5 8.2V15.8L16.5 13.8V10.2Z" fill="white" />
      </svg>
    );
  }

  if (platform === "teams") {
    return (
      <svg className={cn("h-4 w-4 shrink-0", className)} viewBox="0 0 24 24" fill="none">
        <path d="M14.5 8C15.88 8 17 6.88 17 5.5C17 4.12 15.88 3 14.5 3C13.12 3 12 4.12 12 5.5C12 6.88 13.12 8 14.5 8Z" fill="#5059C9" />
        <path d="M18.5 9H13.5C12.67 9 12 9.67 12 10.5V15.5C12.74 15.77 13.58 16 14.5 16C16.89 16 18.97 14.61 20 12.58V10.5C20 9.67 19.33 9 18.5 9Z" fill="#5059C9" />
        <path d="M9 9.5C10.66 9.5 12 8.16 12 6.5C12 4.84 10.66 3.5 9 3.5C7.34 3.5 6 4.84 6 6.5C6 8.16 7.34 9.5 9 9.5Z" fill="#7B83EB" />
        <path d="M12 11H6C4.9 11 4 11.9 4 13V18C4 19.66 5.34 21 7 21H11C12.66 21 14 19.66 14 18V13C14 11.9 13.1 11 12 11Z" fill="#7B83EB" />
      </svg>
    );
  }

  return <Video className={cn("h-4 w-4 shrink-0 text-primary", className)} aria-hidden="true" />;
}

export function PlatformBadge({ platform }: { platform: MeetingPlatform }) {
  const styles: Record<MeetingPlatform, { label: string; bg: string; text: string; border: string }> = {
    google_meet: {
      label: "Google Meet",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200 dark:border-emerald-800/60",
    },
    zoom: {
      label: "Zoom",
      bg: "bg-sky-50 dark:bg-sky-950/40",
      text: "text-sky-700 dark:text-sky-300",
      border: "border-sky-200 dark:border-sky-800/60",
    },
    teams: {
      label: "Microsoft Teams",
      bg: "bg-indigo-50 dark:bg-indigo-950/40",
      text: "text-indigo-700 dark:text-indigo-300",
      border: "border-indigo-200 dark:border-indigo-800/60",
    },
    custom: {
      label: "Video Call",
      bg: "bg-slate-50 dark:bg-slate-900/40",
      text: "text-slate-700 dark:text-slate-300",
      border: "border-slate-200 dark:border-slate-800",
    },
  };

  const style = styles[platform] || styles.custom;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold",
        style.bg,
        style.text,
        style.border
      )}
    >
      <PlatformIcon platform={platform} className="h-3.5 w-3.5" />
      <span>{style.label}</span>
    </span>
  );
}
