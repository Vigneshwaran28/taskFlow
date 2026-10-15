"use client";
import { useId, useState, type FormEvent } from "react";
import { useRouter } from "@/lib/navigation";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { useModuleSettings } from "@/features/auth";
import { useCreateProduct, useProductCategories, useUpdateProduct } from "../hooks/useInventory";
import type { Product, ProductInput } from "../services/inventoryService";
import { UNITS } from "../utils/stockMeta";

const toNumber = (value: string) => (value === "" ? 0 : Number(value));

interface FormValues {
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPrice: string;
  salePrice: string;
  reorderLevel: string;
  description: string;
  isActive: boolean;
  openingStock: string;
}

const NUMBER_FIELDS = ["costPrice", "salePrice", "reorderLevel", "openingStock"] as const;
const MONEY_FIELDS: ReadonlySet<string> = new Set(["costPrice", "salePrice"]);

/** Feature component: create or edit a product. Mount with a `key` to reset. */
export function ProductFormDialog({ product = null, onClose }: { product?: Product | null; onClose: () => void }) {
  const isEdit = Boolean(product);
  const toast = useToast();
  const router = useRouter();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const mutation = isEdit ? updateProduct : createProduct;
  const { data: categories = [] } = useProductCategories();
  const configuredUnits = useModuleSettings("inventory").units;
  // The workspace's units, keeping an existing product's unit selectable even if it was removed.
  const units = [...new Set([...(configuredUnits?.length ? configuredUnits : UNITS), ...(product ? [product.unit] : [])])];
  const listId = useId();

  const [values, setValues] = useState<FormValues>({
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    category: product?.category ?? "",
    unit: product?.unit ?? units[0] ?? "pcs",
    costPrice: product ? String(product.costPrice) : "",
    salePrice: product ? String(product.salePrice) : "",
    reorderLevel: product ? String(product.reorderLevel) : "",
    description: product?.description ?? "",
    isActive: product?.isActive ?? true,
    openingStock: "",
  });
  const [clientErrors, setClientErrors] = useState<Record<string, string | undefined>>({});

  const errors: Record<string, string | undefined> = { ...fieldErrorsOf(mutation.error), ...clientErrors };

  function set<K extends keyof FormValues>(name: K, value: FormValues[K]) {
    setValues(current => ({ ...current, [name]: value }));
    setClientErrors(current => ({ ...current, [name]: undefined }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const next: Record<string, string> = {};
    if (!values.sku.trim()) next.sku = "SKU is required.";
    else if (values.sku.trim().length > 60) next.sku = "Keep the SKU under 60 characters.";
    if (!values.name.trim()) next.name = "Name is required.";
    else if (values.name.trim().length > 160) next.name = "Keep the name under 160 characters.";
    if (values.category.trim().length > 80) next.category = "Keep the category under 80 characters.";
    if (values.description.trim().length > 2000) next.description = "Keep the description under 2000 characters.";
    if (!values.unit.trim()) next.unit = "Pick a unit.";
    for (const field of NUMBER_FIELDS) {
      if (isEdit && field === "openingStock") continue;
      const raw = values[field].trim();
      if (raw === "") continue;
      const value = Number(raw);
      if (Number.isNaN(value)) next[field] = "Enter a number.";
      else if (value < 0) next[field] = "Can't be negative.";
      else if (MONEY_FIELDS.has(field) && !/^\d+(\.\d{1,2})?$/.test(raw)) next[field] = "Use at most 2 decimal places.";
      else if (!MONEY_FIELDS.has(field) && !Number.isInteger(value)) next[field] = "Enter a whole number.";
      else if (value > (MONEY_FIELDS.has(field) ? 1e12 : 1e9)) next[field] = "That number is too large.";
    }
    setClientErrors(next);
    if (Object.keys(next).length) return;

    const input: ProductInput = {
      sku: values.sku.trim(),
      name: values.name.trim(),
      category: values.category.trim() || null,
      unit: values.unit,
      costPrice: toNumber(values.costPrice),
      salePrice: toNumber(values.salePrice),
      reorderLevel: toNumber(values.reorderLevel),
      description: values.description.trim() || null,
      isActive: values.isActive,
    };
    if (product) {
      updateProduct.mutate(
        { id: product.id, changes: input },
        {
          onSuccess: () => {
            toast.success("Product saved");
            onClose();
          },
        }
      );
    } else {
      createProduct.mutate(
        { ...input, openingStock: toNumber(values.openingStock) },
        {
          onSuccess: created => {
            toast.success(`${created.name} added`, created.quantity ? `${created.quantity} ${created.unit} in stock.` : "Record stock in when it arrives.");
            onClose();
            router.push(`/inventory/${created.id}`);
          },
        }
      );
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={product ? `Edit ${product.name}` : "New product"}
      description={isEdit ? "Stock on hand changes only through stock movements, so the history always adds up." : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" loading={mutation.isPending}>
            {isEdit ? "Save product" : "Add product"}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formErrorOf(mutation.error)} />
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <TextField label="SKU" id="product-sku" required autoFocus maxLength={60} placeholder="e.g. HDMI-2M" value={values.sku} error={errors.sku} onChange={event => set("sku", event.target.value)} />
          <TextField label="Name" id="product-name" required maxLength={160} placeholder="e.g. HDMI cable, 2 m" value={values.name} error={errors.name} onChange={event => set("name", event.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <TextField
            label="Category"
            id="product-category"
            list={listId}
            maxLength={80}
            placeholder="e.g. Cables"
            value={values.category}
            error={errors.category}
            onChange={event => set("category", event.target.value)}
          />
          <datalist id={listId}>
            {categories.map(category => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <SelectField label="Unit" id="product-unit" value={values.unit} options={units.map(unit => ({ value: unit, label: unit }))} error={errors.unit} onChange={event => set("unit", event.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Cost price" id="product-cost" type="number" inputMode="decimal" min="0" step="0.01" value={values.costPrice} error={errors.costPrice} onChange={event => set("costPrice", event.target.value)} />
          <TextField label="Sale price" id="product-price" type="number" inputMode="decimal" min="0" step="0.01" value={values.salePrice} error={errors.salePrice} onChange={event => set("salePrice", event.target.value)} />
          <TextField
            label="Reorder at"
            id="product-reorder"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            hint="Flag as low at or below this."
            value={values.reorderLevel}
            error={errors.reorderLevel}
            onChange={event => set("reorderLevel", event.target.value)}
          />
        </div>
        {!isEdit && (
          <TextField
            label="Opening stock"
            id="product-opening"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            hint="Quantity on hand right now. Recorded as the first stock movement."
            value={values.openingStock}
            error={errors.openingStock}
            onChange={event => set("openingStock", event.target.value)}
          />
        )}
        <TextAreaField label="Description" id="product-description" rows={3} maxLength={2000} value={values.description} error={errors.description} onChange={event => set("description", event.target.value)} />
        {isEdit && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!values.isActive} onChange={event => set("isActive", !event.target.checked)} className="h-4 w-4 rounded border-input accent-primary" />
            Archive this product (hidden from lists and new orders; history is kept)
          </label>
        )}
      </form>
    </Dialog>
  );
}
