"use client";
import { useId, useState, type FormEvent } from "react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { useModuleSettings } from "@/features/auth";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { formatMoney, localDay } from "@/lib/format";
import { useRecordPayment, useVoidDocument } from "../hooks/useBilling";
import type { BillingDocumentDetail } from "../services/billingService";
import { paymentMethodLabel, round2 } from "../utils/billingMeta";
import { hasAtMostTwoDecimals, useFormErrors } from "../utils/formErrors";

const FALLBACK_METHODS = ["cash", "bank_transfer", "card", "upi", "cheque", "other"];

/** Feature component: record a payment against an issued invoice. The amount defaults to the balance. */
export function RecordPaymentDialog({ doc, onClose }: { doc: BillingDocumentDetail; onClose: () => void }) {
  const toast = useToast();
  const baseId = useId();
  const settings = useModuleSettings("billing");
  const methods: string[] = settings.paymentMethods?.length ? settings.paymentMethods : FALLBACK_METHODS;
  const recordPayment = useRecordPayment();
  const today = localDay();

  const [amount, setAmount] = useState(doc.balance.toFixed(2));
  const [method, setMethod] = useState(methods[0] ?? "");
  const [paidOn, setPaidOn] = useState(today);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const errors = useFormErrors(fieldErrorsOf(recordPayment.error));
  const error = errors.errorOf;
  /** Sets a field and clears its error. */
  const edit = (name: string, setter: (value: string) => void) => (value: string) => {
    setter(value);
    errors.clear(name);
  };

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (recordPayment.isPending) return;
    // Mirrors paymentSchema in server/src/routes/billing.js.
    const value = round2(Number(amount));
    const found: Record<string, string> = {};
    if (amount.trim() === "" || Number.isNaN(Number(amount)) || !(value > 0)) found.amount = "Enter an amount above zero.";
    else if (!hasAtMostTwoDecimals(amount)) found.amount = "Use at most 2 decimal places.";
    else if (value > doc.balance) found.amount = `Only ${formatMoney(doc.balance)} is outstanding.`;
    if (!method) found.method = "Pick a payment method.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) found.paidOn = "Pick the payment date.";
    else if (paidOn > today) found.paidOn = "The payment date can't be in the future.";
    if (reference.trim().length > 120) found.reference = "Keep the reference under 120 characters.";
    if (notes.trim().length > 300) found.notes = "Keep the notes under 300 characters.";
    if (!errors.report(found)) return;

    recordPayment.mutate(
      { id: doc.id, payment: { amount: value, method, paidOn, reference: reference.trim() || null, notes: notes.trim() || null } },
      {
        onSuccess: saved => {
          toast.success(saved.status === "paid" ? `${saved.number} is paid in full` : `Payment of ${formatMoney(value)} recorded`, saved.balance > 0 ? `${formatMoney(saved.balance)} still due.` : undefined);
          onClose();
        },
      }
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title={`Record payment · ${doc.number}`}
      description={`Balance due ${formatMoney(doc.balance)} of ${formatMoney(doc.total)}.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={`${baseId}-form`} loading={recordPayment.isPending}>
            Record payment
          </Button>
        </>
      }
    >
      <form id={`${baseId}-form`} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formErrorOf(recordPayment.error)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            max={doc.balance}
            step="0.01"
            required
            autoFocus
            value={amount}
            error={error("amount")}
            onChange={event => edit("amount", setAmount)(event.target.value)}
          />
          <SelectField
            label="Method"
            required
            value={method}
            error={error("method")}
            options={methods.map(value => ({ value, label: paymentMethodLabel(value) }))}
            onChange={event => edit("method", setMethod)(event.target.value)}
          />
          <TextField label="Paid on" type="date" required max={today} value={paidOn} error={error("paidOn")} onChange={event => edit("paidOn", setPaidOn)(event.target.value)} />
          <TextField label="Reference" placeholder="Transaction or cheque no." maxLength={120} value={reference} error={error("reference")} onChange={event => edit("reference", setReference)(event.target.value)} />
        </div>
        <TextAreaField label="Notes" rows={2} maxLength={300} value={notes} error={error("notes")} onChange={event => edit("notes", setNotes)(event.target.value)} />
      </form>
    </Dialog>
  );
}

/** Feature component: void an invoice, with a required reason (kept in the audit log). */
export function VoidDialog({ doc, onClose }: { doc: BillingDocumentDetail; onClose: () => void }) {
  const toast = useToast();
  const baseId = useId();
  const voidDocument = useVoidDocument();
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (voidDocument.isPending) return;
    if (!reason.trim()) {
      setReasonError("Say why the invoice is being voided.");
      return;
    }
    if (reason.trim().length > 300) {
      setReasonError("Keep the reason under 300 characters.");
      return;
    }
    voidDocument.mutate(
      { id: doc.id, reason: reason.trim() },
      {
        onSuccess: saved => {
          toast.success(`${saved.number} voided`);
          onClose();
        },
      }
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={`Void ${doc.number}?`}
      description="A void invoice keeps its number but no longer counts as owed. This can't be undone."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" form={`${baseId}-form`} loading={voidDocument.isPending}>
            Void invoice
          </Button>
        </>
      }
    >
      <form id={`${baseId}-form`} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formErrorOf(voidDocument.error)} />
        <TextAreaField
          label="Reason"
          required
          autoFocus
          rows={3}
          maxLength={300}
          value={reason}
          error={reasonError || fieldErrorsOf(voidDocument.error).reason}
          onChange={event => {
            setReason(event.target.value);
            setReasonError(null);
            if (voidDocument.error) voidDocument.reset();
          }}
        />
      </form>
    </Dialog>
  );
}
