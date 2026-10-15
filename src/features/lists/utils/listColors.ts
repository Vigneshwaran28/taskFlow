// Complete class names only: Tailwind cannot see classes built at runtime.
import type { ListColor } from "../services/listService";

export interface ListColorMeta {
  dot: string;
  soft: string;
  label: string;
}

export const LIST_COLORS: Readonly<Record<ListColor, ListColorMeta>> = Object.freeze({
  slate: { dot: "bg-slate-500", soft: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300", label: "Slate" },
  red: { dot: "bg-red-500", soft: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300", label: "Red" },
  orange: { dot: "bg-orange-500", soft: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300", label: "Orange" },
  amber: { dot: "bg-amber-500", soft: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", label: "Amber" },
  emerald: { dot: "bg-emerald-500", soft: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", label: "Emerald" },
  teal: { dot: "bg-teal-500", soft: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300", label: "Teal" },
  sky: { dot: "bg-sky-500", soft: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300", label: "Sky" },
  indigo: { dot: "bg-indigo-500", soft: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300", label: "Indigo" },
  violet: { dot: "bg-violet-500", soft: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300", label: "Violet" },
  pink: { dot: "bg-pink-500", soft: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300", label: "Pink" },
});

export const colorFor = (color: string | null | undefined): ListColorMeta => (color && Object.hasOwn(LIST_COLORS, color) ? LIST_COLORS[color as ListColor] : LIST_COLORS.slate);
