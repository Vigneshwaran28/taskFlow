"use client";
import { useState, type FormEvent } from "react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { formatInteger } from "@/lib/format";
import { useAddStockMovement } from "../hooks/useInventory";
import type { Product } from "../services/inventoryService";
import { MOVEMENT_TYPES } from "../utils/stockMeta";

type FormType = "in" | "out" | "adjust";
type MovementErrors = Partial<Record<"quantity" | "reason" | "reference", string>>;
const TYPES: readonly FormType[] = ["in", "out", "adjust"];
const QUANTITY_LABEL: Record<FormType, string> = { in: "Quantity received", out: "Quantity removed", adjust: "Counted quantity on hand" };
const REASON_HINT: Record<FormType, string> = { in: "e.g. Delivery from supplier", out: "e.g. Issued to office, damaged", adjust: "e.g. Monthly stock count" };
const MAX_QUANTITY = 1e9;

/** Mirrors the server's movement schema plus the "can't go below zero" and "no-op count" rules. */
function validateMovement(type: FormType, quantity: string, reason: string, reference: string, onHand: number, unit: string): MovementErrors {
  const errors: MovementErrors = {};
  const amount = Number(quantity);
  if (quantity.trim() === "" || Number.isNaN(amount)) errors.quantity = type === "adjust" ? "Enter the counted quantity (0 or more)." : "Enter a quantity above zero.";
  else if (!Number.isInteger(amount)) errors.quantity = "Enter a whole number.";
  else if (amount < 0) errors.quantity = "Can't be negative.";
  else if (amount > MAX_QUANTITY) errors.quantity = "That quantity is too large.";
  else if (type !== "adjust" && amount === 0) errors.quantity = "Enter a quantity above zero.";
  else if (type === "out" && amount > onHand) errors.quantity = `Only ${formatInteger(onHand)} ${unit} on hand.`;
  else if (type === "adjust" && amount === onHand) errors.quantity = "That's already the quantity on hand.";
  if (reason.trim().length > 200) errors.reason = "Keep the reason under 200 characters.";
  if (reference.trim().length > 80) errors.reference = "Keep the reference under 80 characters.";
  return errors;
}

/** Feature component: record stock in, stock out, or a count adjustment for one product. */
export function StockMovementForm({ product }: { product: Product }) {
  const toast = useToast();
  const addMovement = useAddStockMovement();
  const [type, setType] = useState<FormType>("in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [clientErrors, setClientErrors] = useState<MovementErrors>({});

  const errors: MovementErrors = { ...fieldErrorsOf(addMovement.error), ...clientErrors };
  const amount = Number(quantity);
  const preview = quantity === "" || Number.isNaN(amount) ? null : type === "in" ? product.quantity + amount : type === "out" ? product.quantity - amount : amount;

  function clearError(name: keyof MovementErrors) {
    setClientErrors(current => ({ ...current, [name]: undefined }));
    if (addMovement.error) addMovement.reset();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (addMovement.isPending) return;
    const next = validateMovement(type, quantity, reason, reference, product.quantity, product.unit);
    setClientErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(next.quantity ? "movement-quantity" : next.reason ? "movement-reason" : "movement-reference")?.focus();
      return;
    }
    addMovement.mutate(
      { id: product.id, type, quantity: amount, reason: reason.trim() || null, reference: reference.trim() || null },
      {
        onSuccess: updated => {
          toast.success(MOVEMENT_TYPES[type].label + " recorded", `${formatInteger(updated.quantity)} ${updated.unit} on hand now.`);
          setQuantity("");
          setReason("");
          setReference("");
          setClientErrors({});
        },
      }
    );
  }

  return (
    <form id="stock-movement-form" onSubmit={handleSubmit} noValidate aria-labelledby="stock-movement-heading" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <h2 id="stock-movement-heading" className="text-sm font-semibold">
        Record a stock movement
      </h2>
      <FormAlert message={formErrorOf(addMovement.error)} />
      <div role="radiogroup" aria-label="Movement type" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {TYPES.map(key => {
          const meta = MOVEMENT_TYPES[key];
          const Icon = meta.icon;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={type === key}
              onClick={() => {
                setType(key);
                setClientErrors({});
                addMovement.reset();
                document.getElementById("movement-quantity")?.focus();
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                type === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {key === "adjust" ? "Count" : meta.label}
            </button>
          );
        })}
      </div>
      <TextField
        label={QUANTITY_LABEL[type]}
        id="movement-quantity"
        type="number"
        inputMode="numeric"
        required
        min={type === "adjust" ? "0" : "1"}
        max={type === "out" ? String(Math.max(0, product.quantity)) : String(MAX_QUANTITY)}
        step="1"
        value={quantity}
        error={errors.quantity}
        hint={preview != null ? `On hand after this: ${formatInteger(preview)} ${product.unit}` : `On hand now: ${formatInteger(product.quantity)} ${product.unit}`}
        onChange={event => {
          setQuantity(event.target.value);
          clearError("quantity");
        }}
      />
      <TextField
        label="Reason"
        id="movement-reason"
        maxLength={200}
        placeholder={REASON_HINT[type]}
        value={reason}
        error={errors.reason}
        onChange={event => {
          setReason(event.target.value);
          clearError("reason");
        }}
      />
      <TextField
        label="Reference (optional)"
        id="movement-reference"
        maxLength={80}
        placeholder="e.g. PO-1042, invoice number"
        value={reference}
        error={errors.reference}
        onChange={event => {
          setReference(event.target.value);
          clearError("reference");
        }}
      />
      <Button type="submit" loading={addMovement.isPending}>
        Record {type === "adjust" ? "count" : MOVEMENT_TYPES[type].label.toLowerCase()}
      </Button>
    </form>
  );
}
