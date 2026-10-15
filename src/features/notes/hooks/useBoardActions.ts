import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/shared/Toaster";
import { ApiError } from "@/lib/apiClient";
import type { Page } from "@/types/session";
import { noteService, type Note, type NotePosition, type NoteUpdateInput } from "../services/noteService";
import { clampPosition } from "../utils/boardMeta";
import { notesKeys, useCachePositions } from "./useNotes";

const POSITION_SAVE_MS = 350;

/** Returns an object of callbacks whose identity never changes but always call the latest implementation. */
export function useStableActions<T extends { [K in keyof T]: (...args: never[]) => unknown }>(actions: T): T {
  const ref = useRef(actions);
  useLayoutEffect(() => {
    ref.current = actions;
  });
  // The set of action names is fixed by the first render; each wrapper calls the newest version.
  const [stable] = useState(() => {
    const out: Record<string, (...args: unknown[]) => unknown> = {};
    for (const key of Object.keys(actions)) out[key] = (...args: unknown[]) => (ref.current[key as keyof T] as unknown as (...a: unknown[]) => unknown)(...args);
    return out as unknown as T;
  });
  return stable;
}

/**
 * The viewer's layout on top of the cached notes: moves show at once (optimistic overrides), save after a short pause,
 * and roll back to the last saved spot if the save fails.
 */
export function useBoardLayout() {
  const toast = useToast();
  const cachePositions = useCachePositions();
  const [overrides, setOverrides] = useState<Record<number, NotePosition>>({});
  const latest = useRef(new Map<number, NotePosition>());
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const drop = useCallback((ids: number[], only?: Map<number, NotePosition>) => {
    setOverrides(current => {
      const next = { ...current };
      for (const id of ids) {
        if (only && current[id] !== only.get(id)) continue; // moved again since: keep the newer one
        delete next[id];
        latest.current.delete(id);
      }
      return next;
    });
  }, []);

  const set = useCallback((entries: [number, NotePosition][]) => {
    for (const [id, position] of entries) latest.current.set(id, position);
    setOverrides(current => ({ ...current, ...Object.fromEntries(entries) }));
  }, []);

  const flush = useCallback(
    (id: number) => {
      timers.current.delete(id);
      const sent = latest.current.get(id);
      if (!sent) return;
      noteService
        .savePosition({ id, position: sent })
        .then(saved => {
          cachePositions([{ noteId: id, position: saved }]);
          drop([id], new Map([[id, sent]]));
        })
        .catch((error: unknown) => {
          drop([id], new Map([[id, sent]]));
          toast.error("Couldn't save the note's position", error instanceof Error ? error.message : undefined);
        });
    },
    [cachePositions, drop, toast]
  );

  /** Move or resize one note (debounced save). */
  const move = useCallback(
    (id: number, position: NotePosition) => {
      const next = clampPosition(position);
      set([[id, next]]);
      const timer = timers.current.get(id);
      if (timer) clearTimeout(timer);
      timers.current.set(id, setTimeout(() => flush(id), POSITION_SAVE_MS));
      return next;
    },
    [flush, set]
  );

  /** Raise a note above everything else on my board. */
  const bringToFront = useCallback(
    (id: number, position: NotePosition, top: number) => {
      if (position.z >= top && top > 0) return;
      const raised = { ...position, z: top + 1 };
      set([[id, raised]]);
      noteService
        .bringToFront(id)
        .then(saved => {
          // A move that's still waiting to save keeps its x/y; only z comes from the server.
          const pending = latest.current.get(id);
          if (pending && pending !== raised) {
            set([[id, { ...pending, z: saved.z }]]);
            return;
          }
          cachePositions([{ noteId: id, position: saved }]);
          drop([id], new Map([[id, raised]]));
        })
        .catch(() => drop([id], new Map([[id, raised]])));
    },
    [cachePositions, drop, set]
  );

  /** Arrange several notes at once (Tidy up). */
  const moveMany = useCallback(
    (entries: [number, NotePosition][]) => {
      if (!entries.length) return;
      const clamped = entries.map(([id, position]) => [id, clampPosition(position)] as [number, NotePosition]);
      for (const [id] of clamped) {
        const timer = timers.current.get(id);
        if (timer) clearTimeout(timer);
        timers.current.delete(id);
      }
      set(clamped);
      const sent = new Map(clamped);
      noteService
        .savePositions(clamped.map(([noteId, position]) => ({ noteId, ...position })))
        .then(result => {
          cachePositions(result.items);
          drop([...sent.keys()], sent);
        })
        .catch((error: unknown) => {
          drop([...sent.keys()], sent);
          toast.error("Couldn't tidy the board", error instanceof Error ? error.message : undefined);
        });
    },
    [cachePositions, drop, set, toast]
  );

  return { overrides, move, bringToFront, moveMany };
}

/**
 * Content changes made right on the board (colour, font, size, pin, checklist ticks). They show at once, run one at a
 * time with the freshest version, and on a conflict or error the board reloads the server copy.
 */
export function useBoardPatch() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const chain = useRef<Promise<void>>(Promise.resolve());

  const findCached = useCallback(
    (id: number) => {
      for (const [, page] of queryClient.getQueriesData<Page<Note>>({ queryKey: notesKeys.lists() })) {
        const found = page?.items.find(item => item.id === id);
        if (found) return found;
      }
      return null;
    },
    [queryClient]
  );

  const writeCached = useCallback(
    (id: number, update: (note: Note) => Note) => {
      queryClient.setQueriesData<Page<Note>>({ queryKey: notesKeys.lists() }, page => (page ? { ...page, items: page.items.map(item => (item.id === id ? update(item) : item)) } : page));
    },
    [queryClient]
  );

  return useCallback(
    (id: number, changes: Omit<NoteUpdateInput, "version">, label = "save the note") => {
      writeCached(id, note => ({ ...note, ...changes }));
      chain.current = chain.current.then(async () => {
        const current = findCached(id);
        if (!current) return;
        try {
          const saved = await noteService.update({ id, changes: { ...changes, version: current.version } });
          writeCached(id, note => ({ ...saved, position: note.position }));
          queryClient.setQueryData(notesKeys.detail(id), saved);
        } catch (error) {
          if (error instanceof ApiError && error.code === "NOTE_CONFLICT") toast.info("Someone else just changed this note", "The board shows their version. Try again.");
          else toast.error(`Couldn't ${label}`, error instanceof Error ? error.message : undefined);
          await queryClient.invalidateQueries({ queryKey: notesKeys.lists() });
        }
      });
    },
    [findCached, queryClient, toast, writeCached]
  );
}
