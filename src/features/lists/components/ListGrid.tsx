"use client";
// Feature component: loads lists and renders cards with edit/delete.
import { useState } from "react";
import Link from "@/components/navigation/Link";
import { FolderPlus, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { cn } from "@/lib/cn";
import { useDeleteList, useLists } from "../hooks/useLists";
import type { TaskList } from "../services/listService";
import { colorFor } from "../utils/listColors";

export interface ListGridProps {
  onEdit: (list: TaskList) => void;
  onCreate: () => void;
}

export function ListGrid({ onEdit, onCreate }: ListGridProps) {
  const toast = useToast();
  const { data: lists, isPending, error, refetch } = useLists();
  const deleteList = useDeleteList();
  const [deleting, setDeleting] = useState<TaskList | null>(null);

  if (isPending) return <LoadingState label="Loading lists…" />;
  if (error) return <ErrorState message="Unable to load lists." onRetry={() => void refetch()} />;
  if (!lists.length) {
    return (
      <EmptyState
        icon={FolderPlus}
        title="No lists yet"
        message="Lists help you group tasks by project, client, or area of life."
        action={
          <button type="button" onClick={onCreate} className="text-sm font-medium text-primary hover:underline">
            Create your first list
          </button>
        }
      />
    );
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteList.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("List deleted", "Its tasks were kept without a list.");
        setDeleting(null);
      },
      onError: err => toast.error("Couldn't delete the list", err.message),
    });
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {lists.map(list => {
          const color = colorFor(list.color);
          return (
            <li key={list.id} className="group relative flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/40">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={cn("h-3 w-3 shrink-0 rounded-full", color.dot)} aria-hidden="true" />
                  <Link href={`/lists/${list.id}`} className="truncate font-semibold after:absolute after:inset-0 focus-visible:underline focus-visible:outline-none">
                    {list.name}
                  </Link>
                </div>
                <div className="relative z-10 flex gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(list)}
                    aria-label={`Edit ${list.name}`}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(list)}
                    aria-label={`Delete ${list.name}`}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <span className={cn("self-start rounded-full px-2.5 py-1 text-xs font-medium", color.soft)}>
                {list.openCount} open {list.openCount === 1 ? "task" : "tasks"}
              </span>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this list?"
        message={deleting ? `"${deleting.name}" will be deleted. Its tasks stay, without a list.` : ""}
        pending={deleteList.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
