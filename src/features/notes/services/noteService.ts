import { apiClient } from "@/lib/apiClient";
import type { Page } from "@/types/session";

export const NOTE_COLORS = ["yellow", "pink", "blue", "green", "purple", "orange", "gray"] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];
export const NOTE_FONTS = ["caveat", "patrick", "kalam", "marker", "sans"] as const;
export type NoteFont = (typeof NOTE_FONTS)[number];
export const NOTE_TEXT_SIZES = ["sm", "md", "lg", "xl"] as const;
export type NoteTextSize = (typeof NOTE_TEXT_SIZES)[number];
export const BOARD_BACKGROUNDS = ["cork", "whiteboard", "chalkboard", "grid", "dots", "plain"] as const;
export type BoardBackground = (typeof BOARD_BACKGROUNDS)[number];

/** Where a note sits on the viewer's own board (personal; never shared). */
export interface NotePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  rotation: number;
}
export type NotePositionInput = Pick<NotePosition, "x" | "y" | "width" | "height"> & Partial<Pick<NotePosition, "z" | "rotation">>;

export interface NoteBoard {
  background: BoardBackground;
  snapToGrid: boolean;
  /** 0.5–2 */
  zoom: number;
}
export type NoteScope = "all" | "mine" | "shared" | "archived";
export type NoteAccess = "owner" | "manage" | "edit" | "view";
export type ShareLevel = "view" | "edit";
export type ShareAll = "none" | ShareLevel;

export interface NoteShare {
  user: { id: number; name: string };
  access: ShareLevel;
}

export interface Note {
  id: number;
  title: string;
  body: string;
  color: NoteColor;
  font: NoteFont;
  textSize: NoteTextSize;
  pinned: boolean;
  owner: { id: number; name: string };
  access: NoteAccess;
  shareAll: ShareAll;
  /** Only for the owner and note managers; null for everyone else */
  shares: NoteShare[] | null;
  shareCount: number;
  version: number;
  lastEditedBy: { id: number; name: string } | null;
  updatedAt: string;
  createdAt: string;
  archivedAt: string | null;
  /** The viewer's own spot on their board; null until placed */
  position: NotePosition | null;
}

export interface NoteFilters {
  scope: NoteScope;
  search: string;
  color: NoteColor | "";
}

export interface NoteCreateInput {
  title: string;
  body: string;
  color: NoteColor;
  font?: NoteFont;
  textSize?: NoteTextSize;
  /** Drop point on the creator's board (defaults to a cascade from the top-left) */
  x?: number;
  y?: number;
}

export interface NoteUpdateInput {
  title?: string;
  body?: string;
  color?: NoteColor;
  font?: NoteFont;
  textSize?: NoteTextSize;
  pinned?: boolean;
  /** The version the change started from (409 NOTE_CONFLICT when someone saved in between) */
  version: number;
}

export interface NoteSharingInput {
  shareAll: ShareAll;
  users: { userId: number; access: ShareLevel }[];
}

export interface ShareablePerson {
  id: number;
  name: string;
  jobTitle: string | null;
}

/** Body of a 409 NOTE_CONFLICT: the note as it is now. */
export interface NoteConflictBody {
  code: "NOTE_CONFLICT";
  message: string;
  note: Note;
}

export const noteService = {
  list: (filters: NoteFilters, { signal }: { signal?: AbortSignal } = {}) =>
    apiClient.get<Page<Note>>("/notes", { params: { scope: filters.scope, search: filters.search, color: filters.color, pageSize: 200 }, signal }),
  get: (id: number, { signal }: { signal?: AbortSignal } = {}) => apiClient.get<Note>(`/notes/${id}`, { signal }),
  create: (input: NoteCreateInput) => apiClient.post<Note>("/notes", input),
  update: ({ id, changes }: { id: number; changes: NoteUpdateInput }) => apiClient.patch<Note>(`/notes/${id}`, changes),
  share: ({ id, sharing }: { id: number; sharing: NoteSharingInput }) => apiClient.put<Note>(`/notes/${id}/sharing`, sharing),
  archive: (id: number) => apiClient.post<Note>(`/notes/${id}/archive`),
  restore: (id: number) => apiClient.post<Note>(`/notes/${id}/restore`),
  remove: (id: number) => apiClient.delete(`/notes/${id}`),
  transfer: ({ id, userId }: { id: number; userId: number }) => apiClient.post<Note>(`/notes/${id}/transfer`, { userId }),
  presence: (id: number) => apiClient.post<null>(`/notes/${id}/presence`),
  shareablePeople: ({ signal }: { signal?: AbortSignal } = {}) => apiClient.get<ShareablePerson[]>("/notes/shareable-people", { signal }),
  savePosition: ({ id, position }: { id: number; position: NotePositionInput }) => apiClient.put<NotePosition>(`/notes/${id}/position`, position),
  savePositions: (positions: (NotePositionInput & { noteId: number })[]) =>
    apiClient.post<{ items: { noteId: number; position: NotePosition }[] }>("/notes/positions/bulk", { positions }),
  bringToFront: (id: number) => apiClient.post<NotePosition>(`/notes/${id}/bring-to-front`),
  board: ({ signal }: { signal?: AbortSignal } = {}) => apiClient.get<NoteBoard>("/notes/board", { signal }),
  saveBoard: (changes: Partial<NoteBoard>) => apiClient.put<NoteBoard>("/notes/board", changes),
};
