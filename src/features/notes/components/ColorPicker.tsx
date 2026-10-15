"use client";
import { useId, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { NOTE_COLORS, type NoteColor } from "../services/noteService";
import { COLOR_META } from "../utils/noteMeta";

/** Colour swatches as a radio group: arrow keys move, the selected swatch is the tab stop. */
export function ColorPicker({ value, onChange, disabled = false, label = "Colour" }: { value: NoteColor; onChange: (color: NoteColor) => void; disabled?: boolean; label?: string }) {
  const id = useId();
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step || disabled) return;
    event.preventDefault();
    const next = NOTE_COLORS[(NOTE_COLORS.indexOf(value) + step + NOTE_COLORS.length) % NOTE_COLORS.length];
    onChange(next);
    document.getElementById(`${id}-${next}`)?.focus();
  }
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={handleKeyDown} className="flex flex-wrap items-center gap-1.5">
      {NOTE_COLORS.map(color => {
        const selected = color === value;
        return (
          <button
            key={color}
            id={`${id}-${color}`}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={COLOR_META[color].label}
            title={COLOR_META[color].label}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(color)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border border-black/10 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 dark:border-white/15",
              COLOR_META[color].swatch,
              selected && "ring-2 ring-foreground/60 ring-offset-2 ring-offset-background"
            )}
          >
            {selected && <Check className="h-3.5 w-3.5 text-zinc-900" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
