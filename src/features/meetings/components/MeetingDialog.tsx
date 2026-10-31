"use client";
import { useState } from "react";
import { Check, Clock, ExternalLink, Link as LinkIcon, Search, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/shared/Toaster";
import { PlatformIcon } from "./PlatformBadge";
import { useCreateMeeting, useMeetingAssignableOptions, useUpdateMeeting } from "../hooks/useMeetings";
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
  const { data: assignable } = useMeetingAssignableOptions();

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

  // Assignment states: All workspace vs Target specific users & roles
  const [targetMode, setTargetMode] = useState<"all" | "targeted">(() => {
    if (meetingToEdit) {
      const hasRoles = (meetingToEdit.roleIds?.length ?? 0) > 0;
      const hasParticipants = (meetingToEdit.participants?.length ?? 0) > 0;
      return hasRoles || hasParticipants ? "targeted" : "all";
    }
    return "all";
  });
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>(
    () => meetingToEdit?.roleIds || []
  );
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>(
    () => meetingToEdit?.participants?.map(p => p.id) || []
  );
  const [userSearchQuery, setUserSearchQuery] = useState("");

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

  function toggleRole(roleId: number) {
    setSelectedRoleIds(prev =>
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  }

  function toggleUser(userId: number) {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
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

      const roleIds = targetMode === "targeted" ? selectedRoleIds : [];
      const participantIds = targetMode === "targeted" ? selectedUserIds : [];

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
          roleIds,
          participantIds,
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
          roleIds,
          participantIds,
        });
        toast.success(
          "Meeting scheduled",
          targetMode === "targeted"
            ? "Assigned users and roles will receive a notification and sound alert 5 minutes before the meeting starts!"
            : "All workspace participants will receive a toast & sound alert 5 minutes before the meeting starts!"
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

  const filteredUsers = (assignable?.users || []).filter(u => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.jobTitle && u.jobTitle.toLowerCase().includes(q))
    );
  });

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

        {/* Assign Attendees & Roles */}
        <div className="rounded-xl border border-border/80 bg-card/60 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-xs font-semibold text-foreground">
                Assigned Attendees &amp; Roles
              </span>
              <p className="text-[11px] text-muted-foreground">
                Choose who is invited and receives meeting reminders.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setTargetMode("all")}
                className={cn(
                  "rounded-md px-2.5 py-1 transition",
                  targetMode === "all"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All Workspace
              </button>
              <button
                type="button"
                onClick={() => setTargetMode("targeted")}
                className={cn(
                  "rounded-md px-2.5 py-1 transition",
                  targetMode === "targeted"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Targeted
              </button>
            </div>
          </div>

          {targetMode === "all" ? (
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
              <Users className="h-4 w-4 text-primary shrink-0" />
              <span>Everyone in this workspace is invited and will see this meeting on their dashboard.</span>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {/* Role-based selection */}
              <div>
                <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Role-Based Options (Assign by Role)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {assignable?.roles && assignable.roles.length > 0 ? (
                    assignable.roles.map(r => {
                      const isSelected = selectedRoleIds.includes(r.id);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => toggleRole(r.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30"
                          )}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>{r.name}</span>
                          {typeof r.memberCount === "number" && (
                            <span className="text-[10px] opacity-75 font-mono">({r.memberCount})</span>
                          )}
                          {isSelected && <Check className="h-3 w-3 stroke-[2.5]" />}
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-xs text-muted-foreground">No workspace roles found.</span>
                  )}
                </div>
              </div>

              {/* Particular users selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wider">
                    Particular Users ({selectedUserIds.length} selected)
                  </label>
                  {selectedUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedUserIds([])}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Selected user chips */}
                {selectedUserIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedUserIds.map(uid => {
                      const u = assignable?.users.find(usr => usr.id === uid);
                      if (!u) return null;
                      return (
                        <span
                          key={u.id}
                          className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-xs text-secondary-foreground"
                        >
                          <span>{u.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleUser(u.id)}
                            className="rounded-full hover:bg-muted p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Search user */}
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    placeholder="Search user by name or email..."
                    className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                {/* User selection scroll box */}
                <div className="max-h-36 overflow-y-auto rounded-lg border border-border/70 bg-background/50 divide-y divide-border/50 text-xs">
                  {filteredUsers.length === 0 ? (
                    <div className="p-3 text-center text-muted-foreground">No matching users found</div>
                  ) : (
                    filteredUsers.map(u => {
                      const isSelected = selectedUserIds.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleUser(u.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-1.5 text-left transition hover:bg-muted/60",
                            isSelected && "bg-primary/5 font-medium"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary shrink-0 uppercase">
                              {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                              ) : (
                                u.name.slice(0, 2)
                              )}
                            </div>
                            <div className="truncate">
                              <span className="block truncate text-foreground">{u.name}</span>
                              <span className="block truncate text-[10px] text-muted-foreground">{u.email}</span>
                            </div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </Dialog>
  );
}
