"use client";
import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { useToast } from "@/components/shared/Toaster";
import { fieldErrorsOf } from "@/lib/apiClient";
import { useCreateTask } from "../hooks/useTasks";

export interface QuickAddDefaults {
  dueAt?: string | null;
  listId?: number | null;
}

/** One-line task entry. Enter creates the task with the view's defaults. */
export function QuickAddTask({ defaults, placeholder = "Add a task and press Enter" }: { defaults?: QuickAddDefaults; placeholder?: string }) {
  const toast = useToast();
  const createTask = useCreateTask();
  const [title, setTitle] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || createTask.isPending) return;

    createTask.mutate(
      { title: trimmed, notes: null, priority: "medium", repeat: "none", remindAt: null, dueAt: defaults?.dueAt ?? null, listId: defaults?.listId ?? null },
      {
        onSuccess: () => setTitle(""),
        onError: err => toast.error("Couldn't add the task", Object.values(fieldErrorsOf(err))[0] ?? err.message),
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} data-tour="quick-add" className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-ring">
      <Plus className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <label htmlFor="quick-add" className="sr-only">
        New task title
      </label>
      <input
        id="quick-add"
        value={title}
        onChange={event => setTitle(event.target.value)}
        placeholder={placeholder}
        maxLength={200}
        disabled={createTask.isPending}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
      />
      {title.trim() && (
        <button type="submit" disabled={createTask.isPending} className="text-sm font-medium text-primary hover:underline disabled:opacity-50">
          Add
        </button>
      )}
    </form>
  );
}
