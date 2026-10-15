"use client";
// Home widget: the few notes changed most recently that this person can see (their own and shared ones).
import Link from "@/components/navigation/Link";
import { StickyNote } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { cn } from "@/lib/cn";
import { formatTimeAgo } from "@/lib/dates";
import { useNotes } from "../hooks/useNotes";
import { COLOR_META } from "../utils/noteMeta";

const FILTERS = { scope: "all", search: "", color: "" } as const;

export function RecentNotes({ limit = 4 }: { limit?: number }) {
  const { data, isPending, error, refetch } = useNotes(FILTERS);
  if (isPending) return <LoadingState className="py-6" label="Loading notes…" />;
  if (error) return <ErrorState message="Unable to load notes." onRetry={() => void refetch()} />;
  const notes = (data?.items ?? []).slice(0, limit);
  if (!notes.length) {
    return (
      <Link href="/notes" className="flex items-center gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground hover:bg-muted">
        <StickyNote className="h-4 w-4" aria-hidden="true" />
        No notes yet. Write your first one.
      </Link>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {notes.map(note => (
        <li key={note.id}>
          <Link
            href="/notes"
            className={cn("flex h-full min-w-0 flex-col gap-1 rounded-xl border p-3 text-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", COLOR_META[note.color]?.card)}
          >
            <span className="truncate font-medium">{note.title || "Untitled"}</span>
            <span className="line-clamp-3 break-words text-xs opacity-80">{note.body}</span>
            <span className="mt-auto pt-1 text-xs opacity-70">
              {note.access === "owner" ? "You" : note.owner.name} · {formatTimeAgo(note.updatedAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
