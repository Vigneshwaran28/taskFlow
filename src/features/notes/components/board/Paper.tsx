"use client";
// Sticky-note paper: colour, folded corner, tape strip (or a pin when pinned), and the body with checklists.
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { Note, NoteColor } from "../../services/noteService";
import { PAPER, parseBody } from "../../utils/boardMeta";
import { FONT_META, noteFontPx } from "../../utils/fonts";

const FOLD = 15; // px along the diagonal; the cut corner is ~21px on each edge

/** Inline style for the paper sheet: the colour with its bottom-right corner cut away for the fold. */
export function paperStyle(color: NoteColor): CSSProperties {
  const { paper, ink } = PAPER[color];
  return { background: `linear-gradient(-45deg, transparent 0 ${FOLD}px, ${paper} ${FOLD}px)`, color: ink, filter: "drop-shadow(0 6px 7px rgba(0,0,0,.22)) drop-shadow(0 1px 1px rgba(0,0,0,.18))" };
}

/** Tape (or pin) on top and the folded corner. Purely decorative. */
export function PaperDecor({ color, pinned }: { color: NoteColor; pinned: boolean }) {
  const { paper } = PAPER[color];
  return (
    <>
      {pinned ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full shadow-[0_2px_3px_rgba(0,0,0,.45)]"
          style={{ background: "radial-gradient(circle at 35% 35%, #fecaca 0 12%, #ef4444 45%, #7f1d1d 100%)" }}
        />
      ) : (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-2 border-x border-dashed border-black/5"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,.65), rgba(255,255,255,.45))", boxShadow: "0 1px 2px rgba(0,0,0,.12)" }}
        />
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0"
        style={{ width: FOLD * 1.42, height: FOLD * 1.42, background: `linear-gradient(-45deg, transparent 50%, color-mix(in srgb, ${paper} 72%, #000) 50%, color-mix(in srgb, ${paper} 88%, #000) 100%)` }}
      />
    </>
  );
}

/** Title and body text; `[ ]` / `[x]` lines become checkboxes (clickable with edit access). */
export function NoteText({ note, canTick, onToggle, clamp = false }: { note: Note; canTick: boolean; onToggle: (index: number) => void; clamp?: boolean }) {
  const font = FONT_META[note.font] ?? FONT_META.caveat;
  const size = noteFontPx(note.font, note.textSize);
  const lines = parseBody(note.body);
  return (
    <div className={cn("flex min-h-0 flex-col gap-1", font.className)} style={{ fontSize: size, lineHeight: 1.3 }}>
      <div className={cn("min-w-0 overflow-y-auto overscroll-contain break-words pr-1", clamp ? "max-h-64" : "flex-1")}>
        {lines.map((line, i) =>
          line.kind === "check" ? (
            <label key={i} className={cn("flex items-start gap-2", canTick ? "cursor-pointer" : "cursor-default")}>
              <input
                type="checkbox"
                checked={line.checked}
                disabled={!canTick}
                onChange={() => onToggle(line.index)}
                onPointerDown={event => event.stopPropagation()}
                className="mt-[0.25em] h-[0.85em] min-h-3.5 w-[0.85em] min-w-3.5 shrink-0 cursor-[inherit] accent-current disabled:opacity-70"
              />
              <span className={cn("min-w-0 whitespace-pre-wrap", line.checked && "line-through opacity-60")}>{line.text || " "}</span>
            </label>
          ) : (
            <p key={i} className="whitespace-pre-wrap">
              {line.text || " "}
            </p>
          )
        )}
      </div>
    </div>
  );
}
