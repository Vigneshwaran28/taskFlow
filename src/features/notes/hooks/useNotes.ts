import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePollInterval } from "@/realtime";
import type { Page } from "@/types/session";
import { noteService, type Note, type NoteBoard, type NoteFilters, type NotePosition } from "../services/noteService";

/** Everything lives under ["notes"], which note.changed / note.removed invalidate (RealtimeProvider). */
export const notesKeys = {
  all: ["notes"] as const,
  lists: () => [...notesKeys.all, "list"] as const,
  list: (filters: NoteFilters) => [...notesKeys.lists(), filters] as const,
  detail: (id: number) => [...notesKeys.all, "detail", id] as const,
  people: () => [...notesKeys.all, "people"] as const,
  /** Personal board settings: outside ["notes"] so note.changed doesn't refetch them */
  board: () => ["note-board"] as const,
};

const BOARD_DEFAULTS: NoteBoard = { background: "cork", snapToGrid: false, zoom: 1 };

/** The viewer's board settings (background, snap, zoom). */
export function useNoteBoard() {
  return useQuery({ queryKey: notesKeys.board(), queryFn: ({ signal }) => noteService.board({ signal }), staleTime: 5 * 60_000, placeholderData: BOARD_DEFAULTS });
}

/** Optimistic: the board changes immediately and rolls back if the save fails. */
export function useSaveNoteBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: noteService.saveBoard,
    onMutate: async changes => {
      await queryClient.cancelQueries({ queryKey: notesKeys.board() });
      const previous = queryClient.getQueryData<NoteBoard>(notesKeys.board());
      queryClient.setQueryData<NoteBoard>(notesKeys.board(), { ...BOARD_DEFAULTS, ...previous, ...changes });
      return { previous };
    },
    onError: (_error, _changes, context) => queryClient.setQueryData(notesKeys.board(), context?.previous),
    onSuccess: board => queryClient.setQueryData(notesKeys.board(), board),
  });
}

/** Writes saved positions into every cached list so a refetch-free board stays in sync. */
export function useCachePositions() {
  const queryClient = useQueryClient();
  return useCallback((entries: { noteId: number; position: NotePosition }[]) => {
    const byId = new Map(entries.map(entry => [entry.noteId, entry.position]));
    queryClient.setQueriesData<Page<Note>>({ queryKey: notesKeys.lists() }, page =>
      page ? { ...page, items: page.items.map(item => (byId.has(item.id) ? { ...item, position: byId.get(item.id)! } : item)) } : page
    );
  }, [queryClient]);
}

export function useNotes(filters: NoteFilters) {
  const refetchInterval = usePollInterval(60_000, 120_000);
  return useQuery({ queryKey: notesKeys.list(filters), queryFn: ({ signal }) => noteService.list(filters, { signal }), refetchInterval, placeholderData: previous => previous });
}

/** One note, seeded from the board so the editor opens instantly. `retry: false` so a revoked note fails fast. */
export function useNote(id: number | null, initial?: Note | null) {
  return useQuery({
    queryKey: notesKeys.detail(id ?? 0),
    queryFn: ({ signal }) => noteService.get(id!, { signal }),
    enabled: id != null,
    initialData: initial && initial.id === id ? initial : undefined,
    retry: false,
  });
}

export function useShareablePeople({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: notesKeys.people(), queryFn: ({ signal }) => noteService.shareablePeople({ signal }), enabled, staleTime: 60_000 });
}

/** Saves return the note: cache it as the detail and refresh the board. */
function useNoteMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Note>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: note => {
      queryClient.setQueryData(notesKeys.detail(note.id), note);
      void queryClient.invalidateQueries({ queryKey: notesKeys.lists() });
    },
  });
}

export const useCreateNote = () => useNoteMutation(noteService.create);
export const useUpdateNote = () => useNoteMutation(noteService.update);
export const useShareNote = () => useNoteMutation(noteService.share);
export const useArchiveNote = () => useNoteMutation(noteService.archive);
export const useRestoreNote = () => useNoteMutation(noteService.restore);
export const useTransferNote = () => useNoteMutation(noteService.transfer);

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: noteService.remove,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: notesKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: notesKeys.lists() });
    },
  });
}

/** "I'm typing" hint for others viewing the note (fire and forget). */
export function useNotePresence() {
  return useMutation({ mutationFn: noteService.presence });
}
