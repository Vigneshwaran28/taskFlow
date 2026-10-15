import { Search } from "lucide-react";
import { PRIORITIES, toOptions } from "../utils/taskMeta";

const SORT_OPTIONS = [
  { value: "due", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "created", label: "Newest" },
  { value: "title", label: "Title" },
];

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "done", label: "Completed" },
  { value: "all", label: "All" },
];

const selectClass = "h-9 rounded-lg border border-input bg-card px-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface TaskFilterValues {
  search: string;
  priority: string;
  sort: string;
  status?: string;
}

export type TaskFilterName = "q" | "status" | "priority" | "sort";

export interface TaskFiltersProps {
  values: TaskFilterValues;
  onChange: (name: TaskFilterName, value: string) => void;
  showStatus?: boolean;
}

/** Presentational filter bar. Values come from the page's URL state. */
export function TaskFilters({ values, onChange, showStatus = false }: TaskFiltersProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="task-search" className="sr-only">
          Search tasks
        </label>
        <input
          id="task-search"
          type="search"
          value={values.search}
          onChange={event => onChange("q", event.target.value)}
          placeholder="Search tasks"
          className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {showStatus && (
          <>
            <label htmlFor="task-status" className="sr-only">
              Status
            </label>
            <select id="task-status" value={values.status} onChange={event => onChange("status", event.target.value)} className={selectClass}>
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </>
        )}
        <label htmlFor="task-priority" className="sr-only">
          Priority
        </label>
        <select id="task-priority" value={values.priority} onChange={event => onChange("priority", event.target.value)} className={selectClass}>
          <option value="">All priorities</option>
          {toOptions(PRIORITIES).map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label htmlFor="task-sort" className="sr-only">
          Sort by
        </label>
        <select id="task-sort" value={values.sort} onChange={event => onChange("sort", event.target.value)} className={selectClass}>
          {SORT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              Sort: {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
