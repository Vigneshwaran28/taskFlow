"use client";
import { useState, useId, useSyncExternalStore } from "react";
import {
  FileText,
  Lock,
  Plus,
  Share2,
  Trash2,
  Users,
  Eye,
  Edit3,
  Shield,
  CheckCircle2,
  Pin,
  Settings,
  LayoutGrid,
  List,
  Layers,
  RotateCcw,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { useToast } from "@/components/shared/Toaster";
import { cn } from "@/lib/cn";
import type { Note } from "../services/noteService";
import { canDelete, COLOR_META } from "../utils/noteMeta";
import { ShareNoteDialog } from "./ShareNoteDialog";
import { useArchiveNote } from "../hooks/useNotes";
import styles from "./Folder3DNotes.module.css";

export type NotesViewMode = "grid" | "list" | "compact";
export type NotesCardSize = "sm" | "md" | "lg";
export type NotesSortBy = "updated" | "created" | "title_asc" | "title_desc" | "color";

const PREFS_CHANGE_EVENT = "tf-notes-prefs-change";

function subscribeStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(PREFS_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PREFS_CHANGE_EVENT, callback);
  };
}

function notifyPrefChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PREFS_CHANGE_EVENT));
  }
}

export interface Folder3DNotesProps {
  notes: Note[];
  onOpenNote: (note: Note | null, mode?: "read" | "edit") => void;
  canCreateNote?: boolean;
}

export function Folder3DNotes({
  notes,
  onOpenNote,
  canCreateNote = true,
}: Folder3DNotesProps) {
  const memoId = useId();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [sharingNote, setSharingNote] = useState<Note | null>(null);
  const archiveNote = useArchiveNote();

  // Folder Customization (Synchronized with localStorage via useSyncExternalStore)
  const folderTitle = useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return localStorage.getItem("tf_memo_folder_title") || "Daily Memo";
      } catch {
        return "Daily Memo";
      }
    },
    () => "Daily Memo"
  );

  const folderDesc = useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return localStorage.getItem("tf_memo_folder_desc") || "Notes & Journaling";
      } catch {
        return "Notes & Journaling";
      }
    },
    () => "Notes & Journaling"
  );

  const viewMode = useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        const val = localStorage.getItem("tf_notes_view_mode");
        if (val === "grid" || val === "list" || val === "compact") return val as NotesViewMode;
        return "grid" as NotesViewMode;
      } catch {
        return "grid" as NotesViewMode;
      }
    },
    () => "grid" as NotesViewMode
  );

  const cardSize = useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        const val = localStorage.getItem("tf_notes_card_size");
        if (val === "sm" || val === "md" || val === "lg") return val as NotesCardSize;
        return "md" as NotesCardSize;
      } catch {
        return "md" as NotesCardSize;
      }
    },
    () => "md" as NotesCardSize
  );

  const sortBy = useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        const val = localStorage.getItem("tf_notes_sort_by");
        if (val === "updated" || val === "created" || val === "title_asc" || val === "title_desc" || val === "color") {
          return val as NotesSortBy;
        }
        return "updated" as NotesSortBy;
      } catch {
        return "updated" as NotesSortBy;
      }
    },
    () => "updated" as NotesSortBy
  );

  const pinnedFirst = useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        const val = localStorage.getItem("tf_notes_pinned_first");
        if (val !== null) return val === "true";
        return true;
      } catch {
        return true;
      }
    },
    () => true
  );

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameForm, setRenameForm] = useState({ title: folderTitle, desc: folderDesc });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formattedTime = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  function handleSaveRename(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const finalTitle = renameForm.title.trim() || "Daily Memo";
    const finalDesc = renameForm.desc.trim() || "Notes & Journaling";
    try {
      localStorage.setItem("tf_memo_folder_title", finalTitle);
      localStorage.setItem("tf_memo_folder_desc", finalDesc);
    } catch {}
    notifyPrefChange();
    setIsRenameOpen(false);
    toast.success("Folder updated", `Renamed to "${finalTitle}"`);
  }

  function handleResetFolder() {
    try {
      localStorage.removeItem("tf_memo_folder_title");
      localStorage.removeItem("tf_memo_folder_desc");
    } catch {}
    setRenameForm({ title: "Daily Memo", desc: "Notes & Journaling" });
    notifyPrefChange();
    setIsRenameOpen(false);
    toast.info("Folder reset", "Restored default name and description");
  }

  function updateViewMode(next: NotesViewMode) {
    try {
      localStorage.setItem("tf_notes_view_mode", next);
    } catch {}
    notifyPrefChange();
  }

  function updateCardSize(next: NotesCardSize) {
    try {
      localStorage.setItem("tf_notes_card_size", next);
    } catch {}
    notifyPrefChange();
  }

  function updateSortBy(next: NotesSortBy) {
    try {
      localStorage.setItem("tf_notes_sort_by", next);
    } catch {}
    notifyPrefChange();
  }

  function togglePinnedFirst() {
    const next = !pinnedFirst;
    try {
      localStorage.setItem("tf_notes_pinned_first", String(next));
    } catch {}
    notifyPrefChange();
  }

  function handleDelete(note: Note, e: React.MouseEvent) {
    e.stopPropagation();
    if (!canDelete(note.access)) {
      toast.error("Permission denied", "You do not have permission to delete this note.");
      return;
    }
    if (confirm(`Are you sure you want to archive "${note.title || "Untitled"}"?`)) {
      archiveNote.mutate(note.id, {
        onSuccess: () => toast.success("Note archived"),
        onError: err => toast.error("Failed to archive note", err.message),
      });
    }
  }

  function handleShare(note: Note, e: React.MouseEvent) {
    e.stopPropagation();
    setSharingNote(note);
  }

  // Sorted documents based on current preferences
  const sortedNotes = [...notes].sort((a, b) => {
    if (pinnedFirst) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
    }
    switch (sortBy) {
      case "updated":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "created":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "title_asc":
        return (a.title || "Untitled").localeCompare(b.title || "Untitled");
      case "title_desc":
        return (b.title || "Untitled").localeCompare(a.title || "Untitled");
      case "color":
        return a.color.localeCompare(b.color);
      default:
        return 0;
    }
  });

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* 3D Animated Folder Hero Viewport */}
      <div className={styles.cardViewport}>
        <input
          type="checkbox"
          id={memoId}
          className={styles.memoCheckbox}
          checked={isOpen}
          onChange={e => setIsOpen(e.target.checked)}
        />

        <div className={styles.folderContainer}>
          <div className={styles.folderGlow} />

          <div className={styles.backCover} />
          <div className={styles.backTab} />
          <div className={styles.swoop} />

          <div className={styles.paper}>
            <div className={styles.memoHeader}>
              <span className={styles.memoDate}>
                {formattedDate} <span className={styles.timeBadge}>{formattedTime}</span>
              </span>
              <div className={styles.memoHeaderRight}>
                <svg className={styles.headerDotsIcon} viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
                </svg>
                <button
                  type="button"
                  className={styles.memoDoneBtn}
                  onClick={() => setIsOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>

            <div className={styles.memoBody}>
              <div className={styles.memoTitle}>
                <span>Workspace Documents ({notes.length})</span>
                {canCreateNote && (
                  <button
                    type="button"
                    onClick={() => onOpenNote(null, "edit")}
                    className="inline-flex items-center gap-0.5 text-[8.5px] font-semibold text-amber-700 hover:text-amber-900"
                    title="Add new note"
                  >
                    <Plus className="h-2.5 w-2.5" /> New Note
                  </button>
                )}
              </div>

              <div className={styles.todoList}>
                {notes.length === 0 ? (
                  <div className="py-6 text-center text-[10px] text-gray-500">
                    No notes in folder yet. Click &quot;New Note&quot; to add.
                  </div>
                ) : (
                  notes.slice(0, 8).map(note => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => onOpenNote(note, "read")}
                      className={styles.todoItem}
                      title={`Open "${note.title || "Untitled"}" in Read Mode`}
                    >
                      <input
                        type="checkbox"
                        className={styles.todoCheckbox}
                        checked={note.pinned}
                        onChange={() => {}}
                        onClick={e => e.stopPropagation()}
                      />
                      <span className={styles.todoText}>
                        {note.title || "Untitled Document"}
                      </span>
                      {note.access === "owner" ? (
                        <span className="text-[7.5px] font-bold text-amber-600 bg-amber-50 px-1 py-0.2 rounded">
                          Owner
                        </span>
                      ) : note.access === "delete" ? (
                        <span className="text-[7.5px] font-bold text-purple-600 bg-purple-50 px-1 py-0.2 rounded">
                          Delete
                        </span>
                      ) : note.access === "edit" ? (
                        <span className="text-[7.5px] font-bold text-blue-600 bg-blue-50 px-1 py-0.2 rounded">
                          Write
                        </span>
                      ) : (
                        <span className="text-[7.5px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded">
                          Read
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>

              <div className={styles.memoFooter}>
                <span className={styles.footerTxt}>
                  Arranged in <span className={styles.hashtag}>#doc-style</span> folder
                </span>
                <span className="text-[7.5px] text-gray-400">Click to open</span>
              </div>
            </div>
          </div>

          <label htmlFor={memoId} className={styles.frontCover}>
            <div className={styles.coverHighlight} />
            <div className={styles.header}>
              <div className={styles.titleGroup}>
                <span className={styles.coverMainTitle} title="Click settings or 3-dots to rename">
                  {folderTitle}
                </span>
                <span className={styles.coverSubtitle}>{folderDesc}</span>
              </div>
              <div className={styles.iconGroup}>
                {/* 3-dots Rename Button */}
                <button
                  type="button"
                  aria-label="Rename folder"
                  title="Rename memo title & description"
                  className={styles.folderIconButton}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setRenameForm({ title: folderTitle, desc: folderDesc });
                    setIsRenameOpen(true);
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>

                {/* Settings Gear Button */}
                <button
                  type="button"
                  aria-label="Folder and document viewer settings"
                  title="Folder & Document Viewer Settings (Grid layout, sizing, arrange)"
                  className={styles.folderIconButton}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsSettingsOpen(true);
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className={styles.footer}>
              <span className={styles.coverNotesCount}>{notes.length} notes</span>
            </div>
          </label>
        </div>
      </div>

      {/* Doc-Style Arrangement View */}
      <div className="space-y-4">
        {/* Header & Controls Toolbar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Document Style Arrangement
              </h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {notes.length} {notes.length === 1 ? "doc" : "docs"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click any document to view in Read Mode or click the edit pencil icon to modify. Arrange in grid or list view.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle Buttons */}
            <div role="group" aria-label="Viewer layout" className="inline-flex rounded-lg border bg-card p-0.5 shadow-2xs">
              <button
                type="button"
                aria-pressed={viewMode === "grid"}
                onClick={() => updateViewMode("grid")}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  viewMode === "grid" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="Grid View (System File Doc Viewer)"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === "list"}
                onClick={() => updateViewMode("list")}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  viewMode === "list" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="Detailed List View"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === "compact"}
                onClick={() => updateViewMode("compact")}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  viewMode === "compact" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="Compact Grid"
              >
                <Layers className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Compact</span>
              </button>
            </div>

            {/* Size Switcher (for Grid & Compact modes) */}
            {viewMode !== "list" && (
              <div role="group" aria-label="Card size" className="inline-flex rounded-lg border bg-card p-0.5 shadow-2xs">
                {(["sm", "md", "lg"] as const).map(size => (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={cardSize === size}
                    onClick={() => updateCardSize(size)}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      cardSize === size ? "bg-muted font-black text-foreground shadow-xs" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title={`Card size: ${size.toUpperCase()}`}
                  >
                    {size.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={e => updateSortBy(e.target.value as NotesSortBy)}
              aria-label="Sort documents"
              className="h-8 rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-2xs"
            >
              <option value="updated">Recently Updated</option>
              <option value="created">Date Created</option>
              <option value="title_asc">Title (A-Z)</option>
              <option value="title_desc">Title (Z-A)</option>
              <option value="color">Group by Color</option>
            </select>

            {/* Settings Modal Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="h-8 px-2.5 text-xs gap-1.5"
              title="Folder & Viewer Settings"
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </Button>

            {/* Add Document Button */}
            {canCreateNote && (
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenNote(null, "edit")}
                className="h-8 gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Document</span>
              </Button>
            )}
          </div>
        </div>

        {/* Content Display: Empty State / Grid View / Compact View / List View */}
        {notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">No documents found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Add multiple notes to see them arranged in system doc viewer style.
            </p>
            {canCreateNote && (
              <Button size="sm" onClick={() => onOpenNote(null, "edit")} className="mt-3">
                <Plus className="h-4 w-4 mr-1" /> Create Note
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* SYSTEM FILE DOC VIEWER GRID VIEW (Multi-columns, rich preview, doc viewer format) */
          <div
            className={cn(
              "grid gap-4",
              cardSize === "sm" && "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
              cardSize === "md" && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
              cardSize === "lg" && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}
          >
            {sortedNotes.map(note => {
              const colorInfo = COLOR_META[note.color] || COLOR_META.yellow;
              const lines = note.body ? note.body.split("\n") : [];
              const totalCount = lines.filter(l => l.trim().startsWith("- [ ]") || l.trim().startsWith("- [x]")).length;
              const completedCount = lines.filter(l => l.trim().startsWith("- [x]")).length;
              const hasChecklist = totalCount > 0;
              const canUserDelete = canDelete(note.access);

              return (
                <div
                  key={note.id}
                  onClick={() => onOpenNote(note, "read")}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer overflow-hidden",
                    cardSize === "sm" ? "p-3.5" : cardSize === "md" ? "p-4" : "p-5"
                  )}
                >
                  {/* Top Color Accent Strip */}
                  <div className={cn("absolute top-0 left-0 right-0 h-1.5 opacity-90", colorInfo.swatch)} />

                  <div>
                    {/* Header Row: Document Pip & Badges */}
                    <div className="flex items-start justify-between gap-2 pt-1 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={cn(
                            "flex shrink-0 items-center justify-center rounded-xl shadow-2xs",
                            cardSize === "sm" ? "h-8 w-8" : "h-9 w-9",
                            colorInfo.card
                          )}
                        >
                          <FileText className={cardSize === "sm" ? "h-4 w-4" : "h-4.5 w-4.5"} />
                        </div>
                        <div className="min-w-0">
                          <h3
                            className={cn(
                              "font-bold text-foreground group-hover:text-primary transition truncate",
                              cardSize === "sm" ? "text-xs" : cardSize === "md" ? "text-sm" : "text-base"
                            )}
                            title={note.title || "Untitled Document"}
                          >
                            {note.title || "Untitled Document"}
                          </h3>
                          <p className="text-[10px] text-muted-foreground truncate">
                            by {note.owner.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {note.pinned && (
                          <span
                            className="inline-flex items-center rounded-full bg-amber-500/10 p-1 text-amber-700 dark:text-amber-400"
                            title="Pinned document"
                          >
                            <Pin className="h-3 w-3 fill-current" />
                          </span>
                        )}
                        {/* Share Badge */}
                        {note.access === "owner" ? (
                          <span className="rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 px-1.5 py-0.5 text-[9px] font-bold">
                            Owner
                          </span>
                        ) : note.access === "delete" ? (
                          <span className="rounded bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200 px-1.5 py-0.5 text-[9px] font-bold">
                            Full
                          </span>
                        ) : note.access === "edit" ? (
                          <span className="rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200 px-1.5 py-0.5 text-[9px] font-bold">
                            Edit
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 px-1.5 py-0.5 text-[9px] font-bold">
                            Read
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content Preview / Checklist Progress */}
                    {hasChecklist ? (
                      <div className="my-2 space-y-1.5 rounded-xl bg-muted/30 p-2 border border-border/40">
                        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono text-[10.5px]">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            {completedCount}/{totalCount} tasks
                          </span>
                          <span className="font-semibold text-foreground/80">
                            {Math.round((completedCount / totalCount) * 100)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                            style={{ width: `${(completedCount / totalCount) * 100}%` }}
                          />
                        </div>
                        {cardSize !== "sm" && lines.length > 0 && (
                          <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground truncate">
                            {lines
                              .filter(l => l.trim().startsWith("- [ ]") || l.trim().startsWith("- [x]"))
                              .slice(0, cardSize === "lg" ? 3 : 2)
                              .map((item, i) => (
                                <p key={i} className="truncate text-[10.5px]">
                                  {item.replace(/^-\s*\[[ xX]\]\s*/, "• ")}
                                </p>
                              ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="my-2">
                        <p
                          className={cn(
                            "text-muted-foreground/85 leading-relaxed break-words",
                            cardSize === "sm" ? "line-clamp-2 text-xs" : cardSize === "md" ? "line-clamp-3 text-xs" : "line-clamp-5 text-sm"
                          )}
                        >
                          {note.body.trim() || <span className="italic opacity-60">No content preview</span>}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Metadata & Actions */}
                  <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between gap-2">
                    <span className="text-[10.5px] text-muted-foreground truncate">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* View in Read Mode Button */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onOpenNote(note, "read");
                        }}
                        className="inline-flex items-center gap-1 rounded-md p-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition"
                        title="Open in Read Mode"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {/* Edit Pencil Button */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onOpenNote(note, "edit");
                        }}
                        className="inline-flex items-center gap-1 rounded-md p-1.5 text-xs text-primary hover:bg-primary/10 transition"
                        title="Edit note with pencil"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>

                      {/* Permissions Button */}
                      <button
                        type="button"
                        onClick={e => handleShare(note, e)}
                        className="inline-flex items-center rounded-md p-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition"
                        title="Permissions & Sharing"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete Button */}
                      {canUserDelete && (
                        <button
                          type="button"
                          onClick={e => handleDelete(note, e)}
                          className="inline-flex items-center rounded-md p-1.5 text-xs text-destructive hover:bg-destructive/10 transition"
                          title="Archive / Delete document"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === "compact" ? (
          /* COMPACT GRID VIEW */
          <div
            className={cn(
              "grid gap-2.5",
              cardSize === "sm" && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
              cardSize === "md" && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
              cardSize === "lg" && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            )}
          >
            {sortedNotes.map(note => {
              const colorInfo = COLOR_META[note.color] || COLOR_META.yellow;
              return (
                <div
                  key={note.id}
                  onClick={() => onOpenNote(note, "read")}
                  className="group flex items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-card p-2.5 hover:shadow-xs transition hover:bg-muted/40 cursor-pointer min-w-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-2xs", colorInfo.card)}>
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition">
                      {note.title || "Untitled"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onOpenNote(note, "edit");
                      }}
                      className="p-1 rounded text-primary hover:bg-primary/10 transition"
                      title="Edit note with pencil"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* DETAILED LIST VIEW */
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs divide-y divide-border/60">
            {sortedNotes.map(note => {
              const colorInfo = COLOR_META[note.color] || COLOR_META.yellow;
              const lines = note.body ? note.body.split("\n") : [];
              const totalCount = lines.filter(l => l.trim().startsWith("- [ ]") || l.trim().startsWith("- [x]")).length;
              const completedCount = lines.filter(l => l.trim().startsWith("- [x]")).length;
              const hasChecklist = totalCount > 0;
              const canUserDelete = canDelete(note.access);

              return (
                <div
                  key={note.id}
                  onClick={() => onOpenNote(note, "read")}
                  className="group flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition hover:bg-muted/40 cursor-pointer"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs", colorInfo.card)}>
                      <FileText className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground group-hover:text-primary transition truncate">
                          {note.title || "Untitled Document"}
                        </span>
                        {note.pinned && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                            Pinned
                          </span>
                        )}
                        {note.access === "owner" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 px-2 py-0.5 text-[10px] font-bold">
                            <Shield className="h-2.5 w-2.5" /> Owner
                          </span>
                        ) : note.access === "delete" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200 px-2 py-0.5 text-[10px] font-bold">
                            <Trash2 className="h-2.5 w-2.5" /> Full (Read, Write &amp; Delete)
                          </span>
                        ) : note.access === "edit" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200 px-2 py-0.5 text-[10px] font-bold">
                            <Edit3 className="h-2.5 w-2.5" /> Write (Edit)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                            <Eye className="h-2.5 w-2.5" /> Read Only
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>by {note.owner.name}</span>
                        <span>•</span>
                        <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                        {hasChecklist && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              {completedCount}/{totalCount} tasks
                            </span>
                          </>
                        )}
                        {note.shareAll !== "none" ? (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium">
                              <Users className="h-3 w-3" /> Workspace: {note.shareAll}
                            </span>
                          </>
                        ) : note.shareCount > 0 ? (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-[11px]">
                              <Users className="h-3 w-3" /> Shared ({note.shareCount})
                            </span>
                          </>
                        ) : (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-[11px]">
                              <Lock className="h-3 w-3" /> Private
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        onOpenNote(note, "edit");
                      }}
                      title="Edit note with pencil"
                      className="h-8 text-xs font-semibold gap-1 text-primary hover:bg-primary/10"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={e => handleShare(note, e)}
                      title="Manage sharing & permissions"
                      className="h-8 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>Permissions</span>
                    </Button>

                    {canUserDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={e => handleDelete(note, e)}
                        title="Archive/Delete this document"
                        className="h-8 text-xs font-medium text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        onOpenNote(note, "read");
                      }}
                      className="h-8 text-xs font-medium ml-1 gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Read
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Share Permissions Dialog */}
      {sharingNote && (
        <ShareNoteDialog
          key={sharingNote.id}
          note={sharingNote}
          onClose={() => setSharingNote(null)}
        />
      )}

      {/* Rename Memo Folder Dialog */}
      {isRenameOpen && (
        <Dialog
          open
          onClose={() => setIsRenameOpen(false)}
          title="Rename Memo Folder"
          description="Update the folder title and description displayed on the 3D cover."
          size="md"
          footer={
            <div className="flex w-full items-center justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={handleResetFolder} className="gap-1.5 text-xs">
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Default
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsRenameOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={() => handleSaveRename()}>
                  Save Changes
                </Button>
              </div>
            </div>
          }
        >
          <form onSubmit={handleSaveRename} className="flex flex-col gap-4 py-1">
            <TextField
              label="Folder Title"
              value={renameForm.title}
              onChange={e => setRenameForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Daily Memo"
              maxLength={40}
              autoFocus
            />
            <TextField
              label="Folder Description / Subtitle"
              value={renameForm.desc}
              onChange={e => setRenameForm(prev => ({ ...prev, desc: e.target.value }))}
              placeholder="Notes & Journaling"
              maxLength={60}
            />
            <div className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Preview on 3D Cover</p>
              <p className="text-base font-bold text-foreground">{renameForm.title || "Daily Memo"}</p>
              <p className="text-xs text-muted-foreground">{renameForm.desc || "Notes & Journaling"}</p>
            </div>
          </form>
        </Dialog>
      )}

      {/* Settings Dialog */}
      {isSettingsOpen && (
        <Dialog
          open
          onClose={() => setIsSettingsOpen(false)}
          title="Folder & Document Viewer Settings"
          description="Customize the document viewer layout, grid sizing, arrangement sorting, and folder branding."
          size="lg"
          footer={
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  updateViewMode("grid");
                  updateCardSize("md");
                  updateSortBy("updated");
                  try {
                    localStorage.setItem("tf_notes_pinned_first", "true");
                  } catch {}
                  notifyPrefChange();
                  toast.info("Settings reset", "Default layout and arrangement restored");
                }}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Preferences
              </Button>
              <Button type="button" size="sm" onClick={() => setIsSettingsOpen(false)}>
                Done
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-6 py-2">
            {/* View Layout Options */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Document Viewer Layout
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: "grid",
                    label: "Doc Viewer Grid",
                    desc: "System file doc viewer with rich previews & progress",
                    icon: LayoutGrid,
                  },
                  {
                    id: "list",
                    label: "Detailed List",
                    desc: "Structured rows with full permissions and metadata",
                    icon: List,
                  },
                  {
                    id: "compact",
                    label: "Compact Grid",
                    desc: "High density tiles for fast scanning and overview",
                    icon: Layers,
                  },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateViewMode(opt.id as NotesViewMode)}
                    className={cn(
                      "flex flex-col items-start p-3 rounded-xl border text-left transition",
                      viewMode === opt.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                        : "border-border hover:border-foreground/30 hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <opt.icon className={cn("h-4 w-4", viewMode === opt.id ? "text-primary" : "text-muted-foreground")} />
                      {viewMode === opt.id && <Check className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <span className="text-xs font-bold text-foreground">{opt.label}</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Document Card Size */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Card Preview Size (File Explorer Zoom)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "sm", label: "Small (S)", desc: "Tight padding, more files per row" },
                  { id: "md", label: "Medium (M)", desc: "Balanced preview with checklist bar" },
                  { id: "lg", label: "Large (L)", desc: "Expanded doc preview with content snippet" },
                ].map(sizeOpt => (
                  <button
                    key={sizeOpt.id}
                    type="button"
                    onClick={() => updateCardSize(sizeOpt.id as NotesCardSize)}
                    className={cn(
                      "flex flex-col items-start p-3 rounded-xl border text-left transition",
                      cardSize === sizeOpt.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                        : "border-border hover:border-foreground/30 hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold text-foreground">{sizeOpt.label}</span>
                      {cardSize === sizeOpt.id && <Check className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-tight">{sizeOpt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sorting & Arrangement */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Arrangement & Sorting
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SelectField
                    label="Sort Order"
                    value={sortBy}
                    onChange={e => updateSortBy(e.target.value as NotesSortBy)}
                    options={[
                      { value: "updated", label: "Recently Updated (Newest first)" },
                      { value: "created", label: "Date Created (Newest first)" },
                      { value: "title_asc", label: "Document Title (A to Z)" },
                      { value: "title_desc", label: "Document Title (Z to A)" },
                      { value: "color", label: "Group by Document Color" },
                    ]}
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer hover:bg-muted/30 transition w-full">
                    <input
                      type="checkbox"
                      checked={pinnedFirst}
                      onChange={togglePinnedFirst}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Pin className="h-3.5 w-3.5 text-amber-500 fill-current" />
                        Pin Important Documents First
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Keep pinned items at top of the grid
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Folder Customization */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Folder Branding (3D Folder Title & Description)
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Customize the text shown on the blue 3D memo folder cover.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRenameForm({ title: folderTitle, desc: folderDesc });
                    setIsRenameOpen(true);
                  }}
                  className="text-xs gap-1"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Rename Folder
                </Button>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-foreground">{folderTitle}</p>
                  <p className="text-xs text-muted-foreground">{folderDesc}</p>
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-background px-2.5 py-1 rounded-md border">
                  {notes.length} documents
                </span>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
