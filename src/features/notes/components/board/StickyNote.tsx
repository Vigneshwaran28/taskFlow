"use client";
// One sticky note on the board. Dragging and resizing touch only this element's style (transform / size) while the
// pointer is down; the new position is committed to board state once, on drop, so other notes don't re-render.
import { memo, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { Eye, Globe, Lock, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Note, NotePosition } from "../../services/noteService";
import { BOARD_LIMITS, clamp, snap } from "../../utils/boardMeta";
import { canControl, canEdit, noteHeading, shareLabel } from "../../utils/noteMeta";
import { InlineNoteEditor } from "./InlineNoteEditor";
import { NoteMenu, type NoteMenuActions } from "./NoteMenu";
import { NoteText, PaperDecor, paperStyle } from "./Paper";

export interface StickyActions extends NoteMenuActions {
  select: (id: number) => void;
  front: (id: number) => void;
  commit: (id: number, position: NotePosition, kind: "move" | "resize") => void;
  nudge: (id: number, dx: number, dy: number) => void;
  edit: (note: Note) => void;
  stopEdit: () => void;
  toggleCheck: (note: Note, index: number) => void;
  requestArchive: (note: Note) => void;
}

interface Props {
  note: Note;
  position: NotePosition;
  zoom: number;
  snapToGrid: boolean;
  selected: boolean;
  dimmed: boolean;
  editing: boolean;
  editingBy: string | null;
  meId: number | undefined;
  actions: StickyActions;
}

interface Gesture {
  kind: "move" | "resize";
  pointerId: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  moved: boolean;
}

export const HINT_ID = "sticky-note-keys";

function StickyNoteInner({ note, position, zoom, snapToGrid, selected, dimmed, editing, editingBy, meId, actions }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const editable = canEdit(note.access) && !note.archivedAt;
  const control = canControl(note.access);
  const draggable = !note.pinned && !editing;
  const heading = noteHeading(note);
  const base = `rotate(${position.rotation}deg)`;
  const ShareIcon = note.shareAll !== "none" ? Globe : note.shareCount > 0 ? Users : Lock;

  function begin(kind: Gesture["kind"], event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || (kind === "move" && !draggable)) return;
    if (kind === "move" && (event.target as HTMLElement).closest("button, input, textarea, select, a, label")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { kind, pointerId: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0, moved: false };
  }

  function track(event: PointerEvent<HTMLElement>) {
    const g = gesture.current;
    const el = rootRef.current;
    if (!g || g.pointerId !== event.pointerId || !el) return;
    const dx = (event.clientX - g.x) / zoom;
    const dy = (event.clientY - g.y) / zoom;
    if (!g.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
    g.moved = true;
    g.dx = dx;
    g.dy = dy;
    el.dataset.dragging = "true";
    if (g.kind === "move") el.style.transform = `translate(${dx}px, ${dy}px) ${base} scale(1.02)`;
    else {
      el.style.width = `${clamp(position.width + dx, BOARD_LIMITS.minW, BOARD_LIMITS.maxW)}px`;
      el.style.height = `${clamp(position.height + dy, BOARD_LIMITS.minH, BOARD_LIMITS.maxH)}px`;
    }
  }

  function end(event: PointerEvent<HTMLElement>, cancelled = false) {
    const g = gesture.current;
    const el = rootRef.current;
    if (!g || g.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (el) {
      // Back to what React rendered; the committed position re-renders this note with its new place.
      el.style.transform = base;
      el.style.width = `${position.width}px`;
      el.style.height = `${position.height}px`;
      delete el.dataset.dragging;
    }
    if (cancelled || !g.moved) return;
    const round = snapToGrid ? snap : Math.round;
    if (g.kind === "move") actions.commit(note.id, { ...position, x: Math.max(0, round(position.x + g.dx)), y: Math.max(0, round(position.y + g.dy)) }, "move");
    else actions.commit(note.id, { ...position, width: round(position.width + g.dx), height: round(position.height + g.dy) }, "resize");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || editing) return;
    const step = event.shiftKey ? 40 : 8;
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (arrows[event.key]) {
      event.preventDefault();
      actions.nudge(note.id, ...arrows[event.key]);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (editable) actions.edit(note);
      else actions.open(note);
    } else if (event.key === "Delete" || event.key === "Backspace") {
      if (!control) return;
      event.preventDefault();
      actions.requestArchive(note);
    }
  }

  const owner = note.owner.id === meId ? "You" : note.owner.name;
  return (
    <div
      ref={rootRef}
      data-note={note.id}
      tabIndex={0}
      role="group"
      aria-roledescription="sticky note"
      aria-label={`${heading}${note.pinned ? ", pinned" : ""}. ${owner === "You" ? "Your note" : `By ${owner}`}. ${shareLabel(note)}${editable ? "" : ", view only"}.`}
      aria-describedby={HINT_ID}
      aria-current={selected || undefined}
      onFocus={event => {
        if (event.target === event.currentTarget) actions.select(note.id);
      }}
      onPointerDown={event => {
        if (event.button !== 0) return;
        actions.select(note.id);
        actions.front(note.id);
      }}
      onDoubleClick={event => {
        if ((event.target as HTMLElement).closest("button, input, textarea, select, label")) return;
        if (editing) return;
        if (editable) actions.edit(note);
        else actions.open(note);
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        "group absolute flex flex-col px-3 pb-3 pt-4 outline-none transition-[opacity,filter] duration-150 data-[dragging=true]:cursor-grabbing data-[dragging=true]:transition-none",
        "focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-indigo-500",
        selected && "outline-2 outline-offset-4 outline-indigo-500/60 outline-dashed",
        dimmed && "opacity-30 saturate-50"
      )}
      style={{ left: position.x, top: position.y, width: position.width, height: position.height, zIndex: position.z, transform: base, ...paperStyle(note.color) }}
    >
      <PaperDecor color={note.color} pinned={note.pinned} />
      <div
        className={cn("-mx-1 -mt-1 mb-1 flex min-h-8 items-start gap-1 rounded px-1 pt-1 touch-none select-none", draggable ? "cursor-grab active:cursor-grabbing" : "cursor-default")}
        onPointerDown={event => begin("move", event)}
        onPointerMove={track}
        onPointerUp={event => end(event)}
        onPointerCancel={event => end(event, true)}
        onLostPointerCapture={event => end(event, true)}
        data-drag-handle=""
        title={note.pinned ? "Pinned: unpin to move it" : "Drag to move"}
      >
        <h3 className={cn("min-w-0 flex-1 break-words font-sans text-sm font-semibold leading-snug", !note.title.trim() && "italic opacity-60")}>{note.title.trim() || "Untitled note"}</h3>
        <NoteMenu note={note} actions={actions} label={heading} />
      </div>

      {editing ? (
        <InlineNoteEditor note={note} onDone={actions.stopEdit} />
      ) : (
        <NoteText note={note} canTick={editable} onToggle={index => actions.toggleCheck(note, index)} />
      )}

      {!editing && (
        <div className="mt-auto flex items-center gap-2 pr-5 pt-1.5 font-sans text-[11px] opacity-70">
          {editingBy ? (
            <span role="status" className="inline-flex min-w-0 items-center gap-1 truncate font-medium opacity-100">
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-600 motion-reduce:animate-none" aria-hidden="true" />
              {editingBy} is editing…
            </span>
          ) : (
            <>
              <span className="min-w-0 truncate">{owner}</span>
              <ShareIcon className="h-3 w-3 shrink-0" aria-label={shareLabel(note)} />
              {!editable && <Eye className="h-3 w-3 shrink-0" aria-label="View only" />}
            </>
          )}
        </div>
      )}

      <span
        aria-hidden="true"
        title="Drag to resize"
        className="absolute bottom-0 right-0 z-[1] h-6 w-6 cursor-nwse-resize touch-none"
        data-resize-handle=""
        onPointerDown={event => begin("resize", event)}
        onPointerMove={track}
        onPointerUp={event => end(event)}
        onPointerCancel={event => end(event, true)}
        onLostPointerCapture={event => end(event, true)}
      />
    </div>
  );
}

const samePosition = (a: NotePosition, b: NotePosition) => a === b || (a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height && a.z === b.z && a.rotation === b.rotation);

/** Re-renders only when this note's own data, place, or state changes. */
export const StickyNote = memo(StickyNoteInner, (prev, next) => {
  return (
    prev.note === next.note &&
    samePosition(prev.position, next.position) &&
    prev.zoom === next.zoom &&
    prev.snapToGrid === next.snapToGrid &&
    prev.selected === next.selected &&
    prev.dimmed === next.dimmed &&
    prev.editing === next.editing &&
    prev.editingBy === next.editingBy &&
    prev.meId === next.meId &&
    prev.actions === next.actions
  );
});
