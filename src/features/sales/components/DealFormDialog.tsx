"use client";
import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { useCan, useCurrentUser } from "@/features/auth";
import { usePeople } from "@/features/people";
import { useCreateDeal, useCustomers, useDeleteDeal, useUpdateDeal } from "../hooks/useSales";
import type { Deal, DealInput, DealStage } from "../services/salesService";
import { DAY, moneyError, useFormErrors } from "../utils/formErrors";
import { DEAL_STAGES, toOptions } from "../utils/salesMeta";

interface FormValues {
  title: string;
  customerId: string;
  value: string;
  stage: DealStage;
  expectedClose: string;
  ownerId: string;
  notes: string;
}

/** Mirrors dealSchema in server/src/routes/sales.js. */
function validateDeal(values: FormValues) {
  const found: Record<string, string> = {};
  const title = values.title.trim();
  if (!title) found.title = "Title is required.";
  else if (title.length > 200) found.title = "Keep the title under 200 characters.";
  const valueError = moneyError(values.value, { label: "Value" });
  if (valueError) found.value = valueError;
  if (values.expectedClose && !DAY.test(values.expectedClose)) found.expectedClose = "Use a date like 2026-10-31.";
  if (values.notes.trim().length > 5000) found.notes = "Keep the notes under 5000 characters.";
  return found;
}

export interface DealFormDialogProps {
  deal?: Deal | null;
  defaultStage?: DealStage;
  onClose: () => void;
}

/** Feature component: create or edit a deal. Mount with a `key` to reset. */
export function DealFormDialog({ deal = null, defaultStage = "lead", onClose }: DealFormDialogProps) {
  const isEdit = Boolean(deal);
  const toast = useToast();
  const { data: user } = useCurrentUser();
  const { data: customers = [] } = useCustomers();
  const { data: people = [] } = usePeople();
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();
  const mutation = isEdit ? updateDeal : createDeal;
  const [confirming, setConfirming] = useState(false);
  const canEdit = useCan("sales.edit");

  const [values, setValues] = useState<FormValues>(() => ({
    title: deal?.title ?? "",
    customerId: deal?.customer ? String(deal.customer.id) : "",
    value: deal ? String(deal.value) : "",
    stage: deal?.stage ?? defaultStage,
    expectedClose: deal?.expectedClose ? deal.expectedClose.slice(0, 10) : "",
    // An existing deal keeps its owner (or lack of one); a new one defaults to the current user.
    ownerId: deal ? (deal.owner ? String(deal.owner.id) : "") : String(user?.id ?? ""),
    notes: deal?.notes ?? "",
  }));

  const errors = useFormErrors(fieldErrorsOf(mutation.error));
  const set = <K extends keyof FormValues>(name: K, value: FormValues[K]) => {
    setValues(current => ({ ...current, [name]: value }));
    errors.clear(name);
  };
  const mayDeleteAny = useCan("sales.delete");
  const canDelete = Boolean(deal) && ((user != null && deal?.owner?.id === user.id) || mayDeleteAny);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending || !canEdit) return;
    if (!errors.report(validateDeal(values))) return;
    const input: DealInput = {
      title: values.title.trim(),
      customerId: values.customerId ? Number(values.customerId) : null,
      value: values.value.trim() === "" ? 0 : Number(values.value),
      stage: values.stage,
      expectedClose: values.expectedClose || null,
      ownerId: values.ownerId ? Number(values.ownerId) : null,
      notes: values.notes.trim() || null,
    };
    const onSuccess = () => {
      toast.success(isEdit ? "Deal saved" : "Deal added");
      onClose();
    };
    if (deal) updateDeal.mutate({ id: deal.id, changes: input }, { onSuccess });
    else createDeal.mutate(input, { onSuccess });
  }

  function handleDelete() {
    if (!deal) return;
    deleteDeal.mutate(deal.id, {
      onSuccess: () => {
        toast.success("Deal deleted");
        onClose();
      },
      onError: error => {
        setConfirming(false);
        toast.error("Couldn't delete the deal", error.message);
      },
    });
  }

  return (
    <>
      <Dialog
        open={!confirming}
        onClose={onClose}
        title={isEdit ? (canEdit ? "Edit deal" : (deal?.title ?? "Deal")) : "New deal"}
        footer={
          <>
            {canDelete && (
              <Button variant="ghost" className="mr-auto text-destructive hover:bg-destructive/10" onClick={() => setConfirming(true)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              {canEdit ? "Cancel" : "Close"}
            </Button>
            {canEdit && (
              <Button type="submit" form="deal-form" loading={mutation.isPending}>
                {isEdit ? "Save deal" : "Add deal"}
              </Button>
            )}
          </>
        }
      >
        <form id="deal-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <FormAlert message={formErrorOf(mutation.error)} />
          <fieldset disabled={!canEdit} className="flex flex-col gap-4">
            <TextField
              label="Deal"
              id="deal-title"
              required
              autoFocus
              maxLength={200}
              placeholder="e.g. Northwind office fit-out"
              value={values.title}
              error={errors.errorOf("title")}
              onChange={event => set("title", event.target.value)}
            />
            <SelectField
              label="Customer"
              id="deal-customer"
              value={values.customerId}
              error={errors.errorOf("customerId")}
              options={[{ value: "", label: "No customer yet" }, ...customers.map(customer => ({ value: String(customer.id), label: customer.company ? `${customer.name} (${customer.company})` : customer.name }))]}
              onChange={event => set("customerId", event.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Value"
                id="deal-value"
                type="number"
                inputMode="decimal"
                min="0"
                max="1000000000000"
                step="0.01"
                value={values.value}
                error={errors.errorOf("value")}
                onChange={event => set("value", event.target.value)}
              />
              <SelectField label="Stage" id="deal-stage" value={values.stage} error={errors.errorOf("stage")} options={toOptions(DEAL_STAGES)} onChange={event => set("stage", event.target.value as DealStage)} />
              <TextField label="Expected close" id="deal-close" type="date" value={values.expectedClose} error={errors.errorOf("expectedClose")} onChange={event => set("expectedClose", event.target.value)} />
              <SelectField
                label="Owner"
                id="deal-owner"
                value={values.ownerId}
                error={errors.errorOf("ownerId")}
                options={[{ value: "", label: "Nobody" }, ...people.map(person => ({ value: String(person.id), label: person.name }))]}
                onChange={event => set("ownerId", event.target.value)}
              />
            </div>
            <TextAreaField label="Notes" id="deal-notes" rows={3} maxLength={5000} value={values.notes} error={errors.errorOf("notes")} onChange={event => set("notes", event.target.value)} />
          </fieldset>
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirming}
        title="Delete this deal?"
        message={`"${deal?.title ?? ""}" will be removed from the pipeline.`}
        pending={deleteDeal.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
