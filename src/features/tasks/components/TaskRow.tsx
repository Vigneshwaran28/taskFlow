import { Bell, CalendarDays, Pencil, Repeat } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateTime, formatRelativeDateTime } from "@/lib/dates";
import { colorFor } from "@/features/lists";
import type { Task } from "../services/taskService";
import { isOverdue, REPEATS } from "../utils/taskMeta";
import { PriorityBadge } from "./PriorityBadge";

export interface TaskRowProps {
  task: Task;
  onToggle: (task: Task, done: boolean) => void;
  onOpen: (task: Task) => void;
  showList?: boolean;
}

/** Presentational task row. */
export function TaskRow({ task, onToggle, onOpen, showList = true }: TaskRowProps) {
  const done = task.status === "done";
  const overdue = isOverdue(task);
  const checkboxId = `task-${task.id}-done`;

  return (
    <li className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
      <input
        id={checkboxId}
        type="checkbox"
        checked={done}
        onChange={event => onToggle(task, event.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-full accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <label htmlFor={checkboxId} className="sr-only">
        {done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
      </label>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onOpen(task)}
          className={cn(
            "block max-w-full line-clamp-2 rounded text-left text-sm font-medium wrap-break-word sm:line-clamp-none sm:truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            done && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </button>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {task.dueAt && (
            <span className={cn("inline-flex items-center gap-1", overdue && "font-medium text-destructive")} title={formatDateTime(task.dueAt)}>
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {overdue && <span className="sr-only">Overdue:</span>}
              {formatRelativeDateTime(task.dueAt)}
            </span>
          )}
          {task.remindAt && !done && (
            <span className="inline-flex items-center gap-1" title={`Reminder: ${formatDateTime(task.remindAt)}`}>
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Reminder set</span>
              {task.reminderSent ? "Reminded" : formatRelativeDateTime(task.remindAt)}
            </span>
          )}
          {task.repeat !== "none" && (
            <span className="inline-flex items-center gap-1">
              <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
              {REPEATS[task.repeat]?.label}
            </span>
          )}
          {showList && task.list && (
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", colorFor(task.list.color).dot)} aria-hidden="true" />
              {task.list.name}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {!done && <PriorityBadge priority={task.priority} />}
        <button
          type="button"
          onClick={() => onOpen(task)}
          aria-label={`Edit "${task.title}"`}
          className="rounded-md p-1.5 text-muted-foreground opacity-100 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}
