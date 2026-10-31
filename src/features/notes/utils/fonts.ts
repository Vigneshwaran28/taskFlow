import type { NoteFont, NoteTextSize } from "../services/noteService";

/** `scale` evens out how large each face looks at the same pixel size (Caveat runs small, Marker large). */
export const FONT_META: Record<NoteFont, { label: string; className: string; scale: number }> = {
  caveat: { label: "Caveat", className: "font-note-caveat", scale: 1.3 },
  patrick: { label: "Patrick Hand", className: "font-note-patrick", scale: 1.1 },
  kalam: { label: "Kalam", className: "font-note-kalam", scale: 1 },
  marker: { label: "Permanent Marker", className: "font-note-marker", scale: 0.95 },
  sans: { label: "Clean sans", className: "font-note-sans", scale: 0.9 },
};

export const TEXT_SIZE_META: Record<NoteTextSize, { label: string; px: number }> = {
  sm: { label: "Small", px: 13 },
  md: { label: "Medium", px: 15 },
  lg: { label: "Large", px: 19 },
  xl: { label: "Extra large", px: 24 },
};

/** Body font size in px for a font and size pair. */
export const noteFontPx = (font: NoteFont, size: NoteTextSize) => Math.round(TEXT_SIZE_META[size].px * FONT_META[font].scale);
