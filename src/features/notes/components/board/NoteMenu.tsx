"use client";
// The "…" menu on a sticky note: colour, font, size, pin, open, share, archive, delete.
import { useEffect, useId, useRef, useState } from "react";
import { Archive, Expand, MoreHorizontal, Pin, PinOff, Share2, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { NOTE_FONTS, NOTE_TEXT_SIZES, type Note, type NoteUpdateInput } from "../../services/noteService";
import { FONT_META, TEXT_SIZE_META } from "../../utils/fonts";
import { canControl, canEdit } from "../../utils/noteMeta";
import { ColorPicker } from "../ColorPicker";

export interface NoteMenuActions {
  patch: (note: Note, changes: Omit<NoteUpdateInput, "version">) => void;
  open: (note: Note) => void;
  share: (note: Note) => void;
  archive: (note: Note) => void;
  remove: (note: Note) => void;
}

const itemClass =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
const selectClass = "h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export function NoteMenu({ note, actions, label }: { note: Note; actions: NoteMenuActions; label: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const editable = canEdit(note.access) && !note.archivedAt;
  const control = canControl(note.access);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div
      ref={root}
      className="relative"
      onPointerDown={event => event.stopPropagation()}
      onDoubleClick={event => event.stopPropagation()}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          button.current?.focus();
        }
      }}
    >
      <button
        ref={button}
        type="button"
        aria-label={`Options for ${label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(value => !value)}
        className="flex h-7 w-7 items-center justify-center rounded-md opacity-70 hover:bg-black/10 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={id}
          role="dialog"
          aria-label={`Options for ${label}`}
          className="absolute right-0 top-8 z-10 flex w-60 flex-col gap-2 rounded-xl border bg-card p-2 font-sans text-foreground shadow-xl"
        >
          <button type="button" className={itemClass} onClick={() => run(() => actions.open(note))} autoFocus>
            <Expand className="h-4 w-4" aria-hidden="true" />
            Open
          </button>
          <div className="flex flex-col gap-1.5 border-t pt-2">
            <span className="px-1 text-xs font-medium text-muted-foreground">Colour</span>
            <div className="px-1">
              <ColorPicker value={note.color} disabled={!editable} onChange={color => actions.patch(note, { color })} label="Note colour" />
            </div>
            <label className="flex flex-col gap-1 px-1 text-xs font-medium text-muted-foreground">
              Font
              <select className={selectClass} value={note.font} disabled={!editable} onChange={event => actions.patch(note, { font: event.target.value as Note["font"] })}>
                {NOTE_FONTS.map(font => (
                  <option key={font} value={font}>
                    {FONT_META[font].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 px-1 text-xs font-medium text-muted-foreground">
              Text size
              <select className={selectClass} value={note.textSize} disabled={!editable} onChange={event => actions.patch(note, { textSize: event.target.value as Note["textSize"] })}>
                {NOTE_TEXT_SIZES.map(size => (
                  <option key={size} value={size}>
                    {TEXT_SIZE_META[size].label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-col border-t pt-1">
            <button type="button" className={itemClass} disabled={!editable} aria-pressed={note.pinned} onClick={() => run(() => actions.patch(note, { pinned: !note.pinned }))}>
              {note.pinned ? <PinOff className="h-4 w-4" aria-hidden="true" /> : <Pin className="h-4 w-4" aria-hidden="true" />}
              {note.pinned ? "Unpin (allow dragging)" : "Pin in place"}
            </button>
            {control && (
              <>
                <button type="button" className={itemClass} disabled={Boolean(note.archivedAt)} onClick={() => run(() => actions.share(note))}>
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  Share
                </button>
                <button type="button" className={itemClass} onClick={() => run(() => actions.archive(note))}>
                  <Archive className="h-4 w-4" aria-hidden="true" />
                  Archive
                </button>
                <button type="button" className={cn(itemClass, "text-destructive")} onClick={() => run(() => actions.remove(note))}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
