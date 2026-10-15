"use client";
// Feature component: the sticky-notes board. Each person's layout (positions, sizes, tilt, stacking) and board settings
// are their own; content (text, colour, font, size, pin) is shared and saved with version checks as everywhere else.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Grid3x3, LayoutGrid, Maximize, Minus, Plus, Search, StickyNote as StickyIcon } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { useCan, useCurrentUser } from "@/features/auth";
import { cn } from "@/lib/cn";
import { useSearchParam } from "@/lib/navigation";
import { useRealtimeEvent } from "@/realtime";
import { useBoardLayout, useBoardPatch, useStableActions } from "../../hooks/useBoardActions";
import { useIsNarrow } from "../../hooks/useBoardPrefs";
import { useArchiveNote, useDeleteNote, useNoteBoard, useNotes, useSaveNoteBoard } from "../../hooks/useNotes";
import { BOARD_BACKGROUNDS, NOTE_FONTS, NOTE_TEXT_SIZES, type Note, type NoteColor, type NoteFont, type NotePosition, type NoteTextSize } from "../../services/noteService";
import { BACKGROUND_META, DEFAULT_NOTE_SIZE, ZOOM_STEPS, clampZoom, layoutNotes, matchesSearch, snap, toggleChecklistLine } from "../../utils/boardMeta";
import { FONT_META, TEXT_SIZE_META } from "../../utils/fonts";
import { canEdit, noteHeading } from "../../utils/noteMeta";
import { ColorPicker } from "../ColorPicker";
import { ShareNoteDialog } from "../ShareNoteDialog";
import { InlineNoteEditor, type DraftNote } from "./InlineNoteEditor";
import { NoteText, PaperDecor, paperStyle } from "./Paper";
import { HINT_ID, StickyNote, type StickyActions } from "./StickyNote";

type BoardScope = "all" | "mine" | "shared";
const SCOPES: { value: BoardScope; label: string }[] = [
  { value: "all", label: "All notes" },
  { value: "mine", label: "Mine" },
  { value: "shared", label: "Shared with me" },
];
const isBoardScope = (value: string | null): value is BoardScope => SCOPES.some(scope => scope.value === value);
const PRESENCE_SHOWN_MS = 8000;
const ZOOM_SAVE_MS = 600;
const PAD = 24;

const controlClass = "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export function NotesBoard({ onOpen }: { onOpen: (note: Note | null) => void }) {
  const toast = useToast();
  const { data: me } = useCurrentUser();
  const canWrite = useCan("notes.use", "notes.manage");
  const narrow = useIsNarrow();
  const [scopeParam, setScopeParam] = useSearchParam("scope");
  const scope: BoardScope = isBoardScope(scopeParam) ? scopeParam : "all";
  const [search, setSearch] = useState("");
  const notesQuery = useNotes({ scope, search: "", color: "" });
  const boardQuery = useNoteBoard();
  const saveBoard = useSaveNoteBoard();
  const { overrides, move, bringToFront, moveMany } = useBoardLayout();
  const patchNote = useBoardPatch();
  const archive = useArchiveNote();
  const remove = useDeleteNote();

  const board = boardQuery.data ?? { background: "cork" as const, snapToGrid: false, zoom: 1 };
  const [zoomLocal, setZoomLocal] = useState<number | null>(null);
  const zoom = zoomLocal ?? board.zoom;
  const background = BACKGROUND_META[board.background] ?? BACKGROUND_META.cork;

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<(DraftNote & { createdId?: number }) | null>(null);
  const [defaults, setDefaults] = useState<{ color: NoteColor; font: NoteFont; textSize: NoteTextSize }>({ color: "yellow", font: "caveat", textSize: "md" });
  const [editingBy, setEditingBy] = useState<Record<number, string>>({});
  const [announcement, setAnnouncement] = useState("");
  const [dialog, setDialog] = useState<{ kind: "share" | "archive" | "delete"; note: Note } | null>(null);
  const [viewport, setViewport] = useState({ width: 1000, height: 600 });

  const viewportRef = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<{ left: number; top: number } | null>(null);
  const zoomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const pan = useRef<{ pointerId: number; x: number; y: number; left: number; top: number; moved: boolean } | null>(null);

  const items = useMemo(() => notesQuery.data?.items ?? [], [notesQuery.data]);
  const visible = useMemo(() => items.filter(note => note.id !== draft?.createdId), [items, draft?.createdId]);
  const positions = useMemo(() => layoutNotes(items, overrides), [items, overrides]);
  const topZ = useMemo(() => Math.max(0, ...[...positions.values()].map(position => position.z)), [positions]);
  const selected = items.find(note => note.id === selectedId) ?? null;
  const matches = search.trim() ? visible.filter(note => matchesSearch(note, search)).length : visible.length;

  let right = 0;
  let bottom = 0;
  for (const position of positions.values()) {
    right = Math.max(right, position.x + position.width);
    bottom = Math.max(bottom, position.y + position.height);
  }
  const surface = { width: Math.max(right + 800, viewport.width / zoom, 1600), height: Math.max(bottom + 600, viewport.height / zoom, 1200) };

  // Track the viewport size (for the board extent, "new note in the centre", fit and tidy).
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(() => setViewport({ width: el.clientWidth, height: el.clientHeight }));
    observer.observe(el);
    return () => observer.disconnect();
  }, [narrow, notesQuery.isPending]);

  // Apply a scroll that was planned with a zoom change, after the new size is laid out.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el || !pendingScroll.current) return;
    el.scrollLeft = Math.max(0, pendingScroll.current.left);
    el.scrollTop = Math.max(0, pendingScroll.current.top);
    pendingScroll.current = null;
  }, [zoom]);

  useEffect(
    () => () => {
      if (zoomTimer.current) clearTimeout(zoomTimer.current);
      for (const timer of presenceTimers.current.values()) clearTimeout(timer);
    },
    []
  );

  const announce = (message: string) => setAnnouncement(current => (current === message ? `${message} ` : message));

  const ops = useStableActions({
    setZoom(next: number, anchor?: { x: number; y: number }) {
      const el = viewportRef.current;
      const target = clampZoom(next);
      if (!el || target === zoom) return;
      const ax = anchor?.x ?? el.clientWidth / 2;
      const ay = anchor?.y ?? el.clientHeight / 2;
      pendingScroll.current = { left: ((el.scrollLeft + ax) / zoom) * target - ax, top: ((el.scrollTop + ay) / zoom) * target - ay };
      setZoomLocal(target);
      announce(`Zoom ${Math.round(target * 100)}%`);
      if (zoomTimer.current) clearTimeout(zoomTimer.current);
      zoomTimer.current = setTimeout(() => saveBoard.mutate({ zoom: target }), ZOOM_SAVE_MS);
    },
  });

  // Ctrl/⌘ + wheel zooms around the pointer (non-passive so the page itself doesn't zoom).
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY * 0.0015);
      ops.setZoom(zoomRef(el) * factor, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ops, narrow, notesQuery.isPending]);

  // "Asha is editing…" on the card for a few seconds after each hint.
  useRealtimeEvent<{ noteId: number; user?: { id: number; name: string } }>(["note.editing", "note.removed"], event => {
    const noteId = event.data.noteId;
    if (event.type === "note.removed") {
      if (editingId === noteId) {
        setEditingId(null);
        toast.info("This note is no longer available", "It was deleted, archived, or unshared.");
      }
      return;
    }
    if (!event.data.user || event.data.user.id === me?.id) return;
    const name = event.data.user.name;
    setEditingBy(current => ({ ...current, [noteId]: name }));
    const existing = presenceTimers.current.get(noteId);
    if (existing) clearTimeout(existing);
    presenceTimers.current.set(
      noteId,
      setTimeout(() => {
        presenceTimers.current.delete(noteId);
        setEditingBy(current => {
          const next = { ...current };
          delete next[noteId];
          return next;
        });
      }, PRESENCE_SHOWN_MS)
    );
  });

  const focusNote = (id: number) =>
    requestAnimationFrame(() => {
      const active = document.activeElement;
      // Only take focus back when it would otherwise be lost (not when the person clicked somewhere else).
      if (active && active !== document.body && !active.closest(`[data-note="${id}"]`) && !active.closest("[data-draft]")) return;
      document.querySelector<HTMLElement>(`[data-note="${id}"]`)?.focus();
    });

  const actions = useStableActions<StickyActions>({
    select: (id: number) => setSelectedId(id),
    front: (id: number) => {
      const position = positions.get(id);
      if (position) bringToFront(id, position, topZ);
    },
    commit: (id: number, position: NotePosition, kind: "move" | "resize") => {
      const saved = move(id, position);
      const note = items.find(item => item.id === id);
      announce(kind === "move" ? `Moved ${note ? noteHeading(note) : "note"} to ${saved.x}, ${saved.y}` : `Resized ${note ? noteHeading(note) : "note"} to ${saved.width} by ${saved.height}`);
    },
    nudge: (id: number, dx: number, dy: number) => {
      const note = items.find(item => item.id === id);
      const position = positions.get(id);
      if (!note || !position) return;
      if (note.pinned) {
        announce(`${noteHeading(note)} is pinned. Unpin it to move it.`);
        return;
      }
      const saved = move(id, { ...position, x: position.x + dx, y: position.y + dy });
      announce(`Moved ${noteHeading(note)} to ${saved.x}, ${saved.y}`);
    },
    edit: (note: Note) => {
      setSelectedId(note.id);
      setEditingId(note.id);
    },
    stopEdit: () => {
      const id = editingId;
      setEditingId(null);
      if (id != null) focusNote(id);
    },
    toggleCheck: (note: Note, index: number) => patchNote(note.id, { body: toggleChecklistLine(note.body, index) }, "update the checklist"),
    requestArchive: (note: Note) => setDialog({ kind: "archive", note }),
    patch: (note, changes) => patchNote(note.id, changes),
    open: (note: Note) => onOpen(note),
    share: (note: Note) => setDialog({ kind: "share", note }),
    archive: (note: Note) => archiveNote(note),
    remove: (note: Note) => setDialog({ kind: "delete", note }),
  });

  function archiveNote(note: Note) {
    archive.mutate(note.id, {
      onSuccess: () => {
        toast.success("Note archived");
        announce(`Archived ${noteHeading(note)}`);
        setDialog(null);
        if (selectedId === note.id) setSelectedId(null);
      },
      onError: err => toast.error("Couldn't archive the note", err.message),
    });
  }

  function newNote() {
    if (narrow) {
      onOpen(null);
      return;
    }
    if (draft) {
      document.querySelector<HTMLElement>("[data-draft] input")?.focus(); // finish the one already started
      return;
    }
    const el = viewportRef.current;
    const cx = el ? (el.scrollLeft + el.clientWidth / 2) / zoom : 400;
    const cy = el ? (el.scrollTop + el.clientHeight / 2) / zoom : 300;
    const x = Math.max(0, Math.round(cx - DEFAULT_NOTE_SIZE.width / 2));
    const y = Math.max(0, Math.round(cy - DEFAULT_NOTE_SIZE.height / 2));
    setEditingId(null);
    setDraft({ x: board.snapToGrid ? snap(x) : x, y: board.snapToGrid ? snap(y) : y, ...defaults });
  }

  function finishDraft() {
    const created = draft?.createdId;
    setDraft(null);
    if (created) {
      setSelectedId(created);
      focusNote(created);
    }
  }

  function fitAll() {
    const el = viewportRef.current;
    const shown = visible.map(note => positions.get(note.id)).filter((position): position is NotePosition => Boolean(position));
    if (!el || !shown.length) return;
    const minX = Math.min(...shown.map(p => p.x));
    const minY = Math.min(...shown.map(p => p.y));
    const maxX = Math.max(...shown.map(p => p.x + p.width));
    const maxY = Math.max(...shown.map(p => p.y + p.height));
    const target = clampZoom(Math.min((el.clientWidth - PAD * 2) / (maxX - minX), (el.clientHeight - PAD * 2) / (maxY - minY)));
    const scroll = { left: minX * target - PAD, top: minY * target - PAD };
    if (target === zoom) {
      el.scrollLeft = Math.max(0, scroll.left);
      el.scrollTop = Math.max(0, scroll.top);
    } else {
      pendingScroll.current = scroll;
      setZoomLocal(target);
      if (zoomTimer.current) clearTimeout(zoomTimer.current);
      zoomTimer.current = setTimeout(() => saveBoard.mutate({ zoom: target }), ZOOM_SAVE_MS);
    }
    announce(`Showing all ${shown.length} notes at ${Math.round(target * 100)}%`);
  }

  function tidyUp() {
    const el = viewportRef.current;
    const width = Math.max(640, (el?.clientWidth ?? 1000) / zoom - 40);
    const ordered = [...visible].sort((a, b) => {
      const pa = positions.get(a.id)!;
      const pb = positions.get(b.id)!;
      return Number(b.pinned) - Number(a.pinned) || pa.y - pb.y || pa.x - pb.x;
    });
    const gap = PAD;
    let x = 40;
    let y = 40;
    let rowHeight = 0;
    const entries: [number, NotePosition][] = [];
    for (const note of ordered) {
      const position = positions.get(note.id)!;
      if (x > 40 && x + position.width > width) {
        x = 40;
        y += rowHeight + gap;
        rowHeight = 0;
      }
      entries.push([note.id, { ...position, x: board.snapToGrid ? snap(x) : x, y: board.snapToGrid ? snap(y) : y }]);
      x += position.width + gap;
      rowHeight = Math.max(rowHeight, position.height);
    }
    moveMany(entries);
    if (el) {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    }
    announce(`Tidied ${entries.length} notes into a grid`);
  }

  // Drag empty board space to pan.
  function startPan(event: ReactPointerEvent<HTMLDivElement>) {
    const el = viewportRef.current;
    const target = event.target as HTMLElement;
    if (!el || event.button !== 0 || target === el || target.closest("[data-note], [data-draft]")) return;
    el.setPointerCapture(event.pointerId);
    pan.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false };
  }
  function trackPan(event: ReactPointerEvent<HTMLDivElement>) {
    const el = viewportRef.current;
    const p = pan.current;
    if (!el || !p || p.pointerId !== event.pointerId) return;
    const dx = event.clientX - p.x;
    const dy = event.clientY - p.y;
    if (!p.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    p.moved = true;
    el.dataset.panning = "true";
    el.scrollLeft = p.left - dx;
    el.scrollTop = p.top - dy;
  }
  function endPan(event: ReactPointerEvent<HTMLDivElement>) {
    const p = pan.current;
    if (!p || p.pointerId !== event.pointerId) return;
    pan.current = null;
    if (viewportRef.current) delete viewportRef.current.dataset.panning;
    if (!p.moved) setSelectedId(null); // a click on empty board clears the selection
  }

  // Toolbar style controls act on the selected note (when you may edit it), otherwise on the next new note.
  const styleTarget = selected && canEdit(selected.access) && !selected.archivedAt ? selected : null;
  const styleValue = styleTarget ?? defaults;
  const setStyle = useCallback(
    (changes: Partial<{ color: NoteColor; font: NoteFont; textSize: NoteTextSize }>) => {
      if (styleTarget) patchNote(styleTarget.id, changes);
      else setDefaults(current => ({ ...current, ...changes }));
    },
    [patchNote, styleTarget]
  );

  const toolbar = (
    <div role="toolbar" aria-label="Board tools" className="flex flex-wrap items-end gap-x-3 gap-y-2 rounded-xl border bg-card p-2">
      {canWrite && (
        <Button onClick={newNote} size="sm" className="h-9">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New note
        </Button>
      )}
      <label className="relative flex min-w-0 flex-[1_1_12rem] flex-col gap-0.5 text-xs font-medium text-muted-foreground">
        Search
        <span className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden="true" />
          <input type="search" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} placeholder="Find on the board" className={cn(controlClass, "w-full pl-8")} />
        </span>
      </label>
      <label className="flex flex-col gap-0.5 text-xs font-medium text-muted-foreground">
        Show
        <select className={controlClass} value={scope} onChange={event => setScopeParam(event.target.value === "all" ? null : event.target.value)}>
          {SCOPES.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {!narrow && (
        <>
          <fieldset className="flex flex-col gap-0.5">
            <legend className="text-xs font-medium text-muted-foreground">{styleTarget ? "Selected note" : "New notes"}</legend>
            <div className="flex h-9 items-center">
              <ColorPicker value={styleValue.color} onChange={color => setStyle({ color })} label={styleTarget ? "Selected note colour" : "New note colour"} />
            </div>
          </fieldset>
          <label className="flex flex-col gap-0.5 text-xs font-medium text-muted-foreground">
            Font
            <select className={controlClass} value={styleValue.font} onChange={event => setStyle({ font: event.target.value as NoteFont })} aria-label={styleTarget ? "Selected note font" : "New note font"}>
              {NOTE_FONTS.map(font => (
                <option key={font} value={font}>
                  {FONT_META[font].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5 text-xs font-medium text-muted-foreground">
            Size
            <select className={controlClass} value={styleValue.textSize} onChange={event => setStyle({ textSize: event.target.value as NoteTextSize })} aria-label={styleTarget ? "Selected note text size" : "New note text size"}>
              {NOTE_TEXT_SIZES.map(size => (
                <option key={size} value={size}>
                  {TEXT_SIZE_META[size].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5 text-xs font-medium text-muted-foreground">
            Background
            <select className={controlClass} value={board.background} onChange={event => saveBoard.mutate({ background: event.target.value as typeof board.background })} aria-label="Board background">
              {BOARD_BACKGROUNDS.map(value => (
                <option key={value} value={value}>
                  {BACKGROUND_META[value].label}
                </option>
              ))}
            </select>
          </label>
          <Button variant={board.snapToGrid ? "primary" : "secondary"} size="sm" className="h-9" aria-pressed={board.snapToGrid} onClick={() => saveBoard.mutate({ snapToGrid: !board.snapToGrid })}>
            <Grid3x3 className="h-4 w-4" aria-hidden="true" />
            Snap
          </Button>
          <div className="flex items-center gap-1" role="group" aria-label="Zoom">
            <Button variant="secondary" size="icon" className="h-9 w-9" aria-label="Zoom out" disabled={zoom <= ZOOM_STEPS[0]} onClick={() => ops.setZoom([...ZOOM_STEPS].reverse().find(step => step < zoom - 0.001) ?? ZOOM_STEPS[0])}>
              <Minus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <button type="button" className={cn(controlClass, "w-16 tabular-nums")} onClick={() => ops.setZoom(1)} title="Reset to 100%" aria-label={`Zoom ${Math.round(zoom * 100)}%, reset to 100%`} data-zoom={zoom}>
              {Math.round(zoom * 100)}%
            </button>
            <Button variant="secondary" size="icon" className="h-9 w-9" aria-label="Zoom in" disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]} onClick={() => ops.setZoom(ZOOM_STEPS.find(step => step > zoom + 0.001) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1])}>
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <Button variant="secondary" size="sm" className="h-9" onClick={fitAll} disabled={!visible.length}>
            <Maximize className="h-4 w-4" aria-hidden="true" />
            Fit all
          </Button>
          <Button variant="secondary" size="sm" className="h-9" onClick={tidyUp} disabled={!visible.length}>
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            Tidy up
          </Button>
        </>
      )}
    </div>
  );

  const dialogs = (
    <>
      {dialog?.kind === "share" && <ShareNoteDialog note={dialog.note} onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={dialog?.kind === "archive"}
        title="Archive this note?"
        message={`"${dialog ? noteHeading(dialog.note) : ""}" leaves the board for everyone it's shared with. You can restore it from Archived in the list view.`}
        confirmLabel="Archive"
        tone="primary"
        pending={archive.isPending}
        onConfirm={() => dialog && archiveNote(dialog.note)}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog?.kind === "delete"}
        title="Delete this note?"
        message={`"${dialog ? noteHeading(dialog.note) : ""}" will be deleted for everyone it's shared with. This can't be undone.`}
        pending={remove.isPending}
        onConfirm={() => {
          if (!dialog) return;
          const note = dialog.note;
          remove.mutate(note.id, {
            onSuccess: () => {
              toast.success("Note deleted");
              announce(`Deleted ${noteHeading(note)}`);
              setDialog(null);
            },
            onError: err => toast.error("Couldn't delete the note", err.message),
          });
        }}
        onCancel={() => setDialog(null)}
      />
    </>
  );

  const live = (
    <>
      <p className="sr-only" aria-live="polite" aria-atomic="true" data-board-live="">
        {announcement}
      </p>
      <p className="sr-only" aria-live="polite">
        {search.trim() ? `${matches} of ${visible.length} notes match` : ""}
      </p>
      <p id={HINT_ID} className="sr-only">
        Arrow keys move the note, Shift for bigger steps. Enter edits it. Delete archives it.
      </p>
    </>
  );

  if (notesQuery.isPending) return <LoadingState label="Loading the board…" />;
  if (notesQuery.error || !notesQuery.data) return <ErrorState message="Unable to load notes." onRetry={() => void notesQuery.refetch()} />;

  // Phones: the same paper look as a stacked list.
  if (narrow) {
    return (
      <section aria-label="Notes" className="flex min-w-0 flex-col gap-3">
        {toolbar}
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Board needs a larger screen. Here are your notes as a list.</p>
        {visible.length ? (
          <ul className="flex flex-col gap-5 rounded-xl p-4 pt-6" style={background.style}>
            {visible.map(note => (
              <li key={note.id} className={cn("relative flex min-w-0 flex-col px-4 pb-4 pt-5", !matchesSearch(note, search) && "opacity-30")} style={{ ...paperStyle(note.color), transform: `rotate(${(positions.get(note.id)?.rotation ?? 0) / 2}deg)` }}>
                <PaperDecor color={note.color} pinned={note.pinned} />
                <button type="button" onClick={() => onOpen(note)} className="mb-1 break-words rounded text-left font-sans text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                  {note.title.trim() || "Untitled note"}
                </button>
                <NoteText note={note} clamp canTick={canEdit(note.access) && !note.archivedAt} onToggle={index => actions.toggleCheck(note, index)} />
                <span className="mt-2 font-sans text-[11px] opacity-70">{editingBy[note.id] ? `${editingBy[note.id]} is editing…` : note.owner.id === me?.id ? "You" : note.owner.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No notes here yet.</p>
        )}
        {live}
        {dialogs}
      </section>
    );
  }

  return (
    <section aria-label="Notes board" className="flex min-w-0 flex-col gap-3" aria-busy={notesQuery.isFetching || undefined}>
      {toolbar}
      <div
        ref={viewportRef}
        data-board-viewport=""
        data-background={board.background}
        className="relative h-[calc(100dvh-16rem)] min-h-[440px] w-full cursor-default touch-pan-x touch-pan-y overflow-auto overscroll-contain rounded-xl border data-[panning=true]:cursor-grabbing"
        style={background.style}
        onPointerDown={startPan}
        onPointerMove={trackPan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <div className="relative" style={{ width: surface.width * zoom, height: surface.height * zoom }}>
          <div data-board-surface="" className="absolute left-0 top-0 origin-top-left" style={{ width: surface.width, height: surface.height, transform: `scale(${zoom})` }}>
            {visible.map(note => (
              <StickyNote
                key={note.id}
                note={note}
                position={positions.get(note.id)!}
                zoom={zoom}
                snapToGrid={board.snapToGrid}
                selected={selectedId === note.id}
                dimmed={!matchesSearch(note, search)}
                editing={editingId === note.id}
                editingBy={editingBy[note.id] ?? null}
                meId={me?.id}
                actions={actions}
              />
            ))}
            {draft && (
              <div
                data-draft=""
                role="group"
                aria-label="New note"
                className="absolute flex flex-col px-3 pb-3 pt-4"
                style={{ left: draft.x, top: draft.y, ...DEFAULT_NOTE_SIZE, zIndex: topZ + 1, ...paperStyle(draft.color) }}
              >
                <PaperDecor color={draft.color} pinned={false} />
                <InlineNoteEditor note={null} draft={draft} onCreated={note => setDraft(current => (current ? { ...current, createdId: note.id } : current))} onDone={finishDraft} />
              </div>
            )}
          </div>
        </div>
        {!visible.length && !draft && (
          <div className={cn("pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center", background.chalk ? "text-white/90" : "text-zinc-800")}>
            <StickyIcon className="h-8 w-8 opacity-70" aria-hidden="true" />
            <p className="max-w-sm text-sm font-medium">{scope === "shared" ? "Nothing shared with you yet." : "Your board is empty. Add a note and drag it wherever you like."}</p>
            {canWrite && scope !== "shared" && (
              <Button className="pointer-events-auto" size="sm" onClick={newNote}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                New note
              </Button>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Drag a note by its top edge, or empty space to pan. Ctrl + scroll zooms. Double-click or press Enter to edit. Your layout is yours alone; colleagues arrange their own boards.
      </p>
      {live}
      {dialogs}
    </section>
  );
}

/** The zoom currently rendered (read from the surface, so the wheel handler never sees a stale value). */
function zoomRef(viewport: HTMLElement) {
  const surface = viewport.querySelector<HTMLElement>("[data-board-surface]");
  const match = surface?.style.transform.match(/scale\(([\d.]+)\)/);
  return match ? Number(match[1]) : 1;
}
