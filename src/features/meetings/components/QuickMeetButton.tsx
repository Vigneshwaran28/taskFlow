"use client";
import { useState, useRef, useEffect } from "react";
import { CalendarPlus, ChevronDown, ExternalLink, Video } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PlatformIcon } from "./PlatformBadge";
import { MeetingDialog } from "./MeetingDialog";
import type { MeetingPlatform } from "../services/meetingService";

export function QuickMeetButton() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPlatform, setDialogPlatform] = useState<MeetingPlatform>("google_meet");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node | null)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("pointerdown", onPointerDown);
      return () => document.removeEventListener("pointerdown", onPointerDown);
    }
  }, [dropdownOpen]);

  function handleInstantMeet(platform: MeetingPlatform) {
    setDropdownOpen(false);
    if (platform === "google_meet") {
      window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer");
    } else if (platform === "zoom") {
      window.open("https://zoom.us/start/videomeeting", "_blank", "noopener,noreferrer");
    } else if (platform === "teams") {
      window.open("https://teams.microsoft.com", "_blank", "noopener,noreferrer");
    }
  }

  function handleOpenSchedule(platform: MeetingPlatform = "google_meet") {
    setDropdownOpen(false);
    setDialogPlatform(platform);
    setDialogOpen(true);
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setDropdownOpen(c => !c)}
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
          title="Instant Video Meet or Schedule"
          className="gap-1.5 border-border/80 text-xs font-medium shadow-sm hover:border-primary/40 hover:bg-muted"
        >
          <Video className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="max-sm:hidden">Meet</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        </Button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full z-40 mt-1.5 w-60 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in zoom-in-95">
            <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Instant Meeting
            </div>

            <button
              type="button"
              onClick={() => handleInstantMeet("google_meet")}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground transition hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              <div className="flex items-center gap-2">
                <PlatformIcon platform="google_meet" />
                <span>Google Meet</span>
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => handleInstantMeet("zoom")}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground transition hover:bg-sky-50 dark:hover:bg-sky-950/40"
            >
              <div className="flex items-center gap-2">
                <PlatformIcon platform="zoom" />
                <span>Zoom</span>
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => handleInstantMeet("teams")}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground transition hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            >
              <div className="flex items-center gap-2">
                <PlatformIcon platform="teams" />
                <span>Microsoft Teams</span>
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </button>

            <div className="my-1 border-t border-border/60" />

            <button
              type="button"
              onClick={() => handleOpenSchedule()}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition"
            >
              <CalendarPlus className="h-4 w-4" />
              <span>Schedule & Set 5m Reminder</span>
            </button>
          </div>
        )}
      </div>

      <MeetingDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialPlatform={dialogPlatform}
      />
    </>
  );
}
