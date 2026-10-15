import { apiClient } from "@/lib/apiClient";
import type { Page } from "@/types/session";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskRepeat = "none" | "daily" | "weekly" | "monthly";
export type TaskSort = "due" | "priority" | "created" | "title";

export interface TaskListRef {
  id: number;
  name: string;
  color: string;
}

export interface Task {
  id: number;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  listId: number | null;
  list: TaskListRef | null;
  /** ISO UTC */
  dueAt: string | null;
  /** ISO UTC */
  remindAt: string | null;
  reminderSent: boolean;
  repeat: TaskRepeat;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  notes: string | null;
  status?: TaskStatus;
  priority: TaskPriority;
  listId: number | null;
  dueAt: string | null;
  remindAt: string | null;
  repeat: TaskRepeat;
}

export interface TaskQuery {
  status?: TaskStatus | "open";
  priority?: TaskPriority;
  listId?: number;
  search?: string;
  dueFrom?: string;
  dueTo?: string;
  hasDue?: boolean;
  sort?: TaskSort;
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

interface RequestOptions {
  signal?: AbortSignal;
}

export const taskService = {
  async getTasks(query: TaskQuery = {}, { signal }: RequestOptions = {}): Promise<Page<Task>> {
    const { hasDue, ...rest } = query;
    const data = await apiClient.get<Partial<Page<Task>> | null>("/tasks", {
      params: { ...rest, hasDue: hasDue === undefined ? undefined : String(hasDue) },
      signal,
    });
    return {
      items: data?.items ?? [],
      page: data?.page ?? 1,
      pageSize: data?.pageSize ?? query.pageSize ?? 20,
      total: data?.total ?? 0,
      totalPages: data?.totalPages ?? 0,
    };
  },

  getTask(id: number, { signal }: RequestOptions = {}) {
    return apiClient.get<Task>(`/tasks/${id}`, { signal });
  },

  createTask(input: TaskInput) {
    return apiClient.post<Task>("/tasks", input);
  },

  updateTask(id: number, input: Partial<TaskInput>) {
    return apiClient.patch<Task>(`/tasks/${id}`, input);
  },

  deleteTask(id: number) {
    return apiClient.delete(`/tasks/${id}`);
  },
};
