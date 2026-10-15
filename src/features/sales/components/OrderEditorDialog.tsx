"use client";
import { useId, useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { formatInteger, formatMoney } from "@/lib/format";
import { useHasFeature } from "@/features/auth";
import { useProducts, type Product } from "@/features/inventory";
import { useCreateOrder, useCustomers, useUpdateOrder } from "../hooks/useSales";
import type { Order, OrderInput } from "../services/salesService";
import { moneyError } from "../utils/formErrors";

interface Line {
  key: number;
  productId: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

let nextLineKey = 1;
const blankLine = (): Line => ({ key: nextLineKey++, productId: "", description: "", quantity: "1", unitPrice: "" });

const inputClass = "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface OrderEditorDialogProps {
  order?: Order | null;
  /** Starting values for a new order (e.g. from a won deal) */
  prefill?: { customerId?: number | null; notes?: string; lines?: { description: string; quantity: number; unitPrice: number }[] };
  onClose: () => void;
  onSaved?: (order: Order) => void;
}

/** Feature component: create a draft order or edit one. Lines can be inventory products or free text. */
export function OrderEditorDialog({ order = null, prefill, onClose, onSaved }: OrderEditorDialogProps) {
  const isEdit = Boolean(order);
  const toast = useToast();
  const hasInventory = useHasFeature("inventory");
  const { data: customers = [] } = useCustomers();
  const { data: productPage } = useProducts({ status: "active", sort: "name", pageSize: 200 }, { enabled: hasInventory });
  const products: Product[] = productPage?.items ?? [];
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const mutation = isEdit ? updateOrder : createOrder;
  const baseId = useId();

  const [customerId, setCustomerId] = useState(order?.customer ? String(order.customer.id) : prefill?.customerId ? String(prefill.customerId) : "");
  const [notes, setNotes] = useState(order?.notes ?? prefill?.notes ?? "");
  const [lines, setLines] = useState<Line[]>(() =>
    order?.items?.length
      ? order.items.map(item => ({ key: nextLineKey++, productId: item.productId ? String(item.productId) : "", description: item.description, quantity: String(item.quantity), unitPrice: String(item.unitPrice) }))
      : prefill?.lines?.length
        ? prefill.lines.map(line => ({ ...blankLine(), description: line.description, quantity: String(line.quantity), unitPrice: String(line.unitPrice) }))
        : [blankLine()]
  );
  const [lineError, setLineError] = useState<string | null>(null);

  const serverErrors = fieldErrorsOf(mutation.error);
  const formError = formErrorOf(mutation.error) ?? serverErrors.items ?? null;
  const productById = new Map(products.map(product => [String(product.id), product]));
  const lineTotal = (line: Line) => (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
  const total = lines.reduce((sum, line) => sum + lineTotal(line), 0);

  /** Editing anything clears the previous problem; the next submit checks again. */
  function clearErrors() {
    setLineError(null);
    if (mutation.error) mutation.reset();
  }

  function update(key: number, changes: Partial<Line>) {
    setLines(current => current.map(line => (line.key === key ? { ...line, ...changes } : line)));
    clearErrors();
  }

  function pickProduct(key: number, productId: string) {
    const product = productById.get(productId);
    update(key, product ? { productId, description: product.name, unitPrice: String(product.salePrice) } : { productId: "" });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const filled = lines.filter(line => line.productId || line.description.trim());
    if (!filled.length) {
      setLineError("Add at least one line with a product or description.");
      return;
    }
    if (filled.length > 200) {
      setLineError("An order can have at most 200 lines.");
      return;
    }
    // Mirrors itemSchema in server/src/routes/sales.js: whole quantity 1..10,000,000, price >= 0 with 2 decimals.
    for (const line of filled) {
      const n = lines.indexOf(line) + 1;
      const quantity = Number(line.quantity);
      if (line.quantity.trim() === "" || !Number.isInteger(quantity) || quantity < 1 || quantity > 1e7) {
        setLineError(`Line ${n}: use a whole quantity from 1 to 10,000,000.`);
        return;
      }
      const priceError = moneyError(line.unitPrice, { label: "Price" });
      if (priceError) {
        setLineError(`Line ${n} price: ${priceError}`);
        return;
      }
    }
    if (notes.trim().length > 2000) {
      setLineError("Keep the notes under 2000 characters.");
      return;
    }

    const input: OrderInput = {
      customerId: customerId ? Number(customerId) : null,
      notes: notes.trim() || null,
      items: filled.map(line => ({
        productId: line.productId ? Number(line.productId) : null,
        description: line.description.trim(),
        quantity: Number(line.quantity),
        unitPrice: line.unitPrice === "" ? undefined : Number(line.unitPrice),
      })),
    };
    const onSuccess = (saved: Order) => {
      toast.success(isEdit ? `${saved.key} saved` : `${saved.key} created as a draft`, isEdit ? undefined : "Confirm it when the customer agrees.");
      onSaved?.(saved);
      onClose();
    };
    if (order) updateOrder.mutate({ id: order.id, changes: input }, { onSuccess });
    else createOrder.mutate(input, { onSuccess });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={order ? `Edit ${order.key}` : "New sales order"}
      description={hasInventory ? "Product lines take stock out of inventory when the order is confirmed." : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="order-form" loading={mutation.isPending}>
            {isEdit ? "Save draft" : "Create draft"}
          </Button>
        </>
      }
    >
      <form id="order-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={lineError ?? formError} />
        <SelectField
          label="Customer"
          id="order-customer"
          value={customerId}
          error={serverErrors.customerId}
          options={[{ value: "", label: "Walk-in / no customer" }, ...customers.map(customer => ({ value: String(customer.id), label: customer.company ? `${customer.name} (${customer.company})` : customer.name }))]}
          onChange={event => {
            setCustomerId(event.target.value);
            clearErrors();
          }}
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Lines</legend>
          <ol className="flex flex-col gap-2">
            {lines.map((line, index) => {
              const product = productById.get(line.productId);
              const short = product && Number(line.quantity) > product.quantity;
              return (
                <li key={line.key} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_6rem_2rem] sm:items-start">
                  <div className="flex min-w-0 flex-col gap-2">
                    {hasInventory && (
                      <>
                        <label htmlFor={`${baseId}-p${line.key}`} className="sr-only">
                          Line {index + 1} product
                        </label>
                        <select id={`${baseId}-p${line.key}`} value={line.productId} onChange={event => pickProduct(line.key, event.target.value)} className={inputClass}>
                          <option value="">Not a stocked product</option>
                          {products.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name} · {item.sku} ({formatInteger(item.quantity)} {item.unit} on hand)
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                    <label htmlFor={`${baseId}-d${line.key}`} className="sr-only">
                      Line {index + 1} description
                    </label>
                    <input
                      id={`${baseId}-d${line.key}`}
                      value={line.description}
                      maxLength={200}
                      placeholder={product ? product.name : "Description, e.g. Installation"}
                      onChange={event => update(line.key, { description: event.target.value })}
                      className={inputClass}
                    />
                    {short && (
                      <p className="text-xs text-destructive">
                        Only {formatInteger(product.quantity)} {product.unit} on hand. Confirming will fail until stock arrives.
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor={`${baseId}-q${line.key}`} className="sr-only">
                      Line {index + 1} quantity
                    </label>
                    <input
                      id={`${baseId}-q${line.key}`}
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="10000000"
                      step="1"
                      value={line.quantity}
                      onChange={event => update(line.key, { quantity: event.target.value })}
                      className={`${inputClass} text-right tabular-nums`}
                    />
                  </div>
                  <div>
                    <label htmlFor={`${baseId}-u${line.key}`} className="sr-only">
                      Line {index + 1} unit price
                    </label>
                    <input
                      id={`${baseId}-u${line.key}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      placeholder="Unit price"
                      onChange={event => update(line.key, { unitPrice: event.target.value })}
                      className={`${inputClass} text-right tabular-nums`}
                    />
                  </div>
                  <p className="flex h-9 items-center justify-end text-sm font-medium tabular-nums">{formatMoney(lineTotal(line))}</p>
                  <button
                    type="button"
                    onClick={() => setLines(current => (current.length > 1 ? current.filter(item => item.key !== line.key) : [blankLine()]))}
                    aria-label={`Remove line ${index + 1}`}
                    className="flex h-9 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLines(current => [...current, blankLine()])}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add line
            </Button>
            <p className="text-sm">
              Total <span className="ml-2 text-lg font-semibold tabular-nums">{formatMoney(total)}</span>
            </p>
          </div>
        </fieldset>
        <TextAreaField label="Notes" id="order-notes" rows={2} maxLength={2000} value={notes} error={serverErrors.notes} onChange={event => {
            setNotes(event.target.value);
            clearErrors();
          }}
        />
      </form>
    </Dialog>
  );
}
