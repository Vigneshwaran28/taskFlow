"use client";
import { useState, useId } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/shared/Toaster";
import type { Note } from "../services/noteService";
import { canDelete, COLOR_META } from "../utils/noteMeta";
import { ShareNoteDialog } from "./ShareNoteDialog";
import { useArchiveNote } from "../hooks/useNotes";
import styles from "./Folder3DNotes.module.css";

export interface Folder3DNotesProps {
  notes: Note[];
  onOpenNote: (note: Note | null) => void;
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
                    onClick={() => onOpenNote(null)}
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
                      onClick={() => onOpenNote(note)}
                      className={styles.todoItem}
                      title={`Open "${note.title || "Untitled"}"`}
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
                <span className={styles.coverMainTitle}>Daily Memo</span>
                <span className={styles.coverSubtitle}>Notes &amp; Journaling</span>
              </div>
              <div className={styles.iconGroup}>
                <svg viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
                <svg viewBox="0 0 24 24">
                  <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
                </svg>
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Document Style Arrangement
            </h2>
            <p className="text-xs text-muted-foreground">
              Click any document to open and edit. Share Read, Write, and Delete permissions with your team.
            </p>
          </div>
          {canCreateNote && (
            <Button size="sm" onClick={() => onOpenNote(null)} className="gap-1.5 text-xs">
              <Plus className="h-4 w-4" /> Add Note Document
            </Button>
          )}
        </div>

        {notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">No documents found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Add multiple notes to see them arranged in document style.
            </p>
            {canCreateNote && (
              <Button size="sm" onClick={() => onOpenNote(null)} className="mt-3">
                <Plus className="h-4 w-4 mr-1" /> Create Note
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs divide-y divide-border/60">
            {notes.map(note => {
              const colorInfo = COLOR_META[note.color] || COLOR_META.yellow;
              const lines = note.body ? note.body.split("\n") : [];
              const totalCount = lines.filter(l => l.trim().startsWith("- [ ]") || l.trim().startsWith("- [x]")).length;
              const completedCount = lines.filter(l => l.trim().startsWith("- [x]")).length;
              const hasChecklist = totalCount > 0;
              const canUserDelete = canDelete(note.access);

              return (
                <div
                  key={note.id}
                  onClick={() => onOpenNote(note)}
                  className="group flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition hover:bg-muted/40 cursor-pointer"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Document Pip Icon */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs ${colorInfo.card}`}
                    >
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
                        {/* Share Permission Badges */}
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

                  {/* Actions Right */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
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
                      className="h-8 text-xs font-medium ml-1"
                    >
                      Open
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
    </div>
  );
}
