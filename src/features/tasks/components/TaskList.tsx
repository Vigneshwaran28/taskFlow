"use client";
// Feature component: fetches tasks for a query and renders every async state.
import Link from "@/components/navigation/Link";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Pagination } from "@/components/ui/Pagination";
import { useTasks, useToggleTask } from "../hooks/useTasks";
import type { Task, TaskQuery } from "../services/taskService";
import { TaskRow } from "./TaskRow";
import { useTaskDialog } from "./TaskDialogProvider";

export interface TaskListProps {
  query: TaskQuery;
  emptyTitle: string;
  emptyMessage?: string;
  /** Changes the empty message */
  isSearching?: boolean;
  onPageChange: (page: number) => void;
  /** Link used when the page is out of range */
  firstPageHref: string;
  showList?: boolean;
}

export function TaskList({ query, emptyTitle, emptyMessage, isSearching = false, onPageChange, firstPageHref, showList = true }: TaskListProps) {
  const toast = useToast();
  const { openEdit } = useTaskDialog();
  const { data, isPending, isFetching, error, refetch } = useTasks(query);
  const toggleTask = useToggleTask();

  function handleToggle(task: Task, done: boolean) {
    toggleTask.mutate(
      { id: task.id, done },
      {
        onSuccess: () => {
          if (done && task.repeat !== "none") toast.info("Nice! Next occurrence scheduled.", task.title);
        },
        onError: () => toast.error("Couldn't update the task", "Your change was undone. Please try again."),
      }
    );
  }

  if (isPending) return <LoadingState label="Loading tasks…" />;
  if (error) return <ErrorState message="Unable to load tasks." onRetry={() => void refetch()} />;

  if (data.page > data.totalPages && data.totalPages > 0) {
    return (
      <EmptyState
        title="Page not found"
        message="This page is past the end of the results."
        action={
          <Link href={firstPageHref} className="text-sm font-medium text-primary hover:underline">
            Go to page 1
          </Link>
        }
      />
    );
  }

  if (!data.items.length) {
    return isSearching ? <EmptyState title="No matching tasks" message="Try a different search or clear the filters." /> : <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  const refreshing = isFetching && !isPending;

  return (
    <div className="flex flex-col gap-3">
      <ul aria-busy={refreshing} className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
        {data.items.map(task => (
          <TaskRow key={task.id} task={task} onToggle={handleToggle} onOpen={openEdit} showList={showList} />
        ))}
      </ul>
      <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={onPageChange} disabled={refreshing} />
    </div>
  );
}
