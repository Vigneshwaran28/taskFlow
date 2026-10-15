"use client";
import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { useCreateList, useUpdateList } from "../hooks/useLists";
import type { ListColor, TaskList } from "../services/listService";
import { LIST_COLORS } from "../utils/listColors";

export interface ListFormDialogProps {
  open: boolean;
  list?: TaskList | null;
  onClose: () => void;
}

/** Create or edit a list. Mount with a `key` so the form resets. */
export function ListFormDialog({ open, list = null, onClose }: ListFormDialogProps) {
  const isEdit = Boolean(list);
  const toast = useToast();
  const createList = useCreateList();
  const updateList = useUpdateList();
  const mutation = isEdit ? updateList : createList;

  const [name, setName] = useState(list?.name ?? "");
  const [color, setColor] = useState<ListColor>(list?.color ?? "indigo");
  const [clientError, setClientError] = useState<string | null>(null);

  const serverErrors = fieldErrorsOf(mutation.error);
  const nameError = clientError ?? serverErrors.name;
  const formError = formErrorOf(mutation.error);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    if (!name.trim()) {
      setClientError("Name is required.");
      return;
    }
    if (name.trim().length > 80) {
      setClientError("Keep it under 80 characters.");
      return;
    }
    const input = { name: name.trim(), color };
    const onSuccess = () => {
      toast.success(isEdit ? "List updated" : "List created");
      onClose();
    };
    if (list) updateList.mutate({ id: list.id, input }, { onSuccess });
    else createList.mutate(input, { onSuccess });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={isEdit ? "Edit list" : "New list"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="list-form" loading={mutation.isPending}>
            {isEdit ? "Save" : "Create list"}
          </Button>
        </>
      }
    >
      <form id="list-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <FormAlert message={formError} />
        <TextField
          label="Name"
          required
          autoFocus
          maxLength={80}
          value={name}
          error={nameError}
          onChange={event => {
            setName(event.target.value);
            setClientError(null);
            if (mutation.error) mutation.reset();
          }}
          placeholder="e.g. Marketing, Home, Q4 goals"
        />
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Color</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(LIST_COLORS) as [ListColor, (typeof LIST_COLORS)[ListColor]][]).map(([key, meta]) => (
              <label key={key} className="relative cursor-pointer">
                <input type="radio" name="color" value={key} checked={color === key} onChange={() => setColor(key)} className="peer sr-only" />
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 ring-offset-card peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                    meta.dot,
                    color === key && "ring-2 ring-foreground"
                  )}
                >
                  {color === key && <Check className="h-4 w-4 text-white" aria-hidden="true" />}
                </span>
                <span className="sr-only">{meta.label}</span>
              </label>
            ))}
          </div>
          {serverErrors.color && <p className="mt-2 text-sm text-destructive">{serverErrors.color}</p>}
        </fieldset>
      </form>
    </Dialog>
  );
}
