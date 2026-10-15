"use client";
// Home → Arrange: drag the sections into place (mouse, touch, or keyboard: focus a handle, Space, arrows, Space), set
// each to a full row or half (two side by side on wide screens), hide or bring back sections. Saved to the account.
// Loaded only when someone arranges (next/dynamic in HomeSections), so the drag library isn't on every page load.
import { useState } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Columns2, Eye, EyeOff, GripVertical, RotateCcw, Square, X } from "lucide-react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { useUpdatePreferences } from "@/features/auth";
import { formErrorOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import type { HomeLayout, HomeSectionKey, HomeSectionSize } from "@/types/session";
import { isHidden, nextLayout, sizeOf, type HomeSectionMeta } from "../utils/homeSections";

interface Tile {
  section: HomeSectionMeta;
  hidden: boolean;
  size: HomeSectionSize;
}

function SortableTile({ tile, onSize, onHide }: { tile: Tile; onSize: (size: HomeSectionSize) => void; onHide: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: tile.section.key });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("min-w-0", tile.size === "full" ? "lg:col-span-2" : "lg:col-span-1", isDragging && "z-10")}
    >
      <div className={cn("flex min-h-24 min-w-0 flex-col gap-2 rounded-xl border-2 border-dashed bg-card p-3 transition-shadow", isDragging ? "border-primary shadow-2xl" : "border-border hover:border-primary/50")}>
        <div className="flex min-w-0 items-center gap-2">
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Move ${tile.section.title}`}
            title="Drag to move (or focus and use Space and the arrow keys)"
            className="flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{tile.section.title}</span>
            <span className="block truncate text-xs text-muted-foreground">{tile.section.description}</span>
          </span>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-end gap-1">
          <div role="radiogroup" aria-label={`${tile.section.title} width`} className="hidden rounded-lg bg-muted p-0.5 lg:flex">
            {(["full", "half"] as const).map(size => (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={tile.size === size}
                onClick={() => onSize(size)}
                className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium", tile.size === size ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                {size === "full" ? <Square className="h-3.5 w-3.5" aria-hidden="true" /> : <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />}
                {size === "full" ? "Full" : "Half"}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={onHide} aria-label={`Hide ${tile.section.title}`}>
            <EyeOff className="h-4 w-4" aria-hidden="true" />
            Hide
          </Button>
        </div>
      </div>
    </li>
  );
}

export interface HomeArrangeProps {
  /** Every section this person can see, in their current order */
  sections: readonly HomeSectionMeta[];
  saved: HomeLayout | null | undefined;
  onDone: () => void;
}

export function HomeArrange({ sections, saved, onDone }: HomeArrangeProps) {
  const toast = useToast();
  const save = useUpdatePreferences();
  const [tiles, setTiles] = useState<Tile[]>(() => sections.map(section => ({ section, hidden: isHidden(section, saved), size: sizeOf(section.key, saved) })));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const shown = tiles.filter(tile => !tile.hidden);
  const hidden = tiles.filter(tile => tile.hidden);

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    setTiles(current => {
      const from = current.findIndex(tile => tile.section.key === active.id);
      const to = current.findIndex(tile => tile.section.key === over.id);
      return arrayMove(current, from, to);
    });
  }

  const update = (key: HomeSectionKey, changes: Partial<Tile>) => setTiles(current => current.map(tile => (tile.section.key === key ? { ...tile, ...changes } : tile)));

  function persist(layout: HomeLayout | null, message: string) {
    save.mutate(
      { homeLayout: layout },
      {
        onSuccess: () => {
          toast.success(message);
          onDone();
        },
      }
    );
  }

  function handleSave() {
    const layout = nextLayout(
      saved,
      tiles.map(tile => ({ key: tile.section.key, hidden: tile.hidden }))
    );
    const sizes: Partial<Record<HomeSectionKey, HomeSectionSize>> = { ...saved?.sizes };
    for (const tile of tiles) sizes[tile.section.key] = tile.size;
    persist({ ...layout, sizes }, "Home layout saved");
  }

  return (
    <section aria-label="Arrange your home page" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-semibold">Arrange your home.</span> Drag sections by their handle, choose full or half width (wide screens), and hide what you don&apos;t need.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => persist(null, "Home reset to the default layout")} disabled={save.isPending}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
          <Button variant="secondary" size="sm" onClick={onDone} disabled={save.isPending}>
            <X className="h-4 w-4" aria-hidden="true" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} loading={save.isPending}>
            <Check className="h-4 w-4" aria-hidden="true" />
            Save layout
          </Button>
        </div>
      </div>
      <FormAlert message={formErrorOf(save.error)} />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={shown.map(tile => tile.section.key)} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {shown.map(tile => (
              <SortableTile key={tile.section.key} tile={tile} onSize={size => update(tile.section.key, { size })} onHide={() => update(tile.section.key, { hidden: true })} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {!shown.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Every section is hidden. Bring some back below.</p>}

      {hidden.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Hidden</h3>
          <ul className="flex flex-wrap gap-2">
            {hidden.map(tile => (
              <li key={tile.section.key}>
                <Button variant="secondary" size="sm" onClick={() => update(tile.section.key, { hidden: false })}>
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  {tile.section.title}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
