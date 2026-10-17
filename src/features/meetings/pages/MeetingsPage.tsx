"use client";
import { useState } from "react";
import {
  CalendarPlus,
  Clock,
  ExternalLink,
  Plus,
  Search,
  Video,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/shared/Toaster";
import { playMeetingChime } from "@/lib/sound";
import { PlatformIcon } from "../components/PlatformBadge";
import { MeetingCard } from "../components/MeetingCard";
import { MeetingDialog } from "../components/MeetingDialog";
import { useMeetings } from "../hooks/useMeetings";
import type { Meeting, MeetingPlatform } from "../services/meetingService";

export function MeetingsPage() {
  const toast = useToast();
  const [scope, setScope] = useState<"upcoming" | "today" | "past" | "all">("upcoming");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [meetingToEdit, setMeetingToEdit] = useState<Meeting | null>(null);
  const [dialogPlatform, setDialogPlatform] = useState<MeetingPlatform>("google_meet");

  const { data: meetings = [], isLoading, isError, refetch } = useMeetings({ scope, search });

  function handleInstantLaunch(platform: MeetingPlatform) {
    if (platform === "google_meet") {
      window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer");
      setDialogPlatform("google_meet");
      setMeetingToEdit(null);
      setDialogOpen(true);
      toast.info("Google Meet opened", "Opened meet.google.com/new in a tab. Paste your meeting URL here to notify the workspace!");
    } else if (platform === "zoom") {
      window.open("https://zoom.us/start/videomeeting", "_blank", "noopener,noreferrer");
      setDialogPlatform("zoom");
      setMeetingToEdit(null);
      setDialogOpen(true);
      toast.info("Zoom opened", "Zoom launched in a new tab. Paste the room link here to schedule.");
    } else if (platform === "teams") {
      window.open("https://teams.microsoft.com", "_blank", "noopener,noreferrer");
      setDialogPlatform("teams");
      setMeetingToEdit(null);
      setDialogOpen(true);
      toast.info("Microsoft Teams opened", "Teams launched in a new tab. Paste the invite link here to share.");
    }
  }

  function handleTestSound() {
    playMeetingChime();
    toast.info("Meeting Sound Alert Test", "This pleasant 3-note chime plays with the 5-minute reminder toast before your meeting starts.");
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Video className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Workspace Meetings</h1>
              <p className="text-sm text-muted-foreground">
                Join or schedule Google Meet, Zoom, and Microsoft Teams with 5-minute sound alerts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleTestSound}
            title="Preview the 5-minute meeting reminder sound"
            className="gap-1.5 text-xs font-medium"
          >
            <Volume2 className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Test Sound Alert</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setMeetingToEdit(null);
              setDialogPlatform("google_meet");
              setDialogOpen(true);
            }}
            className="gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Schedule Meeting</span>
          </Button>
        </div>
      </div>

      {/* Quick Launch Action Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Google Meet Card */}
        <button
          type="button"
          onClick={() => handleInstantLaunch("google_meet")}
          className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-4 text-left transition hover:border-emerald-500/50 hover:bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card shadow-xs">
              <PlatformIcon platform="google_meet" className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">Google Meet</span>
                <span className="rounded-full bg-emerald-600/10 px-1.5 py-0.2 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                  Instant
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Launch room & share</p>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-60 transition group-hover:opacity-100 group-hover:text-emerald-600" />
        </button>

        {/* Zoom Card */}
        <button
          type="button"
          onClick={() => handleInstantLaunch("zoom")}
          className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-sky-500/20 bg-sky-50/50 p-4 text-left transition hover:border-sky-500/50 hover:bg-sky-50 dark:border-sky-900/30 dark:bg-sky-950/20 dark:hover:bg-sky-950/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card shadow-xs">
              <PlatformIcon platform="zoom" className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">Zoom</span>
                <span className="rounded-full bg-sky-600/10 px-1.5 py-0.2 text-[10px] font-medium text-sky-700 dark:text-sky-400">
                  Instant
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Start personal meeting</p>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-60 transition group-hover:opacity-100 group-hover:text-sky-600" />
        </button>

        {/* Microsoft Teams Card */}
        <button
          type="button"
          onClick={() => handleInstantLaunch("teams")}
          className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-indigo-500/20 bg-indigo-50/50 p-4 text-left transition hover:border-indigo-500/50 hover:bg-indigo-50 dark:border-indigo-900/30 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card shadow-xs">
              <PlatformIcon platform="teams" className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">Microsoft Teams</span>
                <span className="rounded-full bg-indigo-600/10 px-1.5 py-0.2 text-[10px] font-medium text-indigo-700 dark:text-indigo-400">
                  Instant
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Connect with team</p>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-60 transition group-hover:opacity-100 group-hover:text-indigo-600" />
        </button>
      </div>

      {/* 5-minute reminder notice banner */}
      <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-2.5 text-xs text-foreground">
          <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong>Automatic 5-Minute Alert:</strong> You and all participants receive a popup notification with an audible chime 5 minutes before any scheduled meeting.
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
        <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
          {(["upcoming", "today", "past", "all"] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setScope(tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                scope === tab
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search meetings by title or link…"
            className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-1.5 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Meeting Cards Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Loading meetings…
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center text-sm text-destructive">
          <p>Failed to load meetings.</p>
          <Button variant="secondary" size="sm" onClick={() => void refetch()} className="mt-3">
            Retry
          </Button>
        </div>
      ) : meetings.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {meetings.map(m => (
            <MeetingCard
              key={m.id}
              meeting={m}
              onEdit={mToEdit => {
                setMeetingToEdit(mToEdit);
                setDialogOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Video className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-foreground">No meetings found</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            {search ? "No meetings match your search query." : "No upcoming meetings scheduled. Start an instant Google Meet, Zoom, or Teams call or schedule one below."}
          </p>
          <Button
            size="sm"
            onClick={() => {
              setMeetingToEdit(null);
              setDialogPlatform("google_meet");
              setDialogOpen(true);
            }}
            className="mt-4 gap-1.5 text-xs"
          >
            <CalendarPlus className="h-4 w-4" />
            Schedule First Meeting
          </Button>
        </div>
      )}

      {/* Schedule / Edit Dialog */}
      <MeetingDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        meetingToEdit={meetingToEdit}
        initialPlatform={dialogPlatform}
      />
    </div>
  );
}
