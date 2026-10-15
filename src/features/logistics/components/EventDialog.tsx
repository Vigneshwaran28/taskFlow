"use client";
// Adds a tracking note without changing the status (e.g. "Held at hub for customs").
import { useId, useState, type FormEvent } from "react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/dates";
import { useAddShipmentEvent } from "../hooks/useLogistics";
import { textOrNull } from "../utils/logisticsMeta";
import { compact, pastTimeError, without, type Errors } from "../utils/validateLogistics";

export function EventDialog({ shipment, onClose }: { shipment: { id: number; number: string }; onClose: () => void }) {
  const toast = useToast();
  const mutation = useAddShipmentEvent();
  const formId = useId();
  const [note, setNote] = useState("");
  const [location, setLocation] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [localErrors, setLocalErrors] = useState<Errors>({});
  const [edited, setEdited] = useState<string[]>([]);
  const errors = { ...without(fieldErrorsOf(mutation.error), edited), ...localErrors };
  const touch = (field: string) => {
    setLocalErrors(current => without(current, [field]));
    setEdited(current => (current.includes(field) ? current : [...current, field]));
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    const found = compact({ note: note.trim() ? null : "Write a note.", occurredAt: pastTimeError(occurredAt) });
    setLocalErrors(found);
    if (Object.keys(found).length) return;
    setEdited([]);
    mutation.mutate(
      { id: shipment.id, input: { note: note.trim(), location: textOrNull(location), occurredAt: fromLocalInputValue(occurredAt) } },
      {
        onSuccess: () => {
          toast.success("Tracking note added");
          onClose();
        },
      }
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Add tracking note"
      description={shipment.number}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={mutation.isPending}>
            Add note
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <FormAlert message={formErrorOf(mutation.error)} />
        <TextAreaField
          label="Note"
          required
          value={note}
          onChange={event => {
            setNote(event.target.value);
            touch("note");
          }}
          maxLength={300}
          rows={3}
          hint="Shown on the public tracking page."
          error={errors.note}
        />
        <TextField
          label="Location"
          value={location}
          onChange={event => {
            setLocation(event.target.value);
            touch("location");
          }}
          maxLength={120}
          error={errors.location}
        />
        <TextField
          label="When it happened"
          type="datetime-local"
          value={occurredAt}
          max={toLocalInputValue(new Date().toISOString())}
          onChange={event => {
            setOccurredAt(event.target.value);
            touch("occurredAt");
          }}
          hint="Leave empty for now."
          error={errors.occurredAt}
        />
      </form>
    </Dialog>
  );
}
