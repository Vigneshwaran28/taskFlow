"use client";
import { useState } from "react";
import { Clock, ExternalLink, Link as LinkIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/shared/Toaster";
import { PlatformIcon } from "./PlatformBadge";
import { useCreateMeeting, useUpdateMeeting } from "../hooks/useMeetings";
import type { Meeting, MeetingPlatform } from "../services/meetingService";
import { cn } from "@/lib/cn";

export interface MeetingDialogProps {
  open: boolean;
  onClose: () => void;
  meetingToEdit?: Meeting | null;
  initialPlatform?: MeetingPlatform;
}

const DEFAULT_PLATFORM_URLS: Record<MeetingPlatform, string> = {
  google_meet: "https://meet.google.com/new",
  zoom: "https://zoom.us/join",
  teams: "https://teams.microsoft.com",
  custom: "",
};

function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDefaultStartDate(): string {
  const now = new Date();
  // Next 15-minute slot in the future
  const roundedMinutes = Math.ceil((now.getMinutes() + 10) / 15) * 15;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), roundedMinutes, 0, 0);
  return toLocalDateTimeInputValue(d);
}

export function MeetingDialog({
  open,
  onClose,
  meetingToEdit,
  initialPlatform,
}: MeetingDialogProps) {
  const toast = useToast();
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();

  const [platform, setPlatform] = useState<MeetingPlatform>(
    () => meetingToEdit?.platform || initialPlatform || "google_meet"
  );
  const [title, setTitle] = useState(
    () => meetingToEdit?.title || "Team Sync"
  );
  const [url, setUrl] = useState(() => {
    if (meetingToEdit?.url) return meetingToEdit.url;
    return DEFAULT_PLATFORM_URLS[initialPlatform || "google_meet"] || "https://meet.google.com/new";
  });
  const [description, setDescription] = useState(
    () => meetingToEdit?.description || ""
  );
  const [startDateStr, setStartDateStr] = useState(() =>
    meetingToEdit
      ? toLocalDateTimeInputValue(new Date(meetingToEdit.startAt))
      : getDefaultStartDate()
  );
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [reminderMinutes, setReminderMinutes] = useState(
    () => meetingToEdit?.reminderMinutes ?? 5
  );

  function handlePlatformChange(nextPlatform: MeetingPlatform) {
    setPlatform(nextPlatform);
    // If the URL is empty or was the default of another platform, switch it to the new default
    const isCurrentDefault = Object.values(DEFAULT_PLATFORM_URLS).includes(url) || !url.trim();
    if (isCurrentDefault) {
      setUrl(DEFAULT_PLATFORM_URLS[nextPlatform] || "");
    }
  }

  function handleUrlChange(val: string) {
    setUrl(val);
    const lower = val.toLowerCase();
    if (lower.includes("meet.google.com")) setPlatform("google_meet");
    else if (lower.includes("zoom.us")) setPlatform("zoom");
    else if (lower.includes("teams.microsoft.com") || lower.includes("teams.live.com"))
      setPlatform("teams");
  }

  function handleQuickInstant(selectedPlatform: MeetingPlatform) {
    handlePlatformChange(selectedPlatform);
    if (selectedPlatform === "google_meet") {
      setUrl("https://meet.google.com/new");
      window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer");
      toast.info("Google Meet launched", "Google Meet opened in a new tab. Paste the meeting URL here to share with your team.");
    } else if (selectedPlatform === "zoom") {
      setUrl("https://zoom.us/start/videomeeting");
      window.open("https://zoom.us/start/videomeeting", "_blank", "noopener,noreferrer");
      toast.info("Zoom launched", "Zoom opened in a new tab. Paste your meeting room URL here to share.");
    } else if (selectedPlatform === "teams") {
      setUrl("https://teams.microsoft.com");
      window.open("https://teams.microsoft.com", "_blank", "noopener,noreferrer");
      toast.info("Microsoft Teams launched", "Teams opened in a new tab. Paste the meeting link here to share.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a meeting title.");
      return;
    }
    if (!url.trim()) {
      toast.error("Please enter a valid meeting URL.");
      return;
    }

    try {
      const startAtDate = new Date(startDateStr);
      if (isNaN(startAtDate.getTime())) {
        toast.error("Please enter a valid start date and time.");
        return;
      }
      const endAtDate = new Date(startAtDate.getTime() + durationMinutes * 60_000);

      if (meetingToEdit) {
        await updateMeeting.mutateAsync({
          id: meetingToEdit.id,
          title: title.trim(),
          description: description.trim() || null,
          platform,
          url: url.trim(),
          startAt: startAtDate.toISOString(),
          endAt: endAtDate.toISOString(),
          reminderMinutes,
        });
        toast.success("Meeting updated successfully");
      } else {
        await createMeeting.mutateAsync({
          title: title.trim(),
          description: description.trim() || null,
          platform,
          url: url.trim(),
          startAt: startAtDate.toISOString(),
          endAt: endAtDate.toISOString(),
          reminderMinutes,
        });
        toast.success(
          "Meeting scheduled",
          "All workspace participants will receive a toast & sound alert 5 minutes before the meeting starts!"
        );
      }
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save meeting";
      toast.error("Error", message);
    }
  }

  const isPending = createMeeting.isPending || updateMeeting.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={meetingToEdit ? "Edit Workspace Meeting" : "Schedule Workspace Meeting"}
      description="Google Meet, Zoom, or Microsoft Teams with automated 5-minute pre-meeting audio & toast reminders."
      size="lg"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="meeting-dialog-form"
            variant="primary"
            loading={isPending}
          >
            {meetingToEdit ? "Save Changes" : "Schedule & Share"}
          </Button>
        </div>
      }
    >
      <form
        id="meeting-dialog-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 text-left"
      >
        {/* Platform selection */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Meeting Platform
          </label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handlePlatformChange("google_meet")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                platform === "google_meet"
                  ? "border-emerald-500 bg-emerald-50/80 text-emerald-950 font-semibold shadow-xs dark:border-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-100"
                  : "border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <PlatformIcon platform="google_meet" />
              <span>Google Meet</span>
            </button>

            <button
              type="button"
              onClick={() => handlePlatformChange("zoom")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                platform === "zoom"
                  ? "border-sky-500 bg-sky-50/80 text-sky-950 font-semibold shadow-xs dark:border-sky-600 dark:bg-sky-950/60 dark:text-sky-100"
                  : "border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <PlatformIcon platform="zoom" />
              <span>Zoom</span>
            </button>

            <button
              type="button"
              onClick={() => handlePlatformChange("teams")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                platform === "teams"
                  ? "border-indigo-500 bg-indigo-50/80 text-indigo-950 font-semibold shadow-xs dark:border-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-100"
                  : "border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <PlatformIcon platform="teams" />
              <span>Teams</span>
            </button>
          </div>
        </div>

        {/* Quick launch instant buttons */}
        {!meetingToEdit && (
          <div className="flex items-center justify-between rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Need a fresh room link?</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() => handleQuickInstant(platform)}
            >
              <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Launch {platform === "google_meet" ? "Meet" : platform === "zoom" ? "Zoom" : "Teams"}
            </Button>
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="meeting-title" className="block text-xs font-semibold text-foreground">
            Meeting Title <span className="text-destructive">*</span>
          </label>
          <input
            id="meeting-title"
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Daily Standup, Sprint Review, Client Catchup"
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Meeting URL */}
        <div>
          <label htmlFor="meeting-url" className="block text-xs font-semibold text-foreground">
            Meeting URL <span className="text-destructive">*</span>
          </label>
          <div className="relative mt-1">
            <LinkIcon
              className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="meeting-url"
              type="url"
              required
              value={url}
              onChange={e => handleUrlChange(e.target.value)}
              placeholder="https://meet.google.com/xxx-yyyy-zzz or https://zoom.us/j/..."
              className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Start Date & Time + Duration + Sound Alert Timing */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="meeting-start" className="block text-xs font-semibold text-foreground">
              Date & Start Time
            </label>
            <div className="relative mt-1">
              <input
                id="meeting-start"
                type="datetime-local"
                required
                value={startDateStr}
                onChange={e => setStartDateStr(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div>
            <label htmlFor="meeting-duration" className="block text-xs font-semibold text-foreground">
              Duration
            </label>
            <select
              id="meeting-duration"
              value={durationMinutes}
              onChange={e => setDurationMinutes(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>

          <div>
            <label htmlFor="meeting-reminder" className="block text-xs font-semibold text-foreground">
              Sound Alert
            </label>
            <select
              id="meeting-reminder"
              value={reminderMinutes}
              onChange={e => setReminderMinutes(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value={5}>5 mins before</option>
              <option value={10}>10 mins before</option>
              <option value={15}>15 mins before</option>
            </select>
          </div>
        </div>

        {/* Reminder Alert Notice */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-muted/50 p-3 text-xs text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong>5-Minute Alert:</strong> A toaster notification with an audible chime will notify all workspace members {reminderMinutes} minutes before the meeting starts.
          </span>
        </div>

        {/* Description / Agenda */}
        <div>
          <label htmlFor="meeting-description" className="block text-xs font-semibold text-foreground">
            Agenda or Notes <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="meeting-description"
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What will be discussed, links to docs, etc."
            className="mt-1 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </form>
    </Dialog>
  );
}
