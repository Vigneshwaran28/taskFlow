import type { CSSProperties } from "react";
import type { BoardBackground, Note, NoteColor, NotePosition } from "../services/noteService";

// Mirrors server/src/routes/notes.js (positions are clamped there too).
export const BOARD_LIMITS = { maxXY: 20_000, minW: 160, maxW: 800, minH: 140, maxH: 800, maxTilt: 8 } as const;
export const DEFAULT_NOTE_SIZE = { width: 240, height: 220 } as const;
export const GRID = 24;
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2;
export const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2] as const;

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const clampZoom = (zoom: number) => Math.round(clamp(zoom, ZOOM_MIN, ZOOM_MAX) * 100) / 100;
export const snap = (value: number) => Math.round(value / GRID) * GRID;

/** Keeps a position inside the server's limits (so the optimistic copy matches what gets saved). */
export function clampPosition<T extends Partial<NotePosition>>(position: T): T {
  const out = { ...position };
  if (out.x !== undefined) out.x = Math.round(clamp(out.x, 0, BOARD_LIMITS.maxXY));
  if (out.y !== undefined) out.y = Math.round(clamp(out.y, 0, BOARD_LIMITS.maxXY));
  if (out.width !== undefined) out.width = Math.round(clamp(out.width, BOARD_LIMITS.minW, BOARD_LIMITS.maxW));
  if (out.height !== undefined) out.height = Math.round(clamp(out.height, BOARD_LIMITS.minH, BOARD_LIMITS.maxH));
  return out;
}

/** A stable little tilt for notes that have no stored position yet (−3°…3°, from the id). */
export const tiltFor = (id: number) => (((id * 2654435761) >>> 0) % 13) / 2 - 3;

/**
 * Board positions for every note: the viewer's saved spot, or (for notes shared with them that they have never placed)
 * a tidy row below everything already placed. Nothing is saved until they move it.
 */
export function layoutNotes(notes: Note[], overrides: Record<number, NotePosition>): Map<number, NotePosition> {
  const out = new Map<number, NotePosition>();
  let bottom = 0;
  const unplaced: Note[] = [];
  for (const note of notes) {
    const position = overrides[note.id] ?? note.position;
    if (position) {
      out.set(note.id, position);
      bottom = Math.max(bottom, position.y + position.height);
    } else unplaced.push(note);
  }
  const top = bottom ? bottom + 48 : 40;
  unplaced.forEach((note, index) => {
    out.set(note.id, { x: 40 + (index % 5) * 280, y: top + Math.floor(index / 5) * 260, ...DEFAULT_NOTE_SIZE, z: 0, rotation: tiltFor(note.id) });
  });
  return out;
}

/** Paper colours for the board (the same palette as the list cards, as solid sheets). */
export const PAPER: Record<NoteColor, { paper: string; fold: string; ink: string }> = {
  yellow: { paper: "#fef08a", fold: "#eab308", ink: "#3f2d04" },
  pink: { paper: "#fbcfe8", fold: "#ec4899", ink: "#4a0d2c" },
  blue: { paper: "#bae6fd", fold: "#0ea5e9", ink: "#082f49" },
  green: { paper: "#bbf7d0", fold: "#22c55e", ink: "#052e16" },
  purple: { paper: "#ddd6fe", fold: "#8b5cf6", ink: "#2e1065" },
  orange: { paper: "#fed7aa", fold: "#f97316", ink: "#431407" },
  gray: { paper: "#e4e4e7", fold: "#a1a1aa", ink: "#18181b" },
};

const svg = (markup: string) => `url("data:image/svg+xml,${encodeURIComponent(markup)}")`;
const CORK_NOISE = svg(
  `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.22 0 0 0 0 0.1 0 0 0 0.55 0'/></filter><rect width='160' height='160' filter='url(#n)'/></svg>`
);
const CHALK_DUST = svg(
  `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='c'><feTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.07 0'/></filter><rect width='220' height='220' filter='url(#c)'/></svg>`
);

/** CSS-only board surfaces (gradients and inline SVG patterns; no image files). `chalk` = light text on a dark board. */
export const BACKGROUND_META: Record<BoardBackground, { label: string; style: CSSProperties; chalk: boolean }> = {
  cork: {
    label: "Cork",
    chalk: false,
    style: {
      backgroundColor: "#c79a6b",
      backgroundImage: `${CORK_NOISE}, radial-gradient(circle at 30% 40%, rgba(110,70,30,.35) 0 1.2px, transparent 1.6px), radial-gradient(circle at 70% 75%, rgba(255,235,205,.28) 0 1px, transparent 1.4px), radial-gradient(circle at 50% 50%, rgba(90,55,20,.25) 0 2px, transparent 2.5px)`,
      backgroundSize: "160px 160px, 9px 9px, 13px 13px, 23px 23px",
    },
  },
  whiteboard: {
    label: "Whiteboard",
    chalk: false,
    style: { backgroundColor: "#f8fafc", backgroundImage: "linear-gradient(135deg, rgba(255,255,255,.9) 0%, rgba(226,232,240,.55) 45%, rgba(255,255,255,.85) 60%, rgba(241,245,249,.7) 100%)", backgroundSize: "1200px 900px" },
  },
  chalkboard: {
    label: "Chalkboard",
    chalk: true,
    style: {
      backgroundColor: "#29372f",
      backgroundImage: `${CHALK_DUST}, radial-gradient(ellipse at 20% 30%, rgba(255,255,255,.06), transparent 40%), radial-gradient(ellipse at 80% 70%, rgba(255,255,255,.05), transparent 45%)`,
      backgroundSize: "220px 220px, 1400px 1000px, 1400px 1000px",
    },
  },
  grid: {
    label: "Grid",
    chalk: false,
    style: {
      backgroundColor: "#ffffff",
      backgroundImage: `linear-gradient(rgba(99,102,241,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.14) 1px, transparent 1px)`,
      backgroundSize: `${GRID}px ${GRID}px`,
    },
  },
  dots: {
    label: "Dots",
    chalk: false,
    style: { backgroundColor: "#fafaf9", backgroundImage: "radial-gradient(circle, rgba(68,64,60,.28) 1.2px, transparent 1.6px)", backgroundSize: `${GRID}px ${GRID}px` },
  },
  plain: { label: "Plain", chalk: false, style: { backgroundColor: "#eef1f5" } },
};

// ---- Checklists: lines starting "[ ]" or "[x]" ----
const CHECK_LINE = /^(\s*)\[( |x|X)\](\s?)(.*)$/;
export type BodyLine = { kind: "text"; text: string } | { kind: "check"; checked: boolean; text: string; index: number };

export function parseBody(body: string): BodyLine[] {
  return body.split("\n").map((line, index) => {
    const match = CHECK_LINE.exec(line);
    return match ? { kind: "check", checked: match[2] !== " ", text: match[4], index } : { kind: "text", text: line };
  });
}

/** The body with one checklist line flipped (by line index). */
export function toggleChecklistLine(body: string, index: number): string {
  const lines = body.split("\n");
  const match = CHECK_LINE.exec(lines[index] ?? "");
  if (!match) return body;
  lines[index] = `${match[1]}[${match[2] === " " ? "x" : " "}]${match[3]}${match[4]}`;
  return lines.join("\n");
}

export const matchesSearch = (note: Pick<Note, "title" | "body">, search: string) => {
  const needle = search.trim().toLowerCase();
  return !needle || note.title.toLowerCase().includes(needle) || note.body.toLowerCase().includes(needle);
};
