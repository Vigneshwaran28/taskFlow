"use client";
import { useState } from "react";
import { Clock, ExternalLink, Link as LinkIcon, Sparkles, Video, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/shared/Toaster";
import { PlatformIcon } from "./PlatformBadge";
import { useCreateMeeting, useUpdateMeeting } from "../hooks/useMeetings";
import type { Meeting, MeetingPlatform } from "../services/meetingService";

export interface MeetingDialogProps {
  open: boolean;
  onClose: () => void;
  meetingToEdit?: Meeting | null;
  initialPlatform?: MeetingPlatform;
}

function defaultDate() {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
}

function MeetingDialogForm({
  onClose,
  meetingToEdit,
  initialPlatform,
}: {
  onClose: () => void;
  meetingToEdit?: Meeting | null;
  initialPlatform?: MeetingPlatform;
}) {
  const toast = useToast();
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();

  const [platform, setPlatform] = useState<MeetingPlatform>(
    () => meetingToEdit?.platform || initialPlatform || "google_meet"
  );
  const [title, setTitle] = useState(() => meetingToEdit?.title || "");
  const [url, setUrl] = useState(() => {
    if (meetingToEdit?.url) return meetingToEdit.url;
    if (initialPlatform === "google_meet") return "https://meet.google.com/new";
    return "";
  });
  const [description, setDescription] = useState(() => meetingToEdit?.description || "");
  const [startDateStr, setStartDateStr] = useState(() =>
    meetingToEdit ? new Date(meetingToEdit.startAt).toISOString().slice(0, 16) : defaultDate()
  );
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [reminderMinutes, setReminderMinutes] = useState(() => meetingToEdit?.reminderMinutes ?? 5);

  function handleUrlChange(val: string) {
    setUrl(val);
    const lower = val.toLowerCase();
    if (lower.includes("meet.google.com")) setPlatform("google_meet");
    else if (lower.includes("zoom.us")) setPlatform("zoom");
    else if (lower.includes("teams.microsoft.com") || lower.includes("teams.live.com")) setPlatform("teams");
  }

  function handleQuickInstant(selectedPlatform: MeetingPlatform) {
    setPlatform(selectedPlatform);
    if (selectedPlatform === "google_meet") {
      setUrl("https://meet.google.com/new");
      if (!title) setTitle("Quick Google Meet");
      window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer");
      toast.info("Google Meet launched", "Google Meet opened in a new tab. Paste the meeting code/URL here to schedule and notify your workspace.");
    } else if (selectedPlatform === "zoom") {
      setUrl("https://zoom.us/start/videomeeting");
      if (!title) setTitle("Quick Zoom Meeting");
      window.open("https://zoom.us/start/videomeeting", "_blank", "noopener,noreferrer");
      toast.info("Zoom launched", "Zoom opened in a new tab. Paste your meeting room URL here to share with your team.");
    } else if (selectedPlatform === "teams") {
      setUrl("https://teams.microsoft.com");
      if (!title) setTitle("Quick Teams Meeting");
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
        toast.success("Meeting scheduled", "All workspace participants will receive a toast & sound alert 5 minutes before the meeting starts!");
      }
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save meeting";
      toast.error("Error", message);
    }
  }

  const isPending = createMeeting.isPending || updateMeeting.isPending;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-dialog-title"
      className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95"
    >
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Video className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="meeting-dialog-title" className="text-base font-semibold leading-none">
              {meetingToEdit ? "Edit Meeting" : "Schedule Workspace Meeting"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Google Meet, Zoom, Microsoft Teams with 5-minute sound alerts
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        {/* Platform selection */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Meeting Platform
          </label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPlatform("google_meet")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition ${
                platform === "google_meet"
                  ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "border-border bg-card hover:bg-muted text-muted-foreground"
              }`}
            >
              <PlatformIcon platform="google_meet" />
              <span>Google Meet</span>
            </button>

            <button
              type="button"
              onClick={() => setPlatform("zoom")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition ${
                platform === "zoom"
                  ? "border-sky-500 bg-sky-50/70 text-sky-900 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200"
                  : "border-border bg-card hover:bg-muted text-muted-foreground"
              }`}
            >
              <PlatformIcon platform="zoom" />
              <span>Zoom</span>
            </button>

            <button
              type="button"
              onClick={() => setPlatform("teams")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition ${
                platform === "teams"
                  ? "border-indigo-500 bg-indigo-50/70 text-indigo-900 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200"
                  : "border-border bg-card hover:bg-muted text-muted-foreground"
              }`}
            >
              <PlatformIcon platform="teams" />
              <span>Teams</span>
            </button>
          </div>
        </div>

        {/* Quick launch instant buttons */}
        {!meetingToEdit && (
          <div className="flex items-center justify-between rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Need an instant room?</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 text-xs"
                onClick={() => handleQuickInstant(platform)}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Launch {platform === "google_meet" ? "Meet" : platform === "zoom" ? "Zoom" : "Teams"}
              </Button>
            </div>
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
            className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Meeting URL */}
        <div>
          <label htmlFor="meeting-url" className="block text-xs font-semibold text-foreground">
            Meeting URL <span className="text-destructive">*</span>
          </label>
          <div className="relative mt-1">
            <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              id="meeting-url"
              type="url"
              required
              value={url}
              onChange={e => handleUrlChange(e.target.value)}
              placeholder="https://meet.google.com/xxx-yyyy-zzz or https://zoom.us/j/..."
              className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value={5}>5 mins before</option>
              <option value={10}>10 mins before</option>
              <option value={15}>15 mins before</option>
            </select>
          </div>
        </div>

        {/* Reminder Alert Notice */}
        <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong>5-Minute Alert:</strong> A toaster notification with an audible sound chime will alert all workspace members 5 minutes before the meeting starts.
          </span>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="meeting-description" className="block text-xs font-semibold text-foreground">
            Agenda or Notes <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            id="meeting-description"
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What will be discussed, links to docs, etc."
            className="mt-1 w-full resize-none rounded-xl border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="mt-2 flex items-center justify-end gap-2 border-t pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {meetingToEdit ? "Save Changes" : "Schedule & Share"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function MeetingDialog({ open, onClose, meetingToEdit, initialPlatform }: MeetingDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <MeetingDialogForm
        key={meetingToEdit?.id ? `edit-${meetingToEdit.id}` : `new-${initialPlatform || "default"}`}
        onClose={onClose}
        meetingToEdit={meetingToEdit}
        initialPlatform={initialPlatform}
      />
    </div>
  );
}
