"use client";
// Page: owns URL state (?q=&category=&stock=&status=&sort=&page=) and the "new product" dialog.
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { useDebounce } from "@/hooks/useDebounce";
import { useSearchParamsState } from "@/lib/navigation";
import { useCan } from "@/features/auth";
import { InventoryOverview } from "../components/InventoryOverview";
import { ProductFormDialog } from "../components/ProductFormDialog";
import { ProductList } from "../components/ProductList";
import { useProductCategories } from "../hooks/useInventory";
import type { ProductQuery } from "../services/inventoryService";

type FilterName = "q" | "category" | "stock" | "status" | "sort";
const DEFAULTS: Partial<Record<FilterName, string>> = { status: "active", sort: "name" };
const selectClass = "h-9 rounded-lg border border-input bg-card px-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function InventoryPage() {
  const [params, setParams] = useSearchParamsState();
  const [dialogKey, setDialogKey] = useState(0);
  const canEdit = useCan("inventory.products.edit");
  const { data: categories = [] } = useProductCategories();
  const state = {
    search: params.get("q") ?? "",
    category: params.get("category") ?? "",
    stock: params.get("stock") ?? "",
    status: params.get("status") ?? DEFAULTS.status!,
    sort: params.get("sort") ?? DEFAULTS.sort!,
    page: Number(params.get("page")) || 1,
  };
  const debouncedSearch = useDebounce(state.search, 300);

  function handleChange(name: FilterName, value: string) {
    setParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (value && value !== DEFAULTS[name]) next.set(name, value);
        else next.delete(name);
        next.delete("page");
        return next;
      },
      { push: name !== "q" }
    );
  }

  function handlePageChange(page: number) {
    setParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (page > 1) next.set("page", String(page));
        else next.delete("page");
        return next;
      },
      { push: true }
    );
  }

  const query: ProductQuery = {
    search: debouncedSearch || undefined,
    category: state.category || undefined,
    stock: state.stock || undefined,
    status: state.status,
    sort: state.sort,
    page: state.page,
  };
  const openDialog = () => setDialogKey(Date.now());
  const newButton = canEdit && (
    <Button onClick={openDialog}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      New product
    </Button>
  );

  const selects: { name: Exclude<FilterName, "q">; label: string; options: { value: string; label: string }[] }[] = [
    { name: "category", label: "Category", options: [{ value: "", label: "All categories" }, ...categories.map(category => ({ value: category, label: category }))] },
    {
      name: "stock",
      label: "Stock level",
      options: [
        { value: "", label: "Any stock level" },
        { value: "low", label: "Low stock" },
        { value: "out", label: "Out of stock" },
      ],
    },
    {
      name: "status",
      label: "Status",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Archived" },
        { value: "all", label: "Active and archived" },
      ],
    },
    {
      name: "sort",
      label: "Sort by",
      options: [
        { value: "name", label: "Sort: Name" },
        { value: "sku", label: "Sort: SKU" },
        { value: "quantity", label: "Sort: Lowest stock" },
        { value: "value", label: "Sort: Highest value" },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Inventory" description="Track what you stock, record every movement, and catch low stock early." actions={newButton || undefined} />
      <InventoryOverview />
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="product-search" className="sr-only">
            Search products
          </label>
          <input
            id="product-search"
            type="search"
            value={state.search}
            onChange={event => handleChange("q", event.target.value)}
            placeholder="Search name, SKU, or category"
            className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {selects.map(select => (
            <span key={select.name}>
              <label htmlFor={`inventory-${select.name}`} className="sr-only">
                {select.label}
              </label>
              <select id={`inventory-${select.name}`} value={state[select.name]} onChange={event => handleChange(select.name, event.target.value)} className={selectClass}>
                {select.options.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </span>
          ))}
        </div>
      </div>
      <ProductList query={query} isFiltered={Boolean(debouncedSearch || state.category || state.stock || state.status !== "active")} emptyAction={newButton || undefined} onPageChange={handlePageChange} />
      {dialogKey > 0 && <ProductFormDialog key={dialogKey} onClose={() => setDialogKey(0)} />}
    </div>
  );
}
