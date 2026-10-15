import type { Note, NoteAccess, NoteColor, ShareAll } from "../services/noteService";

// Mirrors server/src/routes/notes.js
export const NOTE_TITLE_MAX = 160;
export const NOTE_BODY_MAX = 20_000;

/** Complete Tailwind classes per colour (light and dark) so the build keeps them. */
export const COLOR_META: Record<NoteColor, { label: string; card: string; swatch: string }> = {
  yellow: {
    label: "Yellow",
    card: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-50",
    swatch: "bg-amber-300 dark:bg-amber-400",
  },
  pink: {
    label: "Pink",
    card: "border-pink-200 bg-pink-50 text-pink-950 dark:border-pink-400/25 dark:bg-pink-400/10 dark:text-pink-50",
    swatch: "bg-pink-300 dark:bg-pink-400",
  },
  blue: {
    label: "Blue",
    card: "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-50",
    swatch: "bg-sky-300 dark:bg-sky-400",
  },
  green: {
    label: "Green",
    card: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-50",
    swatch: "bg-emerald-300 dark:bg-emerald-400",
  },
  purple: {
    label: "Purple",
    card: "border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-50",
    swatch: "bg-violet-300 dark:bg-violet-400",
  },
  orange: {
    label: "Orange",
    card: "border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-400/25 dark:bg-orange-400/10 dark:text-orange-50",
    swatch: "bg-orange-300 dark:bg-orange-400",
  },
  gray: {
    label: "Gray",
    card: "border-zinc-200 bg-zinc-50 text-zinc-950 dark:border-zinc-400/25 dark:bg-zinc-400/10 dark:text-zinc-50",
    swatch: "bg-zinc-300 dark:bg-zinc-400",
  },
};

export const SHARE_ALL_LABELS: Record<ShareAll, string> = { none: "Off", view: "Can view", edit: "Can edit" };

export const canEdit = (access: NoteAccess) => access !== "view";
export const canControl = (access: NoteAccess) => access === "owner" || access === "manage";

/** Private / Shared with 3 / Everyone can view|edit */
export function shareLabel(note: Pick<Note, "shareAll" | "shareCount">) {
  if (note.shareAll !== "none") return `Everyone can ${note.shareAll}`;
  if (note.shareCount > 0) return `Shared with ${note.shareCount}`;
  return "Private";
}

export const noteHeading = (note: Pick<Note, "title" | "body">) => note.title.trim() || note.body.trim().split("\n")[0].slice(0, 60) || "Untitled note";

export interface NoteErrors {
  title?: string;
  body?: string;
}

/** Same rules as the server: limits, and a note can't be completely empty. */
export function validateNote({ title, body }: { title: string; body: string }): NoteErrors {
  const errors: NoteErrors = {};
  if (title.trim().length > NOTE_TITLE_MAX) errors.title = `Keep the title under ${NOTE_TITLE_MAX} characters.`;
  if (body.length > NOTE_BODY_MAX) errors.body = `Keep the note under ${NOTE_BODY_MAX.toLocaleString("en")} characters.`;
  if (!title.trim() && !body.trim()) errors.body = "Write a title or some text.";
  return errors;
}
