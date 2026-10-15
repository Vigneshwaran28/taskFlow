// Smart views: each maps to API filters computed in the user's local timezone.
import type { ComponentType } from "react";
import { CalendarClock, CalendarDays, CheckCheck, ListTodo, TriangleAlert } from "lucide-react";
import { addDays, endOfDay, startOfDay } from "@/lib/dates";
import type { TaskQuery } from "../services/taskService";

// Rounded to the minute so query keys stay stable between renders (no refetch loop).
const nowMinute = () => {
  const date = new Date();
  date.setSeconds(0, 0);
  return date;
};

export type TaskViewKey = "today" | "upcoming" | "overdue" | "all" | "completed";

export interface TaskView {
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  emptyTitle: string;
  emptyMessage: string;
  query: () => TaskQuery;
}

export const TASK_VIEWS: Readonly<Record<TaskViewKey, TaskView>> = Object.freeze<Record<TaskViewKey, TaskView>>({
  today: {
    label: "Today",
    description: "Everything due today.",
    icon: CalendarDays,
    emptyTitle: "Nothing due today",
    emptyMessage: "Enjoy the free time, or plan something new.",
    query: () => ({ status: "open", dueFrom: startOfDay().toISOString(), dueTo: endOfDay().toISOString(), sort: "due" }),
  },
  upcoming: {
    label: "Upcoming",
    description: "Due in the next 7 days.",
    icon: CalendarClock,
    emptyTitle: "No upcoming tasks",
    emptyMessage: "Tasks due in the next week will show up here.",
    query: () => ({ status: "open", dueFrom: nowMinute().toISOString(), dueTo: endOfDay(addDays(nowMinute(), 7)).toISOString(), sort: "due" }),
  },
  overdue: {
    label: "Overdue",
    description: "Past their due date and still open.",
    icon: TriangleAlert,
    emptyTitle: "You're all caught up",
    emptyMessage: "No overdue tasks. Nice work.",
    query: () => ({ status: "open", dueTo: nowMinute().toISOString(), sort: "due" }),
  },
  all: {
    label: "All tasks",
    description: "Every open task across your lists.",
    icon: ListTodo,
    emptyTitle: "No open tasks",
    emptyMessage: "Create your first task to get started.",
    query: () => ({ status: "open", sort: "due" }),
  },
  completed: {
    label: "Completed",
    description: "Finished tasks, most recent first.",
    icon: CheckCheck,
    emptyTitle: "No completed tasks yet",
    emptyMessage: "Completed tasks will appear here.",
    query: () => ({ status: "done", sort: "created", dir: "desc" }),
  },
});

export const isTaskView = (view: string | undefined): view is TaskViewKey => Boolean(view && Object.hasOwn(TASK_VIEWS, view));
