"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Note } from "../services/noteService";

export type FolderColorKey = "blue" | "amber" | "emerald" | "purple" | "rose" | "cyan" | "slate";

export interface FolderThemeConfig {
  label: string;
  main: string;
  light: string;
  dark: string;
  glow: string;
  badge: string;
  swatch: string;
}

export const FOLDER_THEMES: Record<FolderColorKey, FolderThemeConfig> = {
  blue: {
    label: "Ocean Blue",
    main: "#469cf4",
    light: "#6db6fb",
    dark: "#3b93ee",
    glow: "rgba(56, 166, 253, 0.45)",
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
    swatch: "bg-sky-500",
  },
  amber: {
    label: "Amber Gold",
    main: "#f59e0b",
    light: "#fbbf24",
    dark: "#d97706",
    glow: "rgba(245, 158, 11, 0.45)",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    swatch: "bg-amber-500",
  },
  emerald: {
    label: "Emerald Green",
    main: "#10b981",
    light: "#34d399",
    dark: "#059669",
    glow: "rgba(16, 185, 129, 0.45)",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    swatch: "bg-emerald-500",
  },
  purple: {
    label: "Royal Purple",
    main: "#8b5cf6",
    light: "#a78bfa",
    dark: "#7c3aed",
    glow: "rgba(139, 92, 246, 0.45)",
    badge: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    swatch: "bg-purple-500",
  },
  rose: {
    label: "Rose Pink",
    main: "#f43f5e",
    light: "#fb7185",
    dark: "#e11d48",
    glow: "rgba(244, 63, 94, 0.45)",
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    swatch: "bg-rose-500",
  },
  cyan: {
    label: "Teal Cyan",
    main: "#06b6d4",
    light: "#22d3ee",
    dark: "#0891b2",
    glow: "rgba(6, 182, 212, 0.45)",
    badge: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
    swatch: "bg-cyan-500",
  },
  slate: {
    label: "Midnight Slate",
    main: "#64748b",
    light: "#94a3b8",
    dark: "#475569",
    glow: "rgba(100, 116, 139, 0.45)",
    badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    swatch: "bg-slate-500",
  },
};

export interface NoteFolder {
  id: string;
  title: string;
  desc: string;
  color: FolderColorKey;
  createdAt: string;
}

const STORAGE_FOLDERS_KEY = "tf_notes_folders_v2";
const STORAGE_ACTIVE_KEY = "tf_notes_active_folder_id";
const STORAGE_MAP_KEY = "tf_note_to_folder_map";
const EVENT_FOLDERS_CHANGE = "tf-note-folders-changed";

export const DEFAULT_FOLDER: NoteFolder = Object.freeze({
  id: "default",
  title: "Daily Memo",
  desc: "Notes & Journaling",
  color: "blue",
  createdAt: "2026-10-31T00:00:00.000Z",
});

export const DEFAULT_FOLDERS: NoteFolder[] = Object.freeze([DEFAULT_FOLDER]) as unknown as NoteFolder[];
export const EMPTY_MAP: Record<string, string> = Object.freeze({}) as unknown as Record<string, string>;

// Module-level cached snapshot state to guarantee referential stability for useSyncExternalStore
let cachedFoldersRaw: string | null = null;
let cachedFolders: NoteFolder[] = DEFAULT_FOLDERS;

let cachedMapRaw: string | null = null;
let cachedMap: Record<string, string> = EMPTY_MAP;

function readFolders(): NoteFolder[] {
  if (typeof window === "undefined") return DEFAULT_FOLDERS;
  try {
    const raw = localStorage.getItem(STORAGE_FOLDERS_KEY);
    if (!raw) {
      // Migrate legacy custom memo folder title/desc if present
      const legacyTitle = localStorage.getItem("tf_memo_folder_title");
      const legacyDesc = localStorage.getItem("tf_memo_folder_desc");
      if (legacyTitle || legacyDesc) {
        const initialDefault: NoteFolder = {
          ...DEFAULT_FOLDER,
          title: legacyTitle?.trim() || DEFAULT_FOLDER.title,
          desc: legacyDesc?.trim() || DEFAULT_FOLDER.desc,
        };
        const initialList = Object.freeze([initialDefault]) as unknown as NoteFolder[];
        const initialJson = JSON.stringify(initialList);
        try {
          localStorage.setItem(STORAGE_FOLDERS_KEY, initialJson);
        } catch {}
        cachedFoldersRaw = initialJson;
        cachedFolders = initialList;
        return cachedFolders;
      }
      cachedFoldersRaw = null;
      cachedFolders = DEFAULT_FOLDERS;
      return cachedFolders;
    }

    if (raw === cachedFoldersRaw) {
      return cachedFolders;
    }

    const parsed = JSON.parse(raw) as NoteFolder[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      cachedFoldersRaw = raw;
      cachedFolders = Object.freeze(parsed) as unknown as NoteFolder[];
      return cachedFolders;
    }

    cachedFoldersRaw = raw;
    cachedFolders = DEFAULT_FOLDERS;
    return cachedFolders;
  } catch {
    return cachedFolders;
  }
}

function readActiveId(): string {
  if (typeof window === "undefined") return "default";
  try {
    return localStorage.getItem(STORAGE_ACTIVE_KEY) || "default";
  } catch {
    return "default";
  }
}

function readNoteFolderMap(): Record<string, string> {
  if (typeof window === "undefined") return EMPTY_MAP;
  try {
    const raw = localStorage.getItem(STORAGE_MAP_KEY);
    if (!raw) {
      cachedMapRaw = null;
      cachedMap = EMPTY_MAP;
      return cachedMap;
    }

    if (raw === cachedMapRaw) {
      return cachedMap;
    }

    const parsed = JSON.parse(raw) as Record<string, string>;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      cachedMapRaw = raw;
      cachedMap = Object.freeze(parsed) as unknown as Record<string, string>;
      return cachedMap;
    }

    cachedMapRaw = raw;
    cachedMap = EMPTY_MAP;
    return cachedMap;
  } catch {
    return cachedMap;
  }
}

function subscribeFolders(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT_FOLDERS_CHANGE, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT_FOLDERS_CHANGE, callback);
  };
}

function notifyFolders() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_FOLDERS_CHANGE));
  }
}

const getServerFoldersSnapshot = () => DEFAULT_FOLDERS;
const getServerActiveId = () => "default";
const getServerMapSnapshot = () => EMPTY_MAP;

export function useNoteFolders() {
  const folders = useSyncExternalStore(subscribeFolders, readFolders, getServerFoldersSnapshot);
  const activeFolderId = useSyncExternalStore(subscribeFolders, readActiveId, getServerActiveId);
  const noteFolderMap = useSyncExternalStore(subscribeFolders, readNoteFolderMap, getServerMapSnapshot);

  const activeFolder = useMemo(() => {
    if (activeFolderId === "all") return null;
    return folders.find(f => f.id === activeFolderId) || folders[0] || DEFAULT_FOLDER;
  }, [activeFolderId, folders]);

  const setActiveFolderId = useCallback((id: string) => {
    try {
      localStorage.setItem(STORAGE_ACTIVE_KEY, id);
    } catch {}
    notifyFolders();
  }, []);

  const createFolder = useCallback((input: { title: string; desc: string; color: FolderColorKey }): NoteFolder => {
    const current = readFolders();
    const id = `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newFolder: NoteFolder = {
      id,
      title: input.title.trim() || "Untitled Folder",
      desc: input.desc.trim() || "Documents & Notes",
      color: input.color || "blue",
      createdAt: new Date().toISOString(),
    };
    const updated = [...current, newFolder];
    const json = JSON.stringify(updated);
    try {
      localStorage.setItem(STORAGE_FOLDERS_KEY, json);
      localStorage.setItem(STORAGE_ACTIVE_KEY, id);
    } catch {}
    cachedFoldersRaw = json;
    cachedFolders = Object.freeze(updated) as unknown as NoteFolder[];
    notifyFolders();
    return newFolder;
  }, []);

  const updateFolder = useCallback((id: string, changes: Partial<Omit<NoteFolder, "id" | "createdAt">>) => {
    const current = readFolders();
    const updated = current.map(f => {
      if (f.id === id) {
        return {
          ...f,
          title: changes.title !== undefined ? (changes.title.trim() || f.title) : f.title,
          desc: changes.desc !== undefined ? (changes.desc.trim() || f.desc) : f.desc,
          color: changes.color || f.color,
        };
      }
      return f;
    });
    const json = JSON.stringify(updated);
    try {
      localStorage.setItem(STORAGE_FOLDERS_KEY, json);
      // Keep legacy keys updated for default folder
      const def = updated.find(f => f.id === "default");
      if (def) {
        localStorage.setItem("tf_memo_folder_title", def.title);
        localStorage.setItem("tf_memo_folder_desc", def.desc);
      }
    } catch {}
    cachedFoldersRaw = json;
    cachedFolders = Object.freeze(updated) as unknown as NoteFolder[];
    notifyFolders();
  }, []);

  const deleteFolder = useCallback((id: string) => {
    if (id === "default") return; // cannot delete default Daily Memo folder
    const current = readFolders();
    const updated = current.filter(f => f.id !== id);
    const map = readNoteFolderMap();
    // Reassign all notes from deleted folder to default
    const updatedMap: Record<string, string> = {};
    for (const [noteId, fId] of Object.entries(map)) {
      if (fId === id) {
        updatedMap[noteId] = "default";
      } else {
        updatedMap[noteId] = fId;
      }
    }
    const foldersJson = JSON.stringify(updated);
    const mapJson = JSON.stringify(updatedMap);
    try {
      localStorage.setItem(STORAGE_FOLDERS_KEY, foldersJson);
      localStorage.setItem(STORAGE_MAP_KEY, mapJson);
      if (readActiveId() === id) {
        localStorage.setItem(STORAGE_ACTIVE_KEY, "default");
      }
    } catch {}
    cachedFoldersRaw = foldersJson;
    cachedFolders = Object.freeze(updated) as unknown as NoteFolder[];
    cachedMapRaw = mapJson;
    cachedMap = Object.freeze(updatedMap) as unknown as Record<string, string>;
    notifyFolders();
  }, []);

  const assignNoteToFolder = useCallback((noteId: number, folderId: string) => {
    const currentMap = readNoteFolderMap();
    const nextMap: Record<string, string> = {
      ...currentMap,
      [String(noteId)]: folderId,
    };
    const json = JSON.stringify(nextMap);
    try {
      localStorage.setItem(STORAGE_MAP_KEY, json);
    } catch {}
    cachedMapRaw = json;
    cachedMap = Object.freeze(nextMap) as unknown as Record<string, string>;
    notifyFolders();
  }, []);

  const getNoteFolderId = useCallback((noteId: number): string => {
    return noteFolderMap[String(noteId)] || "default";
  }, [noteFolderMap]);

  const getNoteFolder = useCallback((noteId: number): NoteFolder => {
    const folderId = noteFolderMap[String(noteId)] || "default";
    return folders.find(f => f.id === folderId) || folders[0] || DEFAULT_FOLDER;
  }, [folders, noteFolderMap]);

  const filterNotesByFolder = useCallback((allNotes: Note[], targetFolderId: string): Note[] => {
    if (targetFolderId === "all") return allNotes;
    return allNotes.filter(n => {
      const fId = noteFolderMap[String(n.id)] || "default";
      return fId === targetFolderId;
    });
  }, [noteFolderMap]);

  return {
    folders,
    activeFolderId,
    activeFolder,
    setActiveFolderId,
    createFolder,
    updateFolder,
    deleteFolder,
    assignNoteToFolder,
    getNoteFolderId,
    getNoteFolder,
    filterNotesByFolder,
  };
}
