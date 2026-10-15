"use client";
// Lets any screen open the task create/edit dialog: const { openCreate, openEdit } = useTaskDialog();
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/shared/Toaster";
import { taskKeys } from "../hooks/useTasks";
import { taskService, type Task } from "../services/taskService";
import { TaskFormDialog, type TaskDefaults } from "./TaskFormDialog";

export interface TaskDialogApi {
  openCreate: (defaults?: TaskDefaults) => void;
  openEdit: (task: Task) => void;
  /** Open a task by id (e.g. from a notification); fetches it first. */
  openEditById: (id: number) => Promise<void>;
}

interface DialogState {
  open: boolean;
  task: Task | null;
  defaults: TaskDefaults | undefined;
  key: number;
}

const TaskDialogContext = createContext<TaskDialogApi | null>(null);

export function TaskDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({ open: false, task: null, defaults: undefined, key: 0 });

  const openCreate = useCallback((defaults?: TaskDefaults) => setState(current => ({ open: true, task: null, defaults, key: current.key + 1 })), []);
  const openEdit = useCallback((task: Task) => setState(current => ({ open: true, task, defaults: undefined, key: current.key + 1 })), []);
  const queryClient = useQueryClient();
  const toast = useToast();
  const openEditById = useCallback(
    async (id: number) => {
      try {
        const task = await queryClient.fetchQuery({ queryKey: taskKeys.detail(id), queryFn: ({ signal }) => taskService.getTask(id, { signal }) });
        openEdit(task);
      } catch {
        toast.error("This task is no longer available");
      }
    },
    [queryClient, openEdit, toast]
  );
  const close = useCallback(() => setState(current => ({ ...current, open: false })), []);

  const value = useMemo<TaskDialogApi>(() => ({ openCreate, openEdit, openEditById }), [openCreate, openEdit, openEditById]);

  return (
    <TaskDialogContext.Provider value={value}>
      {children}
      {/* key resets the form for every open */}
      <TaskFormDialog key={state.key} open={state.open} task={state.task} defaults={state.defaults} onClose={close} />
    </TaskDialogContext.Provider>
  );
}

export function useTaskDialog() {
  const context = useContext(TaskDialogContext);
  if (!context) throw new Error("useTaskDialog must be used inside TaskDialogProvider");
  return context;
}
