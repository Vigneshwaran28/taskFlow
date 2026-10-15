"use client";
// Page: owns route params + URL state (search, filters, page) and passes a query to TaskList.
import { useParams } from "next/navigation";
import { usePathname, useSearchParamsState } from "@/lib/navigation";
import { Redirect } from "@/app-shell/guards";
import { useDebounce } from "@/hooks/useDebounce";
import { endOfDay } from "@/lib/dates";
import { QuickAddTask } from "../components/QuickAddTask";
import { TaskFilters, type TaskFilterName } from "../components/TaskFilters";
import { TaskList } from "../components/TaskList";
import { TasksHeader } from "../components/TasksHeader";
import type { TaskDefaults } from "../components/TaskFormDialog";
import type { TaskPriority, TaskQuery, TaskSort, TaskStatus } from "../services/taskService";
import { isTaskView, TASK_VIEWS } from "../utils/taskViews";

const PAGE_SIZE = 20;

/** Default due time for tasks added from the Today view: 6 PM, or end of day if it's later. */
function todayDueDefault() {
  const due = new Date();
  due.setHours(18, 0, 0, 0);
  return (due > new Date() ? due : endOfDay()).toISOString();
}

export function TasksPage() {
  const { view, listId: listIdParam } = useParams<{ view?: string; listId?: string }>();
  const pathname = usePathname();
  const listId = listIdParam ? Number(listIdParam) : undefined;

  const [params, setParams] = useSearchParamsState();
  const search = params.get("q") ?? "";
  const priority = params.get("priority") ?? "";
  const sort = params.get("sort") ?? "";
  const status = params.get("status") ?? "open";
  const page = Number(params.get("page")) || 1;
  const debouncedSearch = useDebounce(search, 300);

  const smartView = isTaskView(view) ? view : undefined;
  if (!listId && !smartView) return <Redirect to="/tasks/today" />;

  const viewConfig = listId || !smartView ? null : TASK_VIEWS[smartView];
  const base: TaskQuery = viewConfig ? viewConfig.query() : { listId, status: status === "all" ? undefined : (status as TaskStatus | "open"), sort: "due" };

  const query: TaskQuery = {
    ...base,
    search: debouncedSearch || undefined,
    priority: (priority || undefined) as TaskPriority | undefined,
    sort: (sort as TaskSort) || base.sort,
    dir: sort ? (sort === "created" ? "desc" : "asc") : base.dir,
    page,
    pageSize: PAGE_SIZE,
  };

  function handleFilterChange(name: TaskFilterName, value: string) {
    setParams(
      prev => {
        if (value && !(name === "status" && value === "open")) prev.set(name, value);
        else prev.delete(name);
        prev.delete("page"); // new filter → page 1
        return prev;
      },
      { push: name !== "q" } // keystrokes don't flood history
    );
  }

  function handlePageChange(nextPage: number) {
    setParams(
      prev => {
        if (nextPage > 1) prev.set("page", String(nextPage));
        else prev.delete("page");
        return prev;
      },
      { push: true }
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const defaults: TaskDefaults | undefined = listId ? { listId } : smartView === "today" ? { dueAt: todayDueDefault() } : undefined;
  const firstPageParams = new URLSearchParams(params.toString());
  firstPageParams.delete("page");
  const firstPageQuery = firstPageParams.toString();

  return (
    <div className="flex flex-col gap-6">
      <TasksHeader view={smartView} listId={listId} />

      <TaskFilters values={{ search, priority, sort: sort || base.sort || "", status }} onChange={handleFilterChange} showStatus={Boolean(listId)} />

      {smartView !== "completed" && status !== "done" && <QuickAddTask defaults={defaults} />}

      <TaskList
        query={query}
        isSearching={Boolean(debouncedSearch || priority)}
        emptyTitle={viewConfig?.emptyTitle ?? "This list is empty"}
        emptyMessage={viewConfig?.emptyMessage ?? "Add a task above to get started."}
        onPageChange={handlePageChange}
        firstPageHref={firstPageQuery ? `${pathname}?${firstPageQuery}` : pathname}
        showList={!listId}
      />
    </div>
  );
}
