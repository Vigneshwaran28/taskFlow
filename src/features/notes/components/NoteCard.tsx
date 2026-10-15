"use client";
import { Archive, Eye, Globe, Lock, Pin, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateTime, formatTimeAgo } from "@/lib/dates";
import type { Note } from "../services/noteService";
import { COLOR_META, noteHeading, shareLabel } from "../utils/noteMeta";

/** A sticky note on the board. The whole card is one button that opens the editor. */
export function NoteCard({ note, currentUserId, onOpen }: { note: Note; currentUserId: number | undefined; onOpen: (note: Note) => void }) {
  const ShareIcon = note.shareAll !== "none" ? Globe : note.shareCount > 0 ? Users : Lock;
  const preview = note.body.length > 400 ? `${note.body.slice(0, 400)}…` : note.body;
  const mine = note.owner.id === currentUserId;
  return (
    <button
      type="button"
      onClick={() => onOpen(note)}
      aria-label={`${noteHeading(note)}${note.pinned ? ", pinned" : ""}. ${mine ? "Your note" : `By ${note.owner.name}`}. ${shareLabel(note)}.`}
      className={cn(
        "mb-4 flex w-full break-inside-avoid flex-col gap-2 rounded-xl border p-4 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        COLOR_META[note.color].card
      )}
    >
      <div className="flex items-start gap-2">
        <h3 className={cn("min-w-0 flex-1 break-words font-semibold", !note.title.trim() && "italic opacity-70")}>{note.title.trim() || "Untitled note"}</h3>
        {note.pinned && <Pin className="mt-0.5 h-4 w-4 shrink-0 fill-current" aria-hidden="true" />}
      </div>
      {preview && <p className="line-clamp-[10] whitespace-pre-wrap break-words text-sm leading-relaxed opacity-90">{preview}</p>}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs opacity-75">
        <span className="truncate">{mine ? "You" : note.owner.name}</span>
        <span className="inline-flex items-center gap-1">
          <ShareIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {shareLabel(note)}
        </span>
        {note.access === "view" && (
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            View only
          </span>
        )}
        {note.archivedAt && (
          <span className="inline-flex items-center gap-1">
            <Archive className="h-3.5 w-3.5" aria-hidden="true" />
            Archived
          </span>
        )}
        <time className="ml-auto" dateTime={note.updatedAt} title={formatDateTime(note.updatedAt)}>
          {formatTimeAgo(note.updatedAt)}
        </time>
      </div>
    </button>
  );
}
