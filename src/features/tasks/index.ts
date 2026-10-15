// Public API of the tasks feature.
export { TasksPage } from "./pages/TasksPage";
export { CalendarPage } from "./pages/CalendarPage";
export { TaskDialogProvider, useTaskDialog } from "./components/TaskDialogProvider";
export type { TaskDialogApi } from "./components/TaskDialogProvider";
export type { TaskDefaults } from "./components/TaskFormDialog";
export { TaskRow } from "./components/TaskRow";
export { PriorityBadge } from "./components/PriorityBadge";
export { QuickAddTask } from "./components/QuickAddTask";
export { useToggleTask, taskKeys } from "./hooks/useTasks";
export { taskService } from "./services/taskService";
export type { Task, TaskInput, TaskPriority, TaskQuery, TaskRepeat, TaskStatus } from "./services/taskService";
export { TASK_VIEWS } from "./utils/taskViews";
export type { TaskView, TaskViewKey } from "./utils/taskViews";
export { PRIORITY_OPTIONS } from "./utils/taskMeta";
