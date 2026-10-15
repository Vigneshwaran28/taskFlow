import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { Page } from "@/types/session";
import { taskService, type Task, type TaskInput, type TaskQuery } from "../services/taskService";

/** Query key factory: the only place task keys are built. */
export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (query: TaskQuery) => [...taskKeys.lists(), query] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: number) => [...taskKeys.details(), id] as const,
};

// Other caches that summarize tasks.
const DEPENDENT_KEYS = [["stats"], ["lists"]];

function invalidateTaskViews(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  DEPENDENT_KEYS.forEach(queryKey => queryClient.invalidateQueries({ queryKey }));
}

export function useTasks(query: TaskQuery, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: taskKeys.list(query),
    queryFn: ({ signal }) => taskService.getTasks(query, { signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taskService.createTask,
    onSuccess: () => invalidateTaskViews(queryClient),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<TaskInput> }) => taskService.updateTask(id, input),
    onSuccess: task => {
      queryClient.setQueryData(taskKeys.detail(task.id), task);
      invalidateTaskViews(queryClient);
    },
  });
}

/** Checkbox toggle: optimistic, with rollback on failure. */
export function useToggleTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) => taskService.updateTask(id, { status: done ? "done" : "todo" }),
    onMutate: ({ id, done }) => {
      // Update the cache first so the checkbox never snaps back, then stop in-flight refetches
      // from overwriting it (revert: false keeps the optimistic data).
      const snapshot = queryClient.getQueriesData<Page<Task>>({ queryKey: taskKeys.lists() });
      queryClient.setQueriesData<Page<Task>>({ queryKey: taskKeys.lists() }, old =>
        old
          ? {
              ...old,
              items: old.items.map(task =>
                task.id === id ? { ...task, status: done ? "done" : "todo", completedAt: done ? new Date().toISOString() : null } : task
              ),
            }
          : old
      );
      void queryClient.cancelQueries({ queryKey: taskKeys.lists() }, { revert: false });
      return { snapshot };
    },
    onError: (_error, _variables, context) => context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data)),
    onSettled: () => invalidateTaskViews(queryClient),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taskService.deleteTask,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });
      invalidateTaskViews(queryClient);
    },
  });
}
