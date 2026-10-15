"use client";
import { useId } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import type { BillingProduct } from "../services/billingService";
import { priceLine, toNumber } from "../utils/billingMeta";

export interface LineDraft {
  key: string;
  productId: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  discountPct: string;
  taxRate: string;
}

let nextKey = 1;
/** A blank line (call from event handlers or state initialisers). */
export const blankLine = (taxRate: number): LineDraft => ({
  key: `new-${nextKey++}`,
  productId: "",
  description: "",
  quantity: "1",
  unit: "",
  unitPrice: "",
  discountPct: "0",
  taxRate: String(taxRate),
});

/** The numbers a line prices with; a blank price on a product line uses the product's price, as the server does. */
export function lineNumbers(line: LineDraft, product: BillingProduct | undefined, defaultTaxRate: number) {
  return {
    quantity: toNumber(line.quantity),
    unitPrice: line.unitPrice.trim() === "" && product ? product.salePrice : toNumber(line.unitPrice),
    discountPct: toNumber(line.discountPct),
    taxRate: toNumber(line.taxRate, defaultTaxRate),
  };
}

const inputClass = (invalid?: boolean) =>
  cn(
    "h-9 w-full rounded-lg border bg-card px-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    invalid ? "border-destructive" : "border-input"
  );
const cellLabel = "text-xs text-muted-foreground lg:sr-only";
const GRID = "grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_6.5rem_4.5rem_4.5rem_6.5rem_2rem] lg:items-start";

export interface LineItemsEditorProps {
  lines: LineDraft[];
  products: BillingProduct[];
  defaultTaxRate: number;
  taxLabel: string;
  /** Per-line messages, keyed by line key */
  lineErrors: Record<string, string>;
  onChange: (lines: LineDraft[]) => void;
}

/** Priced line items: product picker, quantity, unit, price, discount %, tax %, and live line totals. */
export function LineItemsEditor({ lines, products, defaultTaxRate, taxLabel, lineErrors, onChange }: LineItemsEditorProps) {
  const baseId = useId();
  const productById = new Map(products.map(product => [String(product.id), product]));

  function update(key: string, changes: Partial<LineDraft>) {
    onChange(lines.map(line => (line.key === key ? { ...line, ...changes } : line)));
  }

  function pickProduct(key: string, productId: string) {
    const product = productById.get(productId);
    update(key, product ? { productId, description: product.name, unit: product.unit ?? "", unitPrice: String(product.salePrice) } : { productId: "" });
  }

  function remove(key: string) {
    onChange(lines.length > 1 ? lines.filter(line => line.key !== key) : [blankLine(defaultTaxRate)]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div aria-hidden="true" className={cn(GRID, "hidden px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:grid")}>
        <span>Item</span>
        <span className="text-right">Qty</span>
        <span>Unit</span>
        <span className="text-right">Price</span>
        <span className="text-right">Disc %</span>
        <span className="text-right">{taxLabel} %</span>
        <span className="text-right">Amount</span>
        <span />
      </div>
      <ol className="flex flex-col gap-2">
        {lines.map((line, index) => {
          const product = productById.get(line.productId);
          const priced = priceLine(lineNumbers(line, product, defaultTaxRate));
          const id = (field: string) => `${baseId}-${field}-${line.key}`;
          const n = index + 1;
          const error = lineErrors[line.key];
          return (
            <li key={line.key} className={cn("rounded-lg border p-2", error && "border-destructive")} aria-describedby={error ? id("error") : undefined}>
              <div className={GRID}>
                <div className="col-span-2 flex min-w-0 flex-col gap-2 sm:col-span-4 lg:col-span-1">
                  {products.length > 0 && (
                    <>
                      <label htmlFor={id("product")} className="sr-only">
                        Line {n} product
                      </label>
                      <select id={id("product")} value={line.productId} onChange={event => pickProduct(line.key, event.target.value)} className={inputClass()}>
                        <option value="">Custom item (no product)</option>
                        {products.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} · {item.sku}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  <label htmlFor={id("description")} className="sr-only">
                    Line {n} description
                  </label>
                  <input
                    id={id("description")}
                    value={line.description}
                    maxLength={300}
                    placeholder={product ? product.name : "Description, e.g. Consulting"}
                    onChange={event => update(line.key, { description: event.target.value })}
                    className={inputClass()}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={id("quantity")} className={cellLabel}>
                    <span className="lg:hidden">Quantity</span>
                    <span className="hidden lg:inline">Line {n} quantity</span>
                  </label>
                  <input
                    id={id("quantity")}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={line.quantity}
                    onChange={event => update(line.key, { quantity: event.target.value })}
                    className={cn(inputClass(toNumber(line.quantity) <= 0), "text-right tabular-nums")}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={id("unit")} className={cellLabel}>
                    <span className="lg:hidden">Unit</span>
                    <span className="hidden lg:inline">Line {n} unit</span>
                  </label>
                  <input id={id("unit")} value={line.unit} maxLength={20} placeholder="pcs" onChange={event => update(line.key, { unit: event.target.value })} className={inputClass()} />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={id("price")} className={cellLabel}>
                    <span className="lg:hidden">Unit price</span>
                    <span className="hidden lg:inline">Line {n} unit price</span>
                  </label>
                  <input
                    id={id("price")}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={line.unitPrice}
                    placeholder={product ? String(product.salePrice) : "0.00"}
                    onChange={event => update(line.key, { unitPrice: event.target.value })}
                    className={cn(inputClass(), "text-right tabular-nums")}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={id("discount")} className={cellLabel}>
                    <span className="lg:hidden">Discount %</span>
                    <span className="hidden lg:inline">Line {n} discount percent</span>
                  </label>
                  <input
                    id={id("discount")}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="any"
                    value={line.discountPct}
                    onChange={event => update(line.key, { discountPct: event.target.value })}
                    className={cn(inputClass(), "text-right tabular-nums")}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={id("tax")} className={cellLabel}>
                    <span className="lg:hidden">{taxLabel} %</span>
                    <span className="hidden lg:inline">
                      Line {n} {taxLabel} percent
                    </span>
                  </label>
                  <input
                    id={id("tax")}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="any"
                    value={line.taxRate}
                    onChange={event => update(line.key, { taxRate: event.target.value })}
                    className={cn(inputClass(), "text-right tabular-nums")}
                  />
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <span className={cellLabel}>Amount</span>
                  <span className="flex h-9 items-center justify-end text-sm font-medium tabular-nums" title={`${formatMoney(priced.lineSubtotal)} + ${formatMoney(priced.lineTax)} ${taxLabel}`}>
                    {formatMoney(priced.lineTotal)}
                  </span>
                </div>
                <div className="flex items-end justify-end lg:items-start">
                  <button
                    type="button"
                    onClick={() => remove(line.key)}
                    aria-label={`Remove line ${n}`}
                    className="flex h-9 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              {error && (
                <p id={id("error")} className="mt-1.5 px-1 text-xs text-destructive">
                  {error}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <div>
        <Button variant="ghost" size="sm" onClick={() => onChange([...lines, blankLine(defaultTaxRate)])} disabled={lines.length >= 200}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add line
        </Button>
      </div>
    </div>
  );
}
