"use client";
import { useState, useId, useSyncExternalStore, useMemo } from "react";
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
  Folder,
  FolderPlus,
  FolderEdit,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/Toaster";
import { cn } from "@/lib/cn";
import type { Note } from "../services/noteService";
import { canDelete, COLOR_META } from "../utils/noteMeta";
import { ShareNoteDialog } from "./ShareNoteDialog";
import { useArchiveNote } from "../hooks/useNotes";
import {
  useNoteFolders,
  FOLDER_THEMES,
  type FolderColorKey,
  type NoteFolder,
} from "../hooks/useNoteFolders";
import styles from "./Folder3DNotes.module.css";

export type NotesViewMode = "grid" | "list" | "compact";
export type NotesCardSize = "sm" | "md" | "lg";
export type NotesSortBy = "updated" | "created" | "title_asc" | "title_desc" | "color";

const PREFS_CHANGE_EVENT = "tf-notes-prefs-change";

function subscribePrefs(callback: () => void) {
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

function readViewMode(): NotesViewMode {
  if (typeof window === "undefined") return "grid";
  try {
    const val = localStorage.getItem("tf_notes_view_mode");
    if (val === "grid" || val === "list" || val === "compact") return val as NotesViewMode;
    return "grid";
  } catch {
    return "grid";
  }
}
const getViewModeServerSnapshot = () => "grid" as NotesViewMode;

function readCardSize(): NotesCardSize {
  if (typeof window === "undefined") return "md";
  try {
    const val = localStorage.getItem("tf_notes_card_size");
    if (val === "sm" || val === "md" || val === "lg") return val as NotesCardSize;
    return "md";
  } catch {
    return "md";
  }
}
const getCardSizeServerSnapshot = () => "md" as NotesCardSize;

function readSortBy(): NotesSortBy {
  if (typeof window === "undefined") return "updated";
  try {
    const val = localStorage.getItem("tf_notes_sort_by");
    if (val === "updated" || val === "created" || val === "title_asc" || val === "title_desc" || val === "color") {
      return val as NotesSortBy;
    }
    return "updated";
  } catch {
    return "updated";
  }
}
const getSortByServerSnapshot = () => "updated" as NotesSortBy;

function readPinnedFirst(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const val = localStorage.getItem("tf_notes_pinned_first");
    if (val !== null) return val === "true";
    return true;
  } catch {
    return true;
  }
}
const getPinnedFirstServerSnapshot = () => true;

export interface Folder3DNotesProps {
  notes: Note[];
  onOpenNote: (note: Note | null, mode?: "read" | "edit", folderId?: string) => void;
  canCreateNote?: boolean;
}

function getFormattedMemoDate() {
  const now = new Date();
  return {
    date: now.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    time: now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
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
  const [memoTimestamp] = useState(getFormattedMemoDate);
  const archiveNote = useArchiveNote();

  // Multi-Folder management hook
  const {
    folders,
    activeFolderId,
    activeFolder,
    setActiveFolderId,
    createFolder,
    updateFolder,
    deleteFolder,
    assignNoteToFolder,
    getNoteFolder,
    getNoteFolderId,
    filterNotesByFolder,
  } = useNoteFolders();

  // Folder Modals State
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{ title: string; desc: string; color: FolderColorKey }>({
    title: "",
    desc: "",
    color: "blue",
  });

  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; desc: string; color: FolderColorKey }>({
    title: "",
    desc: "",
    color: "blue",
  });

  const [deletingFolder, setDeletingFolder] = useState<NoteFolder | null>(null);

  // Document Viewer Settings (synchronized via useSyncExternalStore with stable readers)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const viewMode = useSyncExternalStore(subscribePrefs, readViewMode, getViewModeServerSnapshot);
  const cardSize = useSyncExternalStore(subscribePrefs, readCardSize, getCardSizeServerSnapshot);
  const sortBy = useSyncExternalStore(subscribePrefs, readSortBy, getSortByServerSnapshot);
  const pinnedFirst = useSyncExternalStore(subscribePrefs, readPinnedFirst, getPinnedFirstServerSnapshot);

  // Settings update helpers
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

  // Folder Actions
  function handleCreateFolder(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const title = createForm.title.trim();
    if (!title) {
      toast.error("Folder title required", "Please enter a name for the folder.");
      return;
    }
    const created = createFolder(createForm);
    setIsCreateFolderOpen(false);
    toast.success("Folder created", `"${created.title}" is ready.`);
  }

  function openEditFolder(folder: NoteFolder) {
    setEditingFolder(folder);
    setEditForm({
      title: folder.title,
      desc: folder.desc,
      color: folder.color,
    });
  }

  function handleSaveEditFolder(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!editingFolder) return;
    const title = editForm.title.trim();
    if (!title) {
      toast.error("Folder title required", "Please enter a name for the folder.");
      return;
    }
    updateFolder(editingFolder.id, editForm);
    setEditingFolder(null);
    toast.success("Folder updated", `"${title}" has been saved.`);
  }

  function handleConfirmDeleteFolder() {
    if (!deletingFolder) return;
    deleteFolder(deletingFolder.id);
    setDeletingFolder(null);
    setEditingFolder(null);
    toast.info("Folder deleted", `"${deletingFolder.title}" deleted. Notes safely moved to Daily Memo.`);
  }

  function handleDeleteNote(note: Note, e: React.MouseEvent) {
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

  // Filter notes for active folder selection (memoized)
  const folderNotes = useMemo(() => {
    return filterNotesByFolder(notes, activeFolderId);
  }, [filterNotesByFolder, notes, activeFolderId]);

  // Sort notes according to sort preference & pinned (memoized)
  const sortedNotes = useMemo(() => {
    return [...folderNotes].sort((a, b) => {
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
  }, [folderNotes, pinnedFirst, sortBy]);

  // Current active folder theme
  const currentTheme = activeFolder
    ? (FOLDER_THEMES[activeFolder.color] || FOLDER_THEMES.blue)
    : FOLDER_THEMES.blue;

  const folderCssVariables = {
    "--folder-main": currentTheme.main,
    "--folder-light": currentTheme.light,
    "--folder-dark": currentTheme.dark,
    "--folder-glow": currentTheme.glow,
  } as React.CSSProperties;

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* 1. Multi-Folder Selector & Management Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/70 p-4 shadow-2xs backdrop-blur-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Folder className="h-5 w-5 text-primary" />
                Workspace Folders
              </h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                {folders.length} {folders.length === 1 ? "folder" : "folders"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Organize notes into multiple 3D memo folders. Click any folder to inspect its documents.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* New Folder Button */}
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setCreateForm({ title: "", desc: "", color: "blue" });
                setIsCreateFolderOpen(true);
              }}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>New Folder</span>
            </Button>
          </div>
        </div>

        {/* Folder Pills List */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          {/* All Folders Option */}
          <button
            type="button"
            onClick={() => setActiveFolderId("all")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition shrink-0 border",
              activeFolderId === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border-border"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All Folders</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                activeFolderId === "all" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}
            >
              {notes.length}
            </span>
          </button>

          {/* Individual Folder Tabs */}
          {folders.map(f => {
            const theme = FOLDER_THEMES[f.color] || FOLDER_THEMES.blue;
            const count = notes.filter(n => getNoteFolderId(n.id) === f.id).length;
            const isActive = activeFolderId === f.id;

            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFolderId(f.id)}
                className={cn(
                  "group inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition shrink-0 border",
                  isActive
                    ? "bg-card text-foreground ring-2 shadow-xs"
                    : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border-border"
                )}
                style={isActive ? { borderColor: theme.main, outlineColor: theme.main } : undefined}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: theme.main }}
                />
                <span className="truncate max-w-[130px]">{f.title}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                    isActive ? theme.badge : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 3D Animated Folder Hero Viewport (Themed to Active Folder) */}
      <div className={styles.cardViewport}>
        <input
          type="checkbox"
          id={memoId}
          className={styles.memoCheckbox}
          checked={isOpen}
          onChange={e => setIsOpen(e.target.checked)}
        />

        <div className={styles.folderContainer} style={folderCssVariables}>
          <div className={styles.folderGlow} />

          <div className={styles.backCover} />
          <div className={styles.backTab} />
          <div className={styles.swoop} />

          <div className={styles.paper}>
            <div className={styles.memoHeader}>
              <span className={styles.memoDate}>
                {memoTimestamp.date} <span className={styles.timeBadge}>{memoTimestamp.time}</span>
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
                <span className="truncate max-w-[180px]">
                  {activeFolder ? activeFolder.title : "All Documents"} ({folderNotes.length})
                </span>
                {canCreateNote && (
                  <button
                    type="button"
                    onClick={() => onOpenNote(null, "edit", activeFolder?.id || "default")}
                    className="inline-flex items-center gap-0.5 text-[8.5px] font-semibold text-amber-700 hover:text-amber-900"
                    title="Add new note to this folder"
                  >
                    <Plus className="h-2.5 w-2.5" /> New Note
                  </button>
                )}
              </div>

              <div className={styles.todoList}>
                {folderNotes.length === 0 ? (
                  <div className="py-6 text-center text-[10px] text-gray-500">
                    No notes in this folder yet. Click &quot;New Note&quot; to add.
                  </div>
                ) : (
                  folderNotes.slice(0, 8).map(note => (
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
                  Arranged in <span className={styles.hashtag}>#{activeFolder ? activeFolder.title.toLowerCase().replace(/\s+/g, "-") : "all"}</span>
                </span>
                <span className="text-[7.5px] text-gray-400">Click to open</span>
              </div>
            </div>
          </div>

          <label htmlFor={memoId} className={styles.frontCover}>
            <div className={styles.coverHighlight} />
            <div className={styles.header}>
              <div className={styles.titleGroup}>
                <span className={styles.coverMainTitle} title="Click 3-dots to rename or customize">
                  {activeFolder ? activeFolder.title : "All Workspace Notes"}
                </span>
                <span className={styles.coverSubtitle}>
                  {activeFolder ? activeFolder.desc : "Viewing notes from all folders"}
                </span>
              </div>
              <div className={styles.iconGroup}>
                {/* 3-dots Edit / Rename Folder Button */}
                <button
                  type="button"
                  aria-label="Edit folder"
                  title="Rename folder & change theme"
                  className={styles.folderIconButton}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (activeFolder) {
                      openEditFolder(activeFolder);
                    } else if (folders[0]) {
                      openEditFolder(folders[0]);
                    }
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
              <span className={styles.coverNotesCount}>{folderNotes.length} notes</span>
            </div>
          </label>
        </div>
      </div>

      {/* 3. Doc-Style Arrangement View (Format Layout, Arrange, Size) */}
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
                {folderNotes.length} {folderNotes.length === 1 ? "doc" : "docs"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Viewing {activeFolder ? `"${activeFolder.title}"` : "All Folders"}. Click any document to view in Read Mode or edit with pencil.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Folder Filter Selector */}
            <select
              value={activeFolderId}
              onChange={e => setActiveFolderId(e.target.value)}
              aria-label="Filter by folder"
              className="h-8 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-2xs"
            >
              <option value="all">📂 All Folders ({notes.length})</option>
              {folders.map(f => {
                const count = notes.filter(n => getNoteFolderId(n.id) === f.id).length;
                return (
                  <option key={f.id} value={f.id}>
                    📁 {f.title} ({count})
                  </option>
                );
              })}
            </select>

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
                onClick={() => onOpenNote(null, "edit", activeFolder?.id || "default")}
                className="h-8 gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Document</span>
              </Button>
            )}
          </div>
        </div>

        {/* Content Display: Empty State / Grid View / Compact View / List View */}
        {folderNotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">
              {activeFolder ? `No documents in "${activeFolder.title}"` : "No documents found"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Add multiple notes to see them arranged in system doc viewer style.
            </p>
            {canCreateNote && (
              <Button
                size="sm"
                onClick={() => onOpenNote(null, "edit", activeFolder?.id || "default")}
                className="mt-3"
              >
                <Plus className="h-4 w-4 mr-1" /> Create Note in this Folder
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
              const noteFolder = getNoteFolder(note.id);
              const noteFolderTheme = FOLDER_THEMES[noteFolder.color] || FOLDER_THEMES.blue;
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
                    {/* Header Row: Document Pip, Folder Badge, & Access Badges */}
                    <div className="flex items-start justify-between gap-2 pt-1 mb-2">
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

                    {/* Folder Pill on Card */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold border", noteFolderTheme.badge)}>
                        <Folder className="h-2.5 w-2.5" />
                        <span className="truncate max-w-[120px]">{noteFolder.title}</span>
                      </span>
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
                      {/* Move Folder Quick Selector */}
                      <select
                        value={noteFolder.id}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          e.stopPropagation();
                          assignNoteToFolder(note.id, e.target.value);
                          const target = folders.find(f => f.id === e.target.value);
                          toast.success("Folder updated", `Moved to "${target?.title || "folder"}"`);
                        }}
                        className="h-6 rounded border border-border/80 bg-card/90 px-1 text-[10px] text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer max-w-[85px] truncate"
                        title="Move to another folder"
                      >
                        {folders.map(f => (
                          <option key={f.id} value={f.id}>
                            📁 {f.title}
                          </option>
                        ))}
                      </select>

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
                          onClick={e => handleDeleteNote(note, e)}
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
              const noteFolder = getNoteFolder(note.id);
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
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate block group-hover:text-primary transition">
                        {note.title || "Untitled"}
                      </span>
                      <span className="text-[9.5px] text-muted-foreground truncate block">
                        {noteFolder.title}
                      </span>
                    </div>
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
              const noteFolder = getNoteFolder(note.id);
              const noteFolderTheme = FOLDER_THEMES[noteFolder.color] || FOLDER_THEMES.blue;
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
                        <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold border", noteFolderTheme.badge)}>
                          <Folder className="h-2.5 w-2.5" />
                          <span>{noteFolder.title}</span>
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
                    {/* Move Folder Quick Selector */}
                    <select
                      value={noteFolder.id}
                      onClick={e => e.stopPropagation()}
                      onChange={e => {
                        e.stopPropagation();
                        assignNoteToFolder(note.id, e.target.value);
                        const target = folders.find(f => f.id === e.target.value);
                        toast.success("Folder updated", `Moved to "${target?.title || "folder"}"`);
                      }}
                      className="h-8 rounded-lg border border-border/80 bg-card px-2 text-xs text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
                      title="Move to another folder"
                    >
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>
                          📁 {f.title}
                        </option>
                      ))}
                    </select>

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
                        onClick={e => handleDeleteNote(note, e)}
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

      {/* 4. Create New Folder Dialog */}
      {isCreateFolderOpen && (
        <Dialog
          open
          onClose={() => setIsCreateFolderOpen(false)}
          title="Create New Memo Folder"
          description="Create a custom 3D memo folder to categorize and organize workspace notes."
          size="md"
          footer={
            <div className="flex w-full items-center justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreateFolderOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={() => handleCreateFolder()}>
                Create Folder
              </Button>
            </div>
          }
        >
          <form onSubmit={handleCreateFolder} className="flex flex-col gap-4 py-1">
            <TextField
              label="Folder Title"
              value={createForm.title}
              onChange={e => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Project Specs, Daily Journal, Team Tasks"
              maxLength={40}
              autoFocus
              required
            />
            <TextField
              label="Folder Description / Subtitle"
              value={createForm.desc}
              onChange={e => setCreateForm(prev => ({ ...prev, desc: e.target.value }))}
              placeholder="e.g. Product requirements and technical notes"
              maxLength={60}
            />

            {/* Folder Color Theme Picker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                3D Folder Color Theme
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(FOLDER_THEMES) as FolderColorKey[]).map(key => {
                  const theme = FOLDER_THEMES[key];
                  const isSelected = createForm.color === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCreateForm(prev => ({ ...prev, color: key }))}
                      className={cn(
                        "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition",
                        isSelected
                          ? "border-foreground bg-muted font-bold shadow-xs ring-1 ring-foreground"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <span
                        className="h-3 w-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: theme.main }}
                      />
                      <span>{theme.label}</span>
                      {isSelected && <Check className="h-3 w-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live 3D Cover Preview */}
            <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cover Preview</span>
              <div
                className="rounded-xl p-4 text-white shadow-sm flex flex-col justify-between"
                style={{
                  background: `linear-gradient(150deg, ${FOLDER_THEMES[createForm.color].light} 0%, ${FOLDER_THEMES[createForm.color].dark} 100%)`,
                }}
              >
                <span className="text-base font-bold">{createForm.title || "New Folder"}</span>
                <span className="text-xs text-white/85 mt-1">{createForm.desc || "Notes & Journaling"}</span>
              </div>
            </div>
          </form>
        </Dialog>
      )}

      {/* 5. Edit Folder Dialog */}
      {editingFolder && (
        <Dialog
          open
          onClose={() => setEditingFolder(null)}
          title={`Edit Folder: "${editingFolder.title}"`}
          description="Update folder name, description, and 3D cover color theme."
          size="md"
          footer={
            <div className="flex w-full items-center justify-between gap-2">
              {editingFolder.id !== "default" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingFolder(editingFolder)}
                  className="text-destructive hover:bg-destructive/10 text-xs gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Folder
                </Button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setEditingFolder(null)}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={() => handleSaveEditFolder()}>
                  Save Changes
                </Button>
              </div>
            </div>
          }
        >
          <form onSubmit={handleSaveEditFolder} className="flex flex-col gap-4 py-1">
            <TextField
              label="Folder Title"
              value={editForm.title}
              onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Daily Memo"
              maxLength={40}
              autoFocus
              required
            />
            <TextField
              label="Folder Description / Subtitle"
              value={editForm.desc}
              onChange={e => setEditForm(prev => ({ ...prev, desc: e.target.value }))}
              placeholder="e.g. Notes & Journaling"
              maxLength={60}
            />

            {/* Folder Color Theme Picker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                3D Folder Color Theme
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(FOLDER_THEMES) as FolderColorKey[]).map(key => {
                  const theme = FOLDER_THEMES[key];
                  const isSelected = editForm.color === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, color: key }))}
                      className={cn(
                        "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition",
                        isSelected
                          ? "border-foreground bg-muted font-bold shadow-xs ring-1 ring-foreground"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <span
                        className="h-3 w-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: theme.main }}
                      />
                      <span>{theme.label}</span>
                      {isSelected && <Check className="h-3 w-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live 3D Cover Preview */}
            <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cover Preview</span>
              <div
                className="rounded-xl p-4 text-white shadow-sm flex flex-col justify-between"
                style={{
                  background: `linear-gradient(150deg, ${FOLDER_THEMES[editForm.color].light} 0%, ${FOLDER_THEMES[editForm.color].dark} 100%)`,
                }}
              >
                <span className="text-base font-bold">{editForm.title || "Folder Title"}</span>
                <span className="text-xs text-white/85 mt-1">{editForm.desc || "Folder Subtitle"}</span>
              </div>
            </div>
          </form>
        </Dialog>
      )}

      {/* 6. Delete Folder Confirmation Dialog */}
      {deletingFolder && (
        <ConfirmDialog
          open
          title={`Delete "${deletingFolder.title}"?`}
          message="Are you sure you want to delete this folder? All notes currently in this folder will be safely moved to Daily Memo."
          confirmLabel="Delete Folder"
          tone="danger"
          onConfirm={handleConfirmDeleteFolder}
          onCancel={() => setDeletingFolder(null)}
        />
      )}

      {/* 7. Document Viewer Settings Dialog */}
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

            {/* Manage Folders in Settings */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Manage Workspace Folders ({folders.length})
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Create, edit, or customize your 3D memo folders.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCreateForm({ title: "", desc: "", color: "blue" });
                    setIsCreateFolderOpen(true);
                  }}
                  className="text-xs gap-1 font-semibold"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  New Folder
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {folders.map(f => {
                  const theme = FOLDER_THEMES[f.color] || FOLDER_THEMES.blue;
                  const count = notes.filter(n => getNoteFolderId(n.id) === f.id).length;
                  return (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-xl border bg-muted/20 p-2.5 gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: theme.main }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{f.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{f.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-semibold text-muted-foreground bg-card border px-1.5 py-0.5 rounded">
                          {count} docs
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditFolder(f)}
                          className="h-7 w-7 p-0"
                          title="Edit this folder"
                        >
                          <FolderEdit className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
