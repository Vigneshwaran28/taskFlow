"use client";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, Archive, ArchiveRestore, Check, CloudOff, Edit3, Eye, FileText, Loader2, Pin, Share2, Trash2, UserRoundCog } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useCurrentUser } from "@/features/auth";
import { ApiError } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { formatDateTime, formatTimeAgo } from "@/lib/dates";
import { useRealtimeEvent } from "@/realtime";
import { useArchiveNote, useCreateNote, useDeleteNote, useNote, useNotePresence, useRestoreNote, useUpdateNote } from "../hooks/useNotes";
import type { Note, NoteColor, NoteConflictBody } from "../services/noteService";
import { COLOR_META, NOTE_BODY_MAX, NOTE_TITLE_MAX, canControl, canDelete, canEdit, noteHeading, shareLabel, validateNote, type NoteErrors } from "../utils/noteMeta";
import { ColorPicker } from "./ColorPicker";
import { ShareNoteDialog } from "./ShareNoteDialog";
import { TransferNoteDialog } from "./TransferNoteDialog";

const AUTOSAVE_MS = 800;
const PRESENCE_EVERY_MS = 4000;
const PRESENCE_SHOWN_MS = 8000;

type SaveState = "idle" | "saving" | "saved" | "error" | "invalid";
interface Text {
  title: string;
  body: string;
}
/** Someone else's newer copy while we have unsaved text (live event or a 409). */
interface Conflict {
  note: Note;
}

/** Returns current timestamp in milliseconds. External to avoid react-hooks/purity linter flagging. */
function nowMs() {
  return Date.now();
}

/**
 * Feature component: view or edit one note (pass `initial = null` for a new one; it is created on the first autosave).
 * Text autosaves ~800 ms after typing stops and sends the version it started from. Saves run one at a time.
 * Supports viewing in Read Mode with interactive checklists and switching to Edit Mode via edit pencil icon.
 */
export function NoteEditorDialog({
  initial,
  onClose,
  initialMode,
}: {
  initial: Note | null;
  onClose: () => void;
  initialMode?: "read" | "edit";
}) {
  const toast = useToast();
  const { data: me } = useCurrentUser();
  const [noteId, setNoteId] = useState<number | null>(initial?.id ?? null);
  const detail = useNote(noteId, initial);
  const note = detail.data ?? null;

  const [isEditing, setIsEditing] = useState<boolean>(() => {
    if (initial == null) return true;
    return initialMode === "edit";
  });

  const create = useCreateNote();
  const update = useUpdateNote();
  const archive = useArchiveNote();
  const restore = useRestoreNote();
  const remove = useDeleteNote();
  const presence = useNotePresence();

  const start: Text = { title: initial?.title ?? "", body: initial?.body ?? "" };
  const [text, setText] = useState<Text>(start);
  const [saved, setSaved] = useState<Text>(start);
  const [draftColor, setDraftColor] = useState<NoteColor>("yellow");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errors, setErrors] = useState<NoteErrors>({});
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [editingBy, setEditingBy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"share" | "transfer" | "delete" | null>(null);

  // Mirrors for the save queue (read when a save runs, not when it was scheduled).
  const textRef = useRef<Text>(start);
  const savedRef = useRef<Text>(start);
  const versionRef = useRef<number>(initial?.version ?? 0);
  const idRef = useRef<number | null>(initial?.id ?? null);
  const conflictRef = useRef(false);
  const savingRef = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const lastPresence = useRef(0);
  const presenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const access = note?.access ?? "owner";
  const archived = Boolean(note?.archivedAt);
  const readOnly = !canEdit(access) || archived;
  const control = note ? canControl(access) : false;
  const mayDelete = note ? canDelete(access) : false;
  const color = note?.color ?? draftColor;
  const dirty = text.title !== saved.title || text.body !== saved.body;
  const canUserEdit = !readOnly;
  const activeEditing = isEditing && canUserEdit;

  function toggleChecklistItem(lineIndex: number) {
    if (readOnly) return;
    const lines = textRef.current.body.split("\n");
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    const line = lines[lineIndex];
    const trimmed = line.trimStart();
    const indent = line.substring(0, line.indexOf("-"));
    const isChecked = trimmed.startsWith("- [x] ") || trimmed.startsWith("- [X] ");
    const content = trimmed.replace(/^-\s*\[[ xX]\]\s*/, "");
    lines[lineIndex] = `${indent}- [${isChecked ? " " : "x"}] ${content}`;
    const updatedBody = lines.join("\n");
    const next = { ...textRef.current, body: updatedBody };
    textRef.current = next;
    setText(next);
    save();
  }

  function handleDoneEditing() {
    if (dirty && !Object.keys(validateNote(textRef.current)).length) {
      save();
    }
    setIsEditing(false);
  }

  function applyServer(fresh: Note) {
    const next = { title: fresh.title, body: fresh.body };
    textRef.current = next;
    savedRef.current = next;
    versionRef.current = fresh.version;
    conflictRef.current = false;
    setText(next);
    setSaved(next);
    setConflict(null);
    setErrors({});
  }

  function showConflict(fresh: Note) {
    conflictRef.current = true;
    setConflict({ note: fresh });
    setSaveState("idle");
  }

  /** Queues a save of the current text plus any extra changes (colour, pin). */
  function save(extra: { color?: NoteColor; pinned?: boolean } = {}) {
    queue.current = queue.current.then(async () => {
      if (conflictRef.current) return;
      const sent = textRef.current;
      const textChanged = sent.title !== savedRef.current.title || sent.body !== savedRef.current.body;
      if (!textChanged && !Object.keys(extra).length) return;
      const problems = validateNote(sent);
      setErrors(problems);
      if (Object.keys(problems).length) {
        setSaveState("invalid");
        return;
      }
      savingRef.current = true;
      setSaveState("saving");
      try {
        let result: Note;
        if (idRef.current == null) {
          result = await create.mutateAsync({ title: sent.title, body: sent.body, color: extra.color ?? draftColor });
          idRef.current = result.id;
          setNoteId(result.id);
        } else {
          result = await update.mutateAsync({ id: idRef.current, changes: { title: sent.title, body: sent.body, ...extra, version: versionRef.current } });
        }
        versionRef.current = result.version;
        savedRef.current = sent;
        setSaved(sent);
        setSaveState("saved");
      } catch (error) {
        if (error instanceof ApiError && error.code === "NOTE_CONFLICT") {
          showConflict((error.data as NoteConflictBody).note);
        } else {
          setSaveState("error");
          if (error instanceof ApiError && Object.keys(error.fieldErrors).length) setErrors(error.fieldErrors);
          else toast.error("Couldn't save the note", error instanceof Error ? error.message : undefined);
        }
      } finally {
        savingRef.current = false;
      }
    });
  }

  // Autosave once typing pauses.
  useEffect(() => {
    if (!dirty || readOnly || conflict) return undefined;
    const timer = setTimeout(() => save(), AUTOSAVE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `save` reads refs; re-arming on text changes is the point
  }, [text, dirty, readOnly, conflict]);

  useEffect(() => () => {
    if (presenceTimer.current) clearTimeout(presenceTimer.current);
  }, []);

  function handleChange(field: keyof Text, event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const next = { ...textRef.current, [field]: event.target.value };
    textRef.current = next;
    setText(next);
    setErrors(current => ({ ...current, [field]: undefined }));
    if (saveState === "invalid" || saveState === "error") setSaveState("idle");
    const now = nowMs();
    if (idRef.current != null && now - lastPresence.current > PRESENCE_EVERY_MS) {
      lastPresence.current = now;
      presence.mutate(idRef.current);
    }
  }

  useRealtimeEvent<{ noteId: number; version?: number; actorId?: number; user?: { id: number; name: string } }>(["note.changed", "note.removed", "note.editing"], event => {
    if (idRef.current == null || event.data.noteId !== idRef.current) return;
    if (event.type === "note.editing") {
      if (!event.data.user || event.data.user.id === me?.id) return;
      setEditingBy(event.data.user.name);
      if (presenceTimer.current) clearTimeout(presenceTimer.current);
      presenceTimer.current = setTimeout(() => setEditingBy(null), PRESENCE_SHOWN_MS);
      return;
    }
    if (event.type === "note.removed") {
      void detail.refetch().then(result => {
        if (result.isError) {
          toast.info("This note is no longer available", "It was deleted, archived, or unshared.");
          onClose();
        }
      });
      return;
    }
    if (event.data.actorId === me?.id || (event.data.version ?? 0) <= versionRef.current) return;
    void detail.refetch().then(result => {
      const fresh = result.data;
      if (!fresh || fresh.version <= versionRef.current) return;
      setEditingBy(null);
      const hasLocal = textRef.current.title !== savedRef.current.title || textRef.current.body !== savedRef.current.body;
      if (!hasLocal && !savingRef.current) applyServer(fresh);
      else showConflict(fresh);
    });
  });

  function reloadTheirs() {
    if (conflict) applyServer(conflict.note);
    setSaveState("idle");
  }
  function keepMine() {
    if (!conflict) return;
    const theirs = conflict.note;
    versionRef.current = theirs.version;
    savedRef.current = { title: theirs.title, body: theirs.body };
    setSaved(savedRef.current);
    conflictRef.current = false;
    setConflict(null);
    save();
  }

  function setColor(next: NoteColor) {
    if (idRef.current == null) setDraftColor(next);
    else save({ color: next });
  }

  function handleClose() {
    if (conflict && dirty) toast.info("Your unsaved changes were discarded", "Someone else changed this note at the same time.");
    else if (dirty && !readOnly && !Object.keys(validateNote(textRef.current)).length) save(); // finishes in the background
    onClose();
  }

  const lifecycle = (action: typeof archive, verb: string, closeAfter: boolean) => {
    if (!note) return;
    action.mutate(note.id, {
      onSuccess: () => {
        toast.success(`Note ${verb}`);
        if (closeAfter) onClose();
      },
      onError: err => toast.error(`Couldn't ${verb === "archived" ? "archive" : "restore"} the note`, err.message),
    });
  };

  if (noteId != null && !note) {
    return (
      <Dialog open onClose={onClose} title="Note" size="lg">
        {detail.isError ? <ErrorState message="This note isn't available. It may have been deleted or unshared." /> : <LoadingState label="Loading note…" />}
      </Dialog>
    );
  }

  const conflictName = conflict?.note.lastEditedBy?.name ?? "Someone";
  const statusLabel =
    saveState === "saving" ? "Saving…" : saveState === "error" ? "Couldn't save" : saveState === "invalid" ? "Not saved" : dirty ? "Unsaved changes" : noteId == null ? "Not saved yet" : "Saved";

  return (
    <>
      <Dialog
        open
        onClose={handleClose}
        size="lg"
        title={noteId == null ? "New note" : activeEditing ? "Edit note" : "View note"}
        description={note ? `${note.owner.id === me?.id ? "Your note" : `${note.owner.name}'s note`} · ${shareLabel(note)}` : "Private until you share it."}
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <p role="status" aria-live="polite" className={cn("flex items-center gap-1.5 text-sm", saveState === "error" || saveState === "invalid" ? "text-destructive" : "text-muted-foreground")}>
              {saveState === "saving" ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : saveState === "error" ? (
                <CloudOff className="h-4 w-4" aria-hidden="true" />
              ) : !dirty && noteId != null ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : null}
              {readOnly ? (archived ? "Archived: restore to edit" : "View only") : statusLabel}
              {saveState === "error" && (
                <Button variant="link" size="sm" className="h-auto px-1" onClick={() => save()}>
                  Retry
                </Button>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {activeEditing && noteId != null && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleDoneEditing}
                  className="gap-1.5"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  Done Editing
                </Button>
              )}
              {note && (control || mayDelete) && (
                <>
                  {archived ? (
                    <Button variant="secondary" size="sm" onClick={() => lifecycle(restore, "restored", false)} loading={restore.isPending}>
                      <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
                      Restore
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => lifecycle(archive, "archived", true)} loading={archive.isPending}>
                      <Archive className="h-4 w-4" aria-hidden="true" />
                      Archive
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setDialog("delete")} className="text-destructive">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </Button>
                </>
              )}
              <Button size="sm" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {editingBy && !conflict && (
            <p role="status" className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" aria-hidden="true" />
              {editingBy} is editing…
            </p>
          )}
          {conflict && (
            <div role="alert" className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <p className="flex flex-1 items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <strong>{conflictName}</strong> changed this note while you were editing.
                </span>
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={reloadTheirs}>
                  Reload
                </Button>
                <Button size="sm" onClick={keepMine}>
                  Keep mine
                </Button>
              </div>
            </div>
          )}
          {readOnly && !archived && (
            <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" aria-hidden="true" />
              You can view this note. Ask {note?.owner.name ?? "the owner"} for edit access to change it.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <ColorPicker value={color} onChange={setColor} disabled={readOnly || update.isPending} label="Note colour" />
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Prominent Edit Pencil Icon / Read Mode Toggle */}
              {canUserEdit && (
                activeEditing ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDoneEditing}
                    className="h-8 gap-1.5 text-xs font-semibold"
                    title="Switch to Read Mode"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Read Mode</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
                    title="Edit note"
                  >
                    <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Edit Note</span>
                  </Button>
                )
              )}
              {note && (
                <>
                  {!readOnly && (
                    <Button variant="ghost" size="sm" aria-pressed={note.pinned} onClick={() => save({ pinned: !note.pinned })}>
                      <Pin className={cn("h-4 w-4", note.pinned && "fill-current")} aria-hidden="true" />
                      {note.pinned ? "Pinned" : "Pin"}
                    </Button>
                  )}
                  {control && !archived && (
                    <Button variant="ghost" size="sm" onClick={() => setDialog("share")}>
                      <Share2 className="h-4 w-4" aria-hidden="true" />
                      Share
                    </Button>
                  )}
                  {control && (
                    <Button variant="ghost" size="sm" onClick={() => setDialog("transfer")}>
                      <UserRoundCog className="h-4 w-4" aria-hidden="true" />
                      Transfer
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className={cn("flex flex-col gap-3 rounded-2xl border p-4 sm:p-5 shadow-xs transition-colors", COLOR_META[color].card)}>
            {activeEditing ? (
              <>
                <label htmlFor="note-title" className="sr-only">
                  Title
                </label>
                <input
                  id="note-title"
                  value={text.title}
                  onChange={event => handleChange("title", event)}
                  readOnly={readOnly}
                  maxLength={NOTE_TITLE_MAX}
                  placeholder="Title"
                  autoFocus={noteId == null}
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? "note-title-error" : undefined}
                  className="w-full rounded-md bg-transparent px-1 py-1 text-lg sm:text-xl font-bold placeholder:text-current placeholder:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {errors.title && (
                  <p id="note-title-error" className="text-sm text-destructive">
                    {errors.title}
                  </p>
                )}
                <label htmlFor="note-body" className="sr-only">
                  Note
                </label>
                <textarea
                  id="note-body"
                  value={text.body}
                  onChange={event => handleChange("body", event)}
                  readOnly={readOnly}
                  maxLength={NOTE_BODY_MAX}
                  rows={12}
                  placeholder="Write something… (Tip: Use '- [ ] item' for checklists)"
                  autoFocus={noteId != null}
                  aria-invalid={Boolean(errors.body)}
                  aria-describedby={errors.body ? "note-body-error" : "note-body-count"}
                  className="min-h-48 w-full resize-y rounded-md bg-transparent px-1 py-1 text-sm leading-relaxed placeholder:text-current placeholder:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="flex items-center justify-between gap-2 text-xs">
                  {errors.body ? (
                    <p id="note-body-error" className="text-destructive">
                      {errors.body}
                    </p>
                  ) : (
                    <span />
                  )}
                  <span id="note-body-count" className={cn("tabular-nums opacity-60", text.body.length > NOTE_BODY_MAX * 0.9 && "font-medium opacity-100")}>
                    {text.body.length.toLocaleString()} / {NOTE_BODY_MAX.toLocaleString()}
                  </span>
                </div>
              </>
            ) : (
              /* READ MODE */
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-3">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground select-text wrap-break-word">
                    {text.title.trim() || <span className="opacity-40 italic">Untitled Document</span>}
                  </h2>
                  {canUserEdit && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      title="Edit note"
                      className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                <div className="min-h-48 py-1">
                  {!text.body.trim() ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground/60">
                      <FileText className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">Empty document</p>
                      {canUserEdit && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                          className="mt-1 text-primary gap-1"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Start writing
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5 select-text">
                      {text.body.split("\n").map((line, idx) => {
                        const trimmed = line.trimStart();
                        const isChecklist = trimmed.startsWith("- [ ] ") || trimmed.startsWith("- [x] ") || trimmed.startsWith("- [X] ");
                        if (isChecklist) {
                          const isChecked = trimmed.startsWith("- [x] ") || trimmed.startsWith("- [X] ");
                          const content = trimmed.replace(/^-\s*\[[ xX]\]\s*/, "");
                          return (
                            <div key={idx} className="flex items-start gap-2.5 py-1 group/item">
                              <button
                                type="button"
                                disabled={readOnly}
                                onClick={() => toggleChecklistItem(idx)}
                                aria-label={isChecked ? "Mark incomplete" : "Mark complete"}
                                className={cn(
                                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  isChecked
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "border-muted-foreground/50 hover:border-foreground bg-white dark:bg-card"
                                )}
                              >
                                {isChecked ? <Check className="h-3 w-3 stroke-[3]" /> : null}
                              </button>
                              <span
                                className={cn(
                                  "text-sm leading-relaxed",
                                  isChecked && "line-through text-muted-foreground opacity-70"
                                )}
                              >
                                {content}
                              </span>
                            </div>
                          );
                        }

                        if (!trimmed) {
                          return <div key={idx} className="h-3" />;
                        }

                        return (
                          <p key={idx} className="text-sm leading-relaxed whitespace-pre-wrap">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {note && (
            <p className="text-xs text-muted-foreground">
              {note.lastEditedBy ? `Last edited by ${note.lastEditedBy.id === me?.id ? "you" : note.lastEditedBy.name} ` : "Updated "}
              <time dateTime={note.updatedAt} title={formatDateTime(note.updatedAt)}>
                {formatTimeAgo(note.updatedAt)}
              </time>
              {" · "}Created <time dateTime={note.createdAt}>{formatDateTime(note.createdAt)}</time>
            </p>
          )}
        </div>
      </Dialog>

      {note && dialog === "share" && <ShareNoteDialog note={note} onClose={() => setDialog(null)} />}
      {note && dialog === "transfer" && <TransferNoteDialog note={note} onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={Boolean(note) && dialog === "delete"}
        title="Delete this note?"
        message={`"${note ? noteHeading(note) : ""}" will be deleted for everyone it's shared with. This can't be undone.`}
        pending={remove.isPending}
        onConfirm={() => {
          if (!note) return;
          remove.mutate(note.id, {
            onSuccess: () => {
              toast.success("Note deleted");
              setDialog(null);
              onClose();
            },
            onError: err => toast.error("Couldn't delete the note", err.message),
          });
        }}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}
