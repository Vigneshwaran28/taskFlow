import { useCallback, useSyncExternalStore } from "react";

// ---- Board or list: remembered per browser ----
export type NotesView = "board" | "list";
const VIEW_KEY = "tf-notes-view";
const VIEW_EVENT = "tf-notes-view";

let memoryView: NotesView | null = null; // this page's choice, even when storage is blocked

function readView(): NotesView {
  if (memoryView) return memoryView;
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "board";
  } catch {
    return "board";
  }
}
function subscribeView(callback: () => void) {
  window.addEventListener(VIEW_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(VIEW_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useNotesView(): [NotesView, (view: NotesView) => void] {
  const view = useSyncExternalStore(subscribeView, readView, () => "board" as const);
  const setView = useCallback((next: NotesView) => {
    memoryView = next;
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* storage blocked: the choice lasts for this page only */
    }
    window.dispatchEvent(new Event(VIEW_EVENT));
  }, []);
  return [view, setView];
}

// ---- Phones get a stacked list instead of the board ----
const NARROW = "(max-width: 639px)";
function subscribeNarrow(callback: () => void) {
  const media = window.matchMedia(NARROW);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
export function useIsNarrow() {
  return useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW).matches, () => false);
}
