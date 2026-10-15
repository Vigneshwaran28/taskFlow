// Public API of the notes feature.
export { NotesPage } from "./pages/NotesPage";
export { RecentNotes } from "./components/RecentNotes";
export { notesKeys, useNotes, useNote } from "./hooks/useNotes";
export { NOTE_COLORS, NOTE_FONTS, NOTE_TEXT_SIZES, BOARD_BACKGROUNDS } from "./services/noteService";
export type {
  BoardBackground,
  Note,
  NoteAccess,
  NoteBoard,
  NoteColor,
  NoteFont,
  NotePosition,
  NotePositionInput,
  NoteTextSize,
  NoteConflictBody,
  NoteCreateInput,
  NoteFilters,
  NoteScope,
  NoteShare,
  NoteSharingInput,
  NoteUpdateInput,
  ShareAll,
  ShareLevel,
  ShareablePerson,
} from "./services/noteService";
