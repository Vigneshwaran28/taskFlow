"use client";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { SelectField } from "@/components/ui/SelectField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { useShareablePeople, useTransferNote } from "../hooks/useNotes";
import type { Note } from "../services/noteService";

/** Feature component: hand a note to someone else. The previous owner keeps edit access. */
export function TransferNoteDialog({ note, onClose }: { note: Note; onClose: () => void }) {
  const toast = useToast();
  const transfer = useTransferNote();
  const people = useShareablePeople();
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const options = (people.data ?? []).filter(person => person.id !== note.owner.id);

  function confirm() {
    if (!userId) {
      setError("Choose the new owner.");
      return;
    }
    const person = options.find(candidate => String(candidate.id) === userId);
    transfer.mutate(
      { id: note.id, userId: Number(userId) },
      {
        onSuccess: () => {
          toast.success("Ownership transferred", person ? `${person.name} now owns this note.` : undefined);
          onClose();
        },
        onError: err => toast.error("Couldn't transfer", err.message),
      }
    );
  }

  return (
    <ConfirmDialog
      open
      title="Transfer ownership"
      message={`The new owner controls sharing, archiving and deleting. ${note.owner.name} keeps edit access.`}
      confirmLabel="Transfer"
      tone="primary"
      pending={transfer.isPending}
      onConfirm={confirm}
      onCancel={onClose}
    >
      <FormAlert message={formErrorOf(transfer.error)} />
      <SelectField
        label="New owner"
        required
        value={userId}
        disabled={people.isPending}
        error={error ?? fieldErrorsOf(transfer.error).userId}
        onChange={event => {
          setUserId(event.target.value);
          setError(null);
        }}
        options={[{ value: "", label: people.isPending ? "Loading people…" : "Choose someone…" }, ...options.map(person => ({ value: String(person.id), label: person.jobTitle ? `${person.name} · ${person.jobTitle}` : person.name }))]}
      />
    </ConfirmDialog>
  );
}
