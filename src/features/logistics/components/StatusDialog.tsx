"use client";
// Moves a shipment to its next status: location, note, who received it (delivered), and when it happened.
import { useId, useState, type FormEvent } from "react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { useModuleSettings } from "@/features/auth";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { fromLocalInputValue } from "@/lib/dates";
import { useSetShipmentStatus } from "../hooks/useLogistics";
import type { ShipmentStatus } from "../services/logisticsService";
import { SHIPMENT_STATUSES, textOrNull } from "../utils/logisticsMeta";
import { compact as compactErrors, pastTimeError, without, type Errors } from "../utils/validateLogistics";

export interface StatusDialogProps {
  shipment: { id: number; number: string; status: ShipmentStatus };
  allowed: readonly ShipmentStatus[];
  /** Preselects a status (the big buttons on My deliveries) */
  initialStatus?: ShipmentStatus;
  /** Hides the time field for a quick update in the field */
  compact?: boolean;
  onClose: () => void;
}

export function StatusDialog({ shipment, allowed, initialStatus, compact = false, onClose }: StatusDialogProps) {
  const toast = useToast();
  const settings = useModuleSettings("logistics");
  const mutation = useSetShipmentStatus();
  const groupId = useId();
  const [status, setStatus] = useState<ShipmentStatus | "">(initialStatus ?? (allowed.length === 1 ? allowed[0] : ""));
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [localErrors, setLocalErrors] = useState<Errors>({});
  const [edited, setEdited] = useState<string[]>([]);
  const errors = { ...without(fieldErrorsOf(mutation.error), edited), ...localErrors };
  const touch = (field: string) => {
    setLocalErrors(current => without(current, [field]));
    setEdited(current => (current.includes(field) ? current : [...current, field]));
  };
  const choiceError = errors.status;
  const proofRequired = Boolean(settings.requireProofOfDelivery);
  const delivering = status === "delivered";

  function submit(event: FormEvent) {
    event.preventDefault();
    const found = compactErrors({
      status: status ? null : "Choose the new status.",
      receivedBy: delivering && proofRequired && !receivedBy.trim() ? "Enter the name of the person who received it." : null,
      occurredAt: compact ? null : pastTimeError(occurredAt),
    });
    setLocalErrors(found);
    if (!status || Object.keys(found).length) return;
    setEdited([]);
    mutation.mutate(
      {
        id: shipment.id,
        input: {
          status,
          location: textOrNull(location),
          note: textOrNull(note),
          receivedBy: delivering ? textOrNull(receivedBy) : null,
          occurredAt: fromLocalInputValue(occurredAt),
        },
      },
      {
        onSuccess: () => {
          toast.success(`${shipment.number} marked ${SHIPMENT_STATUSES[status].label.toLowerCase()}`);
          onClose();
        },
      }
    );
  }

  const formId = `${groupId}-form`;
  const title = initialStatus === "delivered" && allowed.length <= 1 ? "Delivered" : "Update status";

  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      description={`${shipment.number} · now ${SHIPMENT_STATUSES[shipment.status].label.toLowerCase()}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={mutation.isPending} disabled={!allowed.length}>
            Save
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <FormAlert message={formErrorOf(mutation.error)} />
        {allowed.length === 0 ? (
          <p className="text-sm text-muted-foreground">There is no next status you can set for this shipment.</p>
        ) : (
          <fieldset aria-describedby={choiceError ? `${groupId}-error` : undefined} aria-invalid={Boolean(choiceError)}>
            <legend className="mb-2 text-sm font-medium">
              New status
              <span className="ml-0.5 text-destructive" aria-hidden="true">
                *
              </span>
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {allowed.map(option => (
                <label
                  key={option}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    status === option ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted"
                  )}
                >
                  <input
                    type="radio"
                    name={`${groupId}-status`}
                    value={option}
                    checked={status === option}
                    onChange={() => {
                      setStatus(option);
                      touch("status");
                      touch("receivedBy");
                    }}
                    className="accent-primary"
                  />
                  {SHIPMENT_STATUSES[option].label}
                </label>
              ))}
            </div>
            {choiceError && (
              <p id={`${groupId}-error`} className="mt-1.5 text-sm text-destructive">
                {choiceError}
              </p>
            )}
          </fieldset>
        )}
        {delivering && (
          <TextField
            label="Received by"
            value={receivedBy}
            onChange={event => {
              setReceivedBy(event.target.value);
              touch("receivedBy");
            }}
            required={proofRequired}
            maxLength={120}
            autoComplete="off"
            hint={proofRequired ? "Proof of delivery is required: who signed for it?" : "Optional: who signed for it."}
            error={errors.receivedBy}
          />
        )}
        <TextField label="Location" value={location} onChange={event => setLocation(event.target.value)} maxLength={120} placeholder="City or hub" error={errors.location} />
        <TextAreaField
          label="Note"
          value={note}
          onChange={event => setNote(event.target.value)}
          maxLength={300}
          rows={2}
          hint="Shown on the public tracking page."
          error={errors.note}
        />
        {!compact && (
          <TextField
            label="When it happened"
            type="datetime-local"
            value={occurredAt}
            onChange={event => {
              setOccurredAt(event.target.value);
              touch("occurredAt");
            }}
            hint="Leave empty for now."
            error={errors.occurredAt}
          />
        )}
      </form>
    </Dialog>
  );
}
