"use client";
import { useState } from "react";
import { Calendar, Check, Clock, Copy, ExternalLink, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Avatar, initials } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/shared/Toaster";
import { PlatformBadge } from "./PlatformBadge";
import { useDeleteMeeting } from "../hooks/useMeetings";
import type { Meeting } from "../services/meetingService";

export interface MeetingCardProps {
  meeting: Meeting;
  onEdit?: (meeting: Meeting) => void;
}

export function MeetingCard({ meeting, onEdit }: MeetingCardProps) {
  const toast = useToast();
  const deleteMeeting = useDeleteMeeting();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const startDate = new Date(meeting.startAt);
  const now = new Date();
  const diffMinutes = Math.round((startDate.getTime() - now.getTime()) / 60_000);

  const isToday = startDate.toDateString() === now.toDateString();
  const isImminent = diffMinutes >= 0 && diffMinutes <= 5;
  const isLive = diffMinutes < 0 && diffMinutes >= -30;

  function copyMeetingLink() {
    navigator.clipboard.writeText(meeting.url).then(() => {
      setCopied(true);
      toast.success("Meeting link copied", meeting.url);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDelete() {
    if (confirm("Are you sure you want to delete this meeting?")) {
      deleteMeeting.mutate(meeting.id, {
        onSuccess: () => toast.success("Meeting deleted"),
        onError: err => toast.error("Couldn't delete meeting", err.message),
      });
    }
  }

  const formatTimeStr = () => {
    return startDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formatDateStr = () => {
    if (isToday) return `Today at ${formatTimeStr()}`;
    return startDate.toLocaleDateString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${
        isImminent
          ? "border-primary/50 bg-primary/[0.03] ring-1 ring-primary/30"
          : isLive
          ? "border-emerald-500/40 bg-emerald-500/[0.02]"
          : "border-border bg-card hover:border-border/80"
      }`}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <PlatformBadge platform={meeting.platform} />
            {isImminent && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 animate-pulse">
                <Clock className="h-3 w-3" />
                Starts in {diffMinutes}m
              </span>
            )}
            {isLive && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                Happening now
              </span>
            )}
          </div>

          {meeting.canManage && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(c => !c)}
                aria-label="Meeting actions"
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </button>
              {menuOpen && (
                <div
                  onMouseLeave={() => setMenuOpen(false)}
                  className="absolute right-0 top-full z-20 mt-1 w-32 overflow-hidden rounded-xl border bg-card p-1 shadow-lg"
                >
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(meeting);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleDelete();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Meeting Title & Description */}
        <h3 className="mt-3 text-base font-semibold text-foreground tracking-tight line-clamp-2">
          {meeting.title}
        </h3>
        {meeting.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {meeting.description}
          </p>
        )}

        {/* Timing info */}
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="font-medium">{formatDateStr()}</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
        {/* Host Avatar */}
        <div className="flex items-center gap-2">
          {meeting.createdBy && (
            <div className="flex items-center gap-2" title={`Organized by ${meeting.createdBy.name}`}>
              {meeting.createdBy.avatarUrl ? (
                <Avatar name={meeting.createdBy.name} imageUrl={meeting.createdBy.avatarUrl} className="h-6 w-6 text-[10px]" />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  {initials(meeting.createdBy.name)}
                </div>
              )}
              <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                {meeting.createdBy.name.split(" ")[0]}
              </span>
            </div>
          )}
        </div>

        {/* Copy Link & Join Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={copyMeetingLink}
            title="Copy meeting link to clipboard"
            className="h-8 px-2 text-xs"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="max-sm:hidden ml-1">{copied ? "Copied" : "Copy"}</span>
          </Button>

          <a
            href={meeting.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>Join</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
