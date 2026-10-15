"use client";
import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/dates";
import { useLists } from "@/features/lists";
import { useCreateTask, useDeleteTask, useUpdateTask } from "../hooks/useTasks";
import type { Task, TaskInput, TaskPriority, TaskRepeat, TaskStatus } from "../services/taskService";
import { PRIORITIES, REMINDER_PRESETS, REPEATS, STATUSES, toOptions } from "../utils/taskMeta";
import { validateTask, type TaskErrors } from "../utils/validateTask";

const MINUTE = 60_000;

/** Prefill for new tasks. */
export interface TaskDefaults {
  dueAt?: string | null;
  listId?: number | null;
}

interface FormValues {
  title: string;
  notes: string;
  listId: string;
  priority: TaskPriority;
  status: TaskStatus;
  due: string;
  reminder: string;
  remindCustom: string;
  repeat: TaskRepeat;
}

/** Pick the reminder preset that matches an existing task, else "custom". */
function reminderPresetFor(task: Task | null) {
  if (!task?.remindAt) return "none";
  if (!task.dueAt) return "custom";
  const minutesBefore = Math.round((new Date(task.dueAt).getTime() - new Date(task.remindAt).getTime()) / MINUTE);
  const preset = REMINDER_PRESETS.find(option => option.value === String(minutesBefore));
  return preset ? preset.value : "custom";
}

function initialValues(task: Task | null, defaults: TaskDefaults | undefined): FormValues {
  return {
    title: task?.title ?? "",
    notes: task?.notes ?? "",
    listId: String(task?.listId ?? defaults?.listId ?? ""),
    priority: task?.priority ?? "medium",
    status: task?.status ?? "todo",
    due: toLocalInputValue(task?.dueAt ?? defaults?.dueAt ?? null),
    reminder: reminderPresetFor(task),
    remindCustom: toLocalInputValue(task?.remindAt ?? null),
    repeat: task?.repeat ?? "none",
  };
}

/** Form values → API input. */
function toInput(values: FormValues, isEdit: boolean): TaskInput {
  const dueAt = fromLocalInputValue(values.due);
  let remindAt: string | null = null;
  if (values.reminder === "custom") remindAt = fromLocalInputValue(values.remindCustom);
  else if (values.reminder !== "none" && dueAt) remindAt = new Date(new Date(dueAt).getTime() - Number(values.reminder) * MINUTE).toISOString();

  return {
    title: values.title.trim(),
    notes: values.notes.trim() || null,
    listId: values.listId ? Number(values.listId) : null,
    priority: values.priority,
    ...(isEdit ? { status: values.status } : {}),
    dueAt,
    remindAt,
    repeat: values.repeat,
  };
}

const ERROR_FIELD: Partial<Record<keyof FormValues, string>> = { due: "dueAt", remindCustom: "remindAt" };

export interface TaskFormDialogProps {
  open: boolean;
  /** Edit mode when set */
  task?: Task | null;
  defaults?: TaskDefaults;
  onClose: () => void;
}

/** Create or edit a task. Mount with a `key` per task so the form resets between tasks. */
export function TaskFormDialog({ open, task = null, defaults, onClose }: TaskFormDialogProps) {
  const isEdit = Boolean(task);
  const toast = useToast();
  const { data: lists = [] } = useLists();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const mutation = isEdit ? updateTask : createTask;

  const [values, setValues] = useState<FormValues>(() => initialValues(task, defaults));
  const [clientErrors, setClientErrors] = useState<Record<string, string | undefined>>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const errors: Record<string, string | undefined> = { ...fieldErrorsOf(mutation.error), ...clientErrors };
  const formError = formErrorOf(mutation.error);

  function setField<K extends keyof FormValues>(name: K, value: FormValues[K]) {
    setValues(current => ({ ...current, [name]: value }));
    setClientErrors(current => ({ ...current, [ERROR_FIELD[name] ?? name]: undefined }));
    if (mutation.error) mutation.reset();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;

    const input = toInput(values, isEdit);
    const nextErrors: TaskErrors = validateTask({ ...input, reminder: values.reminder });
    setClientErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const onSuccess = () => {
      toast.success(isEdit ? "Task updated" : "Task created");
      onClose();
    };
    if (task) updateTask.mutate({ id: task.id, input }, { onSuccess });
    else createTask.mutate(input, { onSuccess });
  }

  function handleDelete() {
    if (!task) return;
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        toast.success("Task deleted");
        setConfirmingDelete(false);
        onClose();
      },
      onError: err => toast.error("Couldn't delete the task", err.message),
    });
  }

  const listOptions = [{ value: "", label: "No list" }, ...lists.map(list => ({ value: String(list.id), label: list.name }))];

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        size="lg"
        title={isEdit ? "Edit task" : "New task"}
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            {isEdit ? (
              <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirmingDelete(true)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" form="task-form" loading={mutation.isPending}>
                {isEdit ? "Save changes" : "Create task"}
              </Button>
            </div>
          </div>
        }
      >
        <form id="task-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <FormAlert message={formError} />

          <TextField
            label="Title"
            required
            autoFocus
            value={values.title}
            error={errors.title}
            onChange={event => setField("title", event.target.value)}
            placeholder="What needs to be done?"
            maxLength={200}
          />

          <TextAreaField
            label="Notes"
            value={values.notes}
            error={errors.notes}
            onChange={event => setField("notes", event.target.value)}
            placeholder="Add details, links, or context"
            maxLength={5000}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField label="List" options={listOptions} value={values.listId} error={errors.listId} onChange={event => setField("listId", event.target.value)} />
            <SelectField
              label="Priority"
              options={toOptions(PRIORITIES)}
              value={values.priority}
              onChange={event => setField("priority", event.target.value as TaskPriority)}
            />
            <TextField label="Due date" type="datetime-local" value={values.due} error={errors.dueAt} onChange={event => setField("due", event.target.value)} />
            <SelectField
              label="Repeat"
              options={toOptions(REPEATS)}
              value={values.repeat}
              error={errors.repeat}
              onChange={event => setField("repeat", event.target.value as TaskRepeat)}
            />
            <SelectField
              label="Reminder"
              options={REMINDER_PRESETS}
              value={values.reminder}
              error={values.reminder === "custom" ? undefined : errors.remindAt}
              onChange={event => setField("reminder", event.target.value)}
            />
            {values.reminder === "custom" && (
              <TextField
                label="Remind me at"
                type="datetime-local"
                value={values.remindCustom}
                error={errors.remindAt}
                onChange={event => setField("remindCustom", event.target.value)}
              />
            )}
            {isEdit && (
              <SelectField
                label="Status"
                options={toOptions(STATUSES)}
                value={values.status}
                onChange={event => setField("status", event.target.value as TaskStatus)}
              />
            )}
          </div>

          {values.repeat !== "none" && <p className="text-xs text-muted-foreground">When you complete this task, the next one is created automatically.</p>}
        </form>
      </Dialog>

      {task && (
        <ConfirmDialog
          open={confirmingDelete}
          title="Delete this task?"
          message={`"${task.title}" will be permanently deleted.`}
          pending={deleteTask.isPending}
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  );
}
