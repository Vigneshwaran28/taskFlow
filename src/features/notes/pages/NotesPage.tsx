"use client";
import { useState } from "react";
import { Archive, Inbox, LayoutDashboard, List, Plus, Search, StickyNote, User, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { Tabs } from "@/components/ui/Tabs";
import { TextField } from "@/components/ui/TextField";
import { useCan, useCurrentUser } from "@/features/auth";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/cn";
import { useSearchParam } from "@/lib/navigation";
import { NotesBoard } from "../components/board/NotesBoard";
import { NoteCard } from "../components/NoteCard";
import { NoteEditorDialog } from "../components/NoteEditorDialog";
import { useNotesView } from "../hooks/useBoardPrefs";
import { useNotes } from "../hooks/useNotes";
import { NOTE_COLORS, type Note, type NoteColor, type NoteScope } from "../services/noteService";
import { COLOR_META } from "../utils/noteMeta";

const TABS = [
  { id: "all", label: "All", icon: StickyNote },
  { id: "mine", label: "Mine", icon: User },
  { id: "shared", label: "Shared with me", icon: Users },
  { id: "archived", label: "Archived", icon: Archive },
] as const;

const EMPTY: Record<NoteScope, { title: string; message: string }> = {
  all: { title: "No notes yet", message: "Jot something down, then keep it private or share it with colleagues." },
  mine: { title: "You haven't written any notes", message: "Notes you create appear here." },
  shared: { title: "Nothing shared with you", message: "Notes colleagues share with you, or with everyone, appear here." },
  archived: { title: "No archived notes", message: "Archive notes you're done with to tidy the board without deleting them." },
};

const VIEWS = [
  { id: "board", label: "Board", icon: LayoutDashboard },
  { id: "list", label: "List", icon: List },
] as const;

const isScope =(value: string | null): value is NoteScope => TABS.some(tab => tab.id === value);
const isColor = (value: string | null): value is NoteColor => NOTE_COLORS.some(color => color === value);

export function NotesPage() {
  const { data: me } = useCurrentUser();
  const canWrite = useCan("notes.use", "notes.manage");
  const [tabParam, setTab] = useSearchParam("tab");
  const [colorParam, setColor] = useSearchParam("color");
  const scope: NoteScope = isScope(tabParam) ? tabParam : "all";
  const color: NoteColor | "" = isColor(colorParam) ? colorParam : "";
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 300);
  const { data, isPending, error, refetch, isFetching } = useNotes({ scope, search: debouncedSearch, color });
  const [editor, setEditor] = useState<{ key: number; note: Note | null } | null>(null);

  const [view, setView] = useNotesView();

  const open = (note: Note | null) => setEditor(current => ({ key: (current?.key ?? 0) + 1, note }));
  const filtered = Boolean(debouncedSearch || color);

  const viewToggle = (
    <div role="group" aria-label="Notes view" className="inline-flex rounded-lg border bg-card p-0.5">
      {VIEWS.map(option => (
        <button
          key={option.id}
          type="button"
          aria-pressed={view === option.id}
          onClick={() => setView(option.id)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            view === option.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <option.icon className="h-4 w-4" aria-hidden="true" />
          {option.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className={cn("mx-auto flex w-full min-w-0 flex-col gap-6", view === "list" && "max-w-7xl")}>
      <PageHeader
        title="Notes"
        description="Sticky notes for you, a few colleagues, or the whole workspace."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {viewToggle}
            {canWrite && view === "list" && (
              <Button onClick={() => open(null)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                New note
              </Button>
            )}
          </div>
        }
      />
      {view === "board" ? (
        <NotesBoard onOpen={open} />
      ) : (
      <Tabs name="notes" label="Note views" tabs={TABS} active={scope} onChange={id => setTab(id === "all" ? null : id)}>
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="relative min-w-0 flex-1">
              <TextField label="Search notes" type="search" placeholder="Search titles and text" value={search} onChange={event => setSearch(event.target.value)} maxLength={100} className="[&_input]:pl-9" />
              <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <SelectField
              label="Colour"
              className="sm:w-44"
              value={color}
              onChange={event => setColor(event.target.value || null)}
              options={[{ value: "", label: "All colours" }, ...NOTE_COLORS.map(value => ({ value, label: COLOR_META[value].label }))]}
            />
          </div>

          {isPending ? (
            <LoadingState label="Loading notes…" />
          ) : error || !data ? (
            <ErrorState message="Unable to load notes." onRetry={() => void refetch()} />
          ) : !data.items.length ? (
            filtered ? (
              <EmptyState title="No matching notes" message="Try another search or colour." icon={Search} />
            ) : (
              <EmptyState
                title={EMPTY[scope].title}
                message={EMPTY[scope].message}
                icon={scope === "archived" ? Archive : Inbox}
                action={
                  canWrite && scope !== "archived" && scope !== "shared" ? (
                    <Button onClick={() => open(null)}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      New note
                    </Button>
                  ) : undefined
                }
              />
            )
          ) : (
            <section aria-label="Notes board" aria-busy={isFetching || undefined}>
              <p className="sr-only" aria-live="polite">
                {data.total} {data.total === 1 ? "note" : "notes"}
              </p>
              <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3 2xl:columns-4">
                {data.items.map(note => (
                  <li key={note.id} className="break-inside-avoid">
                    <NoteCard note={note} currentUserId={me?.id} onOpen={open} />
                  </li>
                ))}
              </ul>
              {data.total > data.items.length && <p className="text-center text-sm text-muted-foreground">Showing the first {data.items.length} of {data.total}. Search to narrow it down.</p>}
            </section>
          )}
        </div>
      </Tabs>
      )}
      {editor && <NoteEditorDialog key={editor.key} initial={editor.note} onClose={() => setEditor(null)} />}
    </div>
  );
}
