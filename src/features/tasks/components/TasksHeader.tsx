"use client";
// Feature component: resolves the heading for a smart view or a list (lists come from the API).
// "New task" lives in the top bar on task pages (with this page's list or due date), so the header has no button of its own.
import { PageHeader } from "@/components/shared/PageHeader";
import { useLists } from "@/features/lists";
import { TASK_VIEWS, type TaskViewKey } from "../utils/taskViews";

export interface TasksHeaderProps {
  /** Smart view key when not showing a list */
  view?: TaskViewKey;
  listId?: number;
}

export function TasksHeader({ view, listId }: TasksHeaderProps) {
  const { data: lists } = useLists();
  const list = listId ? lists?.find(item => item.id === listId) : null;
  const viewConfig = listId || !view ? null : TASK_VIEWS[view];

  const title = listId ? (list?.name ?? "List") : (viewConfig?.label ?? "");
  const description = listId ? `${list?.openCount ?? 0} open ${list?.openCount === 1 ? "task" : "tasks"} in this list.` : viewConfig?.description;

  return <PageHeader title={title} description={description} />;
}
