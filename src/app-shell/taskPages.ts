// Where task creation belongs: the task views, lists, and the calendar (the top bar's "New task" and the N shortcut).
import { endOfDay } from "@/lib/dates";
import type { TaskDefaults } from "@/features/tasks";

/** Task pages: /tasks/*, /lists/*, /calendar (paths without the workspace prefix). */
export function isTaskPage(pathname: string) {
  return /^\/(tasks|lists|calendar)(\/|$)/.test(pathname);
}

/** What a new task starts with on this page: the open list, or today's due time on the Today view. */
export function taskDefaultsFor(pathname: string): TaskDefaults | undefined {
  const list = /^\/lists\/(\d+)/.exec(pathname);
  if (list) return { listId: Number(list[1]) };
  if (pathname === "/tasks/today") {
    const due = new Date();
    due.setHours(18, 0, 0, 0);
    return { dueAt: (due > new Date() ? due : endOfDay()).toISOString() };
  }
  return undefined;
}
