"use client";
// Edit a note right on the board. Same rules as the editor dialog: autosave ~800 ms after typing stops, one save at a
// time with the version it started from, and a Reload / Keep mine choice when someone else saved in between.
import { useEffect, useRef, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent } from "react";
import { AlertTriangle, Check, CloudOff, Loader2 } from "lucide-react";
import { useToast } from "@/components/shared/Toaster";
import { useCurrentUser } from "@/features/auth";
import { ApiError } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { useRealtimeEvent } from "@/realtime";
import { useCreateNote, useNotePresence, useUpdateNote } from "../../hooks/useNotes";
import { noteService, type Note, type NoteColor, type NoteConflictBody, type NoteFont, type NoteTextSize } from "../../services/noteService";
import { FONT_META, noteFontPx } from "../../utils/fonts";
import { NOTE_BODY_MAX, NOTE_TITLE_MAX, validateNote } from "../../utils/noteMeta";

const AUTOSAVE_MS = 800;
const PRESENCE_EVERY_MS = 4000;

type SaveState = "idle" | "saving" | "saved" | "error" | "invalid";
interface Text {
  title: string;
  body: string;
}

export interface DraftNote {
  x: number;
  y: number;
  color: NoteColor;
  font: NoteFont;
  textSize: NoteTextSize;
}

/**
 * `note` is the note being edited, or null for a new one (created on the first autosave from `draft`).
 * `onDone` runs when editing finishes (Escape, Done, or focus leaving the note).
 */
export function InlineNoteEditor({ note, draft, onCreated, onDone }: { note: Note | null; draft?: DraftNote; onCreated?: (note: Note) => void; onDone: () => void }) {
  const toast = useToast();
  const { data: me } = useCurrentUser();
  const create = useCreateNote();
  const update = useUpdateNote();
  const presence = useNotePresence();

  const start: Text = { title: note?.title ?? "", body: note?.body ?? "" };
  const [text, setText] = useState<Text>(start);
  const [saved, setSaved] = useState<Text>(start);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Note | null>(null);
  const [created, setCreated] = useState(note != null);

  const textRef = useRef<Text>(start);
  const savedRef = useRef<Text>(start);
  const versionRef = useRef(note?.version ?? 0);
  const idRef = useRef<number | null>(note?.id ?? null);
  const conflictRef = useRef(false);
  const savingRef = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const lastPresence = useRef(0);
  const doneRef = useRef(false);

  const dirty = text.title !== saved.title || text.body !== saved.body;
  const font = note?.font ?? draft?.font ?? "caveat";
  const size = note?.textSize ?? draft?.textSize ?? "md";

  function applyServer(fresh: Note) {
    const next = { title: fresh.title, body: fresh.body };
    textRef.current = next;
    savedRef.current = next;
    versionRef.current = fresh.version;
    conflictRef.current = false;
    setText(next);
    setSaved(next);
    setConflict(null);
    setError(null);
  }

  function save() {
    queue.current = queue.current.then(async () => {
      if (conflictRef.current) return;
      const sent = textRef.current;
      if (sent.title === savedRef.current.title && sent.body === savedRef.current.body) return;
      const problems = validateNote(sent);
      if (Object.keys(problems).length) {
        setError(problems.title ?? problems.body ?? null);
        setSaveState("invalid");
        return;
      }
      savingRef.current = true;
      setSaveState("saving");
      try {
        let result: Note;
        if (idRef.current == null) {
          if (!draft) return;
          result = await create.mutateAsync({ title: sent.title, body: sent.body, color: draft.color, font: draft.font, textSize: draft.textSize, x: draft.x, y: draft.y });
          idRef.current = result.id;
          setCreated(true);
          onCreated?.(result);
        } else {
          result = await update.mutateAsync({ id: idRef.current, changes: { title: sent.title, body: sent.body, version: versionRef.current } });
        }
        versionRef.current = result.version;
        savedRef.current = sent;
        setSaved(sent);
        setError(null);
        setSaveState("saved");
      } catch (err) {
        if (err instanceof ApiError && err.code === "NOTE_CONFLICT") {
          conflictRef.current = true;
          setConflict((err.data as NoteConflictBody).note);
          setSaveState("idle");
        } else {
          setSaveState("error");
          if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setError(Object.values(err.fieldErrors)[0]);
          else toast.error("Couldn't save the note", err instanceof Error ? err.message : undefined);
        }
      } finally {
        savingRef.current = false;
      }
    });
  }

  useEffect(() => {
    if (!dirty || conflict) return undefined;
    const timer = setTimeout(() => save(), AUTOSAVE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `save` reads refs; re-arming on text changes is the point
  }, [text, dirty, conflict]);

  // Someone else saved: take their copy if we have nothing unsaved, otherwise ask.
  useRealtimeEvent<{ noteId: number; version?: number; actorId?: number }>("note.changed", event => {
    if (idRef.current == null || event.data.noteId !== idRef.current) return;
    if (event.data.actorId === me?.id || (event.data.version ?? 0) <= versionRef.current) return;
    void noteService
      .get(idRef.current)
      .then(fresh => {
        if (fresh.version <= versionRef.current) return;
        const local = textRef.current.title !== savedRef.current.title || textRef.current.body !== savedRef.current.body;
        if (!local && !savingRef.current) applyServer(fresh);
        else {
          conflictRef.current = true;
          setConflict(fresh);
        }
      })
      .catch(() => undefined);
  });

  function handleChange(field: keyof Text, event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const next = { ...textRef.current, [field]: event.target.value };
    textRef.current = next;
    setText(next);
    setError(null);
    if (saveState === "invalid" || saveState === "error") setSaveState("idle");
    const now = Date.now();
    if (idRef.current != null && now - lastPresence.current > PRESENCE_EVERY_MS) {
      lastPresence.current = now;
      presence.mutate(idRef.current);
    }
  }

  function keepMine() {
    if (!conflict) return;
    versionRef.current = conflict.version;
    savedRef.current = { title: conflict.title, body: conflict.body };
    setSaved(savedRef.current);
    conflictRef.current = false;
    setConflict(null);
    save();
  }

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    if (conflictRef.current && dirty) toast.info("Your unsaved changes were discarded", "Someone else changed this note at the same time.");
    else if (dirty && !Object.keys(validateNote(textRef.current)).length) save(); // finishes in the background
    onDone();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    event.stopPropagation(); // arrows and Delete edit text here, not the note's position
    if (event.key === "Escape") {
      event.preventDefault();
      finish();
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget as Node | null;
    // Leaving the whole note (not just moving between title and body, or into its menu) ends editing.
    const card = event.currentTarget.closest("[data-note], [data-draft]") ?? event.currentTarget;
    if (next && card.contains(next)) return;
    if (conflictRef.current) return; // keep the choice on screen
    finish();
  }

  const status =
    saveState === "saving" ? "Saving…" : saveState === "error" ? "Couldn't save" : saveState === "invalid" ? "Not saved" : dirty ? "Unsaved changes" : !created ? "Not saved yet" : "Saved";

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-1", (FONT_META[font] ?? FONT_META.caveat).className)} onKeyDown={handleKeyDown} onBlur={handleBlur} onPointerDown={event => event.stopPropagation()}>
      {conflict && (
        <div role="alert" className="flex flex-wrap items-center gap-1 rounded bg-white/70 px-1.5 py-1 font-sans text-xs text-amber-950">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <strong>{conflict.lastEditedBy?.name ?? "Someone"}</strong> changed this note.
          </span>
          <button type="button" className="rounded px-1.5 py-0.5 font-medium underline focus-visible:outline-2 focus-visible:outline-indigo-600" onClick={() => applyServer(conflict)}>
            Reload
          </button>
          <button type="button" className="rounded bg-amber-900 px-1.5 py-0.5 font-medium text-white focus-visible:outline-2 focus-visible:outline-indigo-600" onClick={keepMine}>
            Keep mine
          </button>
        </div>
      )}
      <label className="sr-only" htmlFor={`inline-title-${note?.id ?? "new"}`}>
        Title
      </label>
      <input
        id={`inline-title-${note?.id ?? "new"}`}
        value={text.title}
        onChange={event => handleChange("title", event)}
        maxLength={NOTE_TITLE_MAX}
        placeholder="Title"
        autoFocus={!note}
        className="w-full rounded bg-white/35 px-1 font-semibold placeholder:text-current placeholder:opacity-50 focus-visible:outline-2 focus-visible:outline-black/40"
        style={{ fontSize: Math.round(noteFontPx(font, size) * 1.1) }}
      />
      <label className="sr-only" htmlFor={`inline-body-${note?.id ?? "new"}`}>
        Note
      </label>
      <textarea
        id={`inline-body-${note?.id ?? "new"}`}
        value={text.body}
        onChange={event => handleChange("body", event)}
        maxLength={NOTE_BODY_MAX}
        placeholder="Write something… ([ ] makes a checkbox)"
        autoFocus={Boolean(note)}
        className="min-h-0 w-full flex-1 resize-none rounded bg-white/35 px-1 placeholder:text-current placeholder:opacity-50 focus-visible:outline-2 focus-visible:outline-black/40"
        style={{ fontSize: noteFontPx(font, size), lineHeight: 1.3 }}
      />
      <div className="flex items-center gap-2 font-sans text-[11px]">
        <p role="status" aria-live="polite" className={cn("flex min-w-0 flex-1 items-center gap-1 truncate", saveState === "error" || saveState === "invalid" ? "font-medium text-red-800" : "opacity-75")}>
          {saveState === "saving" ? (
            <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : saveState === "error" ? (
            <CloudOff className="h-3 w-3" aria-hidden="true" />
          ) : !dirty && created ? (
            <Check className="h-3 w-3" aria-hidden="true" />
          ) : null}
          {error ?? status}
        </p>
        <button type="button" onClick={finish} className="rounded bg-black/75 px-2 py-0.5 font-medium text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600">
          Done
        </button>
      </div>
    </div>
  );
}
