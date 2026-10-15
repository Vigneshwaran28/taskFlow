"use client";
import { useId, useState, type FormEvent } from "react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { useCan, useModuleSettings } from "@/features/auth";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { shiftDay } from "@/lib/dates";
import { formatMoney, localDay } from "@/lib/format";
import { useBillingProducts, useCreateDocument, useUpdateDocument } from "../hooks/useBilling";
import type { BillingDocumentDetail, BillToInput, Customer, DocumentInput, DocumentKind } from "../services/billingService";
import { KIND_META, priceLines, toNumber } from "../utils/billingMeta";
import { contactErrors, hasAtMostTwoDecimals, MAX_MONEY, useFormErrors } from "../utils/formErrors";
import { CustomerPicker } from "./CustomerPicker";
import { blankLine, LineItemsEditor, lineNumbers, type LineDraft } from "./LineItemsEditor";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

type BillToMode = "customer" | "oneoff";
const EMPTY_BILL_TO = { name: "", email: "", phone: "", address: "", taxId: "" };

export interface DocumentEditorDialogProps {
  kind: DocumentKind;
  /** A draft to edit; omit to create */
  doc?: BillingDocumentDetail | null;
  onClose: () => void;
  onSaved?: (doc: BillingDocumentDetail) => void;
}

/** Feature component: create an invoice or quote, or edit a draft. Totals are computed exactly as the server does. */
export function DocumentEditorDialog({ kind: kindProp, doc = null, onClose, onSaved }: DocumentEditorDialogProps) {
  const kind = doc?.kind ?? kindProp;
  const meta = KIND_META[kind];
  const isEdit = Boolean(doc);
  const toast = useToast();
  const canCreateCustomer = useCan("billing.edit");
  const settings = useModuleSettings("billing");
  const defaultTaxRate = settings.defaultTaxRate ?? 0;
  const taxLabel = settings.taxLabel || "Tax";
  const termDays = kind === "quote" ? (settings.quoteValidityDays ?? 30) : (settings.paymentTermsDays ?? 15);
  const { data: products = [] } = useBillingProducts();
  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();
  const mutation = isEdit ? updateDocument : createDocument;
  const baseId = useId();

  const [mode, setMode] = useState<BillToMode>(doc && !doc.customer ? "oneoff" : "customer");
  const [customer, setCustomer] = useState<Customer | null>(doc?.customer ?? null);
  const [customerTaxId, setCustomerTaxId] = useState(doc?.customer ? (doc.billTo.taxId ?? "") : "");
  const [billTo, setBillTo] = useState(() =>
    doc && !doc.customer
      ? { name: doc.billTo.name, email: doc.billTo.email ?? "", phone: doc.billTo.phone ?? "", address: doc.billTo.address ?? "", taxId: doc.billTo.taxId ?? "" }
      : EMPTY_BILL_TO
  );
  const [issueDate, setIssueDate] = useState(() => doc?.issueDate ?? localDay());
  // Until the due date is changed by hand it follows the issue date (+ payment terms / quote validity).
  const [dueDate, setDueDate] = useState<string | null>(doc ? (doc.dueDate ?? "") : null);
  const [notes, setNotes] = useState(doc ? (doc.notes ?? "") : (settings.defaultNotes ?? ""));
  const [terms, setTerms] = useState(doc ? (doc.terms ?? "") : (settings.defaultTerms ?? ""));
  const [lines, setLines] = useState<LineDraft[]>(() =>
    doc?.items.length
      ? doc.items.map(item => ({
          key: `line-${item.id}`,
          productId: item.productId ? String(item.productId) : "",
          description: item.description,
          quantity: String(item.quantity),
          unit: item.unit ?? "",
          unitPrice: String(item.unitPrice),
          discountPct: String(item.discountPct),
          taxRate: String(item.taxRate),
        }))
      : [blankLine(defaultTaxRate)]
  );
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});

  const serverErrors = fieldErrorsOf(mutation.error);
  const errors = useFormErrors(serverErrors);
  const effectiveDue = dueDate ?? (DAY.test(issueDate) ? shiftDay(issueDate, termDays) : "");
  const productById = new Map(products.map(product => [String(product.id), product]));
  const filledLines = lines.filter(line => line.productId || line.description.trim());
  const totals = priceLines(filledLines.map(line => lineNumbers(line, productById.get(line.productId), defaultTaxRate)));

  const fieldError = errors.errorOf;
  const clearError = errors.clear;

  function changeLines(next: LineDraft[]) {
    setLines(next);
    setLineErrors({});
    clearError("items");
  }

  /** Mirrors documentSchema / lineSchema / billToSchema in server/src/routes/billing.js. */
  function validate() {
    const found: Record<string, string> = {};
    const foundLines: Record<string, string> = {};
    if (mode === "customer" && !customer) found.billTo = "Choose a customer, or bill a one-off name.";
    if (mode === "customer" && customerTaxId.trim().length > 40) found.customerTaxId = "Keep the tax ID under 40 characters.";
    if (mode === "oneoff") {
      const contact = contactErrors(billTo, { nameMessage: "Enter who the document is for." });
      if (contact.name) found.billToName = contact.name;
      if (contact.email) found.billToEmail = contact.email;
      if (contact.phone) found.billToPhone = contact.phone;
      if (billTo.taxId.trim().length > 40) found.billToTaxId = "Keep the tax ID under 40 characters.";
      if (billTo.address.trim().length > 500) found.billToAddress = "Keep the address under 500 characters.";
    }
    if (!DAY.test(issueDate)) found.issueDate = "Pick the issue date.";
    if (effectiveDue && !DAY.test(effectiveDue)) found.dueDate = `Pick a valid ${meta.dueLabel.toLowerCase()}.`;
    else if (effectiveDue && DAY.test(issueDate) && effectiveDue < issueDate) found.dueDate = `${meta.dueLabel} can't be before the issue date.`;
    if (!filledLines.length) found.items = "Add at least one line with a description or product.";
    else if (filledLines.length > 200) found.items = "At most 200 lines.";
    for (const line of filledLines) {
      const quantity = Number(line.quantity);
      const priceText = line.unitPrice.trim();
      const price = priceText === "" ? 0 : Number(priceText);
      const discount = toNumber(line.discountPct);
      const tax = toNumber(line.taxRate, defaultTaxRate);
      if (line.quantity.trim() === "" || Number.isNaN(quantity) || !(quantity > 0)) foundLines[line.key] = "Enter a quantity above zero.";
      else if (quantity > 1e7) foundLines[line.key] = "The quantity is too large.";
      else if (Number.isNaN(price) || price < 0) foundLines[line.key] = "The unit price can't be negative.";
      else if (price > MAX_MONEY) foundLines[line.key] = "The unit price is too large.";
      else if (!hasAtMostTwoDecimals(priceText)) foundLines[line.key] = "Use at most 2 decimal places for the price.";
      else if (Number.isNaN(Number(line.discountPct)) || !(discount >= 0 && discount <= 100)) foundLines[line.key] = "Use a discount from 0 to 100%.";
      else if (Number.isNaN(Number(line.taxRate)) || !(tax >= 0 && tax <= 100)) foundLines[line.key] = `Use a ${taxLabel} rate from 0 to 100%.`;
    }
    if (Object.keys(foundLines).length) found.items = "Fix the highlighted lines.";
    setLineErrors(foundLines);
    return errors.report(found);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending || !validate()) return;

    let billToInput: BillToInput | null = null;
    if (mode === "oneoff") {
      billToInput = {
        name: billTo.name.trim(),
        email: billTo.email.trim() || null,
        phone: billTo.phone.trim() || null,
        address: billTo.address.trim() || null,
        taxId: billTo.taxId.trim() || null,
      };
    } else if (customer && customerTaxId.trim()) {
      // Only the tax ID is added; everything else comes from the customer record.
      billToInput = { name: customer.name, taxId: customerTaxId.trim() };
    }

    const input: DocumentInput = {
      customerId: mode === "customer" ? (customer?.id ?? null) : null,
      billTo: billToInput,
      issueDate,
      dueDate: effectiveDue || null,
      notes: notes.trim() || null,
      terms: terms.trim() || null,
      items: filledLines.map(line => ({
        productId: line.productId ? Number(line.productId) : null,
        description: line.description.trim(),
        quantity: Number(line.quantity),
        unit: line.unit.trim() || null,
        unitPrice: line.unitPrice.trim() === "" ? (line.productId ? undefined : 0) : Number(line.unitPrice),
        discountPct: toNumber(line.discountPct),
        taxRate: toNumber(line.taxRate, defaultTaxRate),
      })),
    };

    const onSuccess = (saved: BillingDocumentDetail) => {
      toast.success(isEdit ? `${saved.number} saved` : `${saved.number} created as a draft`, isEdit ? undefined : kind === "quote" ? "Send it when it's ready." : "Issue it when it's ready.");
      onSaved?.(saved);
      onClose();
    };
    if (doc) updateDocument.mutate({ id: doc.id, changes: input }, { onSuccess });
    else createDocument.mutate({ ...input, kind }, { onSuccess });
  }

  const billToError = fieldError("billTo") || fieldError("customerId");
  const itemsError = fieldError("items");

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title={isEdit ? `Edit ${doc?.number}` : `New ${meta.label.toLowerCase()}`}
      description={isEdit ? "Only drafts can be edited." : `Saved as a draft. The number is assigned now; ${kind === "quote" ? "send it" : "issue it"} when it's ready.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={`${baseId}-form`} loading={mutation.isPending}>
            {isEdit ? "Save draft" : "Create draft"}
          </Button>
        </>
      }
    >
      <form id={`${baseId}-form`} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <FormAlert message={formErrorOf(mutation.error)} />

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-sm font-semibold">Bill to</legend>
          <div role="radiogroup" aria-label="Who to bill" className="inline-flex w-fit gap-1 rounded-lg bg-muted p-1">
            {(
              [
                ["customer", "Customer"],
                ["oneoff", "One-off"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => {
                  setMode(value);
                  errors.report({});
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  mode === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === "customer" ? (
            <>
              <CustomerPicker
                value={customer}
                onChange={next => {
                  setCustomer(next);
                  clearError("billTo", "customerId");
                }}
                canCreate={canCreateCustomer}
                error={billToError}
              />
              {customer && (
                <TextField
                  label="Customer tax ID"
                  hint="Optional, printed on the document."
                  className="sm:max-w-xs"
                  maxLength={40}
                  value={customerTaxId}
                  error={fieldError("customerTaxId") || fieldError("billTo")}
                  onChange={event => {
                    setCustomerTaxId(event.target.value);
                    clearError("customerTaxId", "billTo");
                  }}
                />
              )}
            </>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Name"
                required
                maxLength={160}
                value={billTo.name}
                error={fieldError("billToName") || billToError}
                onChange={event => {
                  setBillTo(current => ({ ...current, name: event.target.value }));
                  clearError("billToName", "billTo");
                }}
              />
              <TextField
                label="Email"
                type="email"
                maxLength={160}
                value={billTo.email}
                error={fieldError("billToEmail")}
                onChange={event => {
                  setBillTo(current => ({ ...current, email: event.target.value }));
                  clearError("billToEmail", "billTo");
                }}
              />
              <TextField
                label="Phone"
                type="tel"
                maxLength={40}
                value={billTo.phone}
                error={fieldError("billToPhone")}
                onChange={event => {
                  setBillTo(current => ({ ...current, phone: event.target.value }));
                  clearError("billToPhone", "billTo");
                }}
              />
              <TextField
                label="Tax ID"
                maxLength={40}
                value={billTo.taxId}
                error={fieldError("billToTaxId")}
                onChange={event => {
                  setBillTo(current => ({ ...current, taxId: event.target.value }));
                  clearError("billToTaxId", "billTo");
                }}
              />
              <TextAreaField
                label="Address"
                rows={2}
                maxLength={500}
                className="sm:col-span-2"
                value={billTo.address}
                error={fieldError("billToAddress")}
                onChange={event => {
                  setBillTo(current => ({ ...current, address: event.target.value }));
                  clearError("billToAddress", "billTo");
                }}
              />
            </div>
          )}
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Issue date"
            type="date"
            required
            value={issueDate}
            error={fieldError("issueDate")}
            onChange={event => {
              setIssueDate(event.target.value);
              clearError("issueDate");
              clearError("dueDate");
            }}
          />
          <TextField
            label={meta.dueLabel}
            type="date"
            value={effectiveDue}
            min={DAY.test(issueDate) ? issueDate : undefined}
            hint={dueDate === null ? `${termDays} days after the issue date (${kind === "quote" ? "quote validity" : "payment terms"}).` : undefined}
            error={fieldError("dueDate")}
            onChange={event => {
              setDueDate(event.target.value);
              clearError("dueDate");
            }}
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">Line items</legend>
          {itemsError && (
            <p role="alert" className="text-sm text-destructive">
              {itemsError}
            </p>
          )}
          <LineItemsEditor lines={lines} products={products} defaultTaxRate={defaultTaxRate} taxLabel={taxLabel} lineErrors={lineErrors} onChange={changeLines} />
          <dl className="ml-auto mt-2 grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm" aria-live="polite">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="text-right tabular-nums">{formatMoney(totals.subtotal)}</dd>
            {totals.discountTotal > 0 && (
              <>
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="text-right tabular-nums">−{formatMoney(totals.discountTotal)}</dd>
              </>
            )}
            <dt className="text-muted-foreground">{taxLabel}</dt>
            <dd className="text-right tabular-nums">{formatMoney(totals.taxTotal)}</dd>
            <dt className="border-t pt-1.5 font-semibold">Total</dt>
            <dd className="border-t pt-1.5 text-right text-lg font-semibold tabular-nums">{formatMoney(totals.total)}</dd>
          </dl>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextAreaField
            label="Notes"
            rows={3}
            maxLength={5000}
            value={notes}
            error={fieldError("notes")}
            onChange={event => {
              setNotes(event.target.value);
              clearError("notes");
            }}
          />
          <TextAreaField
            label="Terms"
            rows={3}
            maxLength={5000}
            value={terms}
            error={fieldError("terms")}
            onChange={event => {
              setTerms(event.target.value);
              clearError("terms");
            }}
          />
        </div>
      </form>
    </Dialog>
  );
}
