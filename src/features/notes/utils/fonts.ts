// Handwritten note fonts, self-hosted by next/font at build time (no runtime requests to Google).
import { Caveat, Inter, Kalam, Patrick_Hand, Permanent_Marker } from "next/font/google";
import type { NoteFont, NoteTextSize } from "../services/noteService";

const caveat = Caveat({ subsets: ["latin"], weight: ["400", "600"], display: "swap" });
const patrick = Patrick_Hand({ subsets: ["latin"], weight: "400", display: "swap" });
const kalam = Kalam({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const marker = Permanent_Marker({ subsets: ["latin"], weight: "400", display: "swap" });
const sans = Inter({ subsets: ["latin"], display: "swap" });

/** `scale` evens out how large each face looks at the same pixel size (Caveat runs small, Marker large). */
export const FONT_META: Record<NoteFont, { label: string; className: string; scale: number }> = {
  caveat: { label: "Caveat", className: caveat.className, scale: 1.3 },
  patrick: { label: "Patrick Hand", className: patrick.className, scale: 1.1 },
  kalam: { label: "Kalam", className: kalam.className, scale: 1 },
  marker: { label: "Permanent Marker", className: marker.className, scale: 0.95 },
  sans: { label: "Clean sans", className: sans.className, scale: 0.9 },
};

export const TEXT_SIZE_META: Record<NoteTextSize, { label: string; px: number }> = {
  sm: { label: "Small", px: 13 },
  md: { label: "Medium", px: 15 },
  lg: { label: "Large", px: 19 },
  xl: { label: "Extra large", px: 24 },
};

/** Body font size in px for a font and size pair. */
export const noteFontPx = (font: NoteFont, size: NoteTextSize) => Math.round(TEXT_SIZE_META[size].px * FONT_META[font].scale);
