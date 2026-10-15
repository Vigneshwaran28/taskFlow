import { apiClient } from "@/lib/apiClient";
import type { PersonRef } from "@/types/session";

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  /** e.g. "pcs", "box", "kg" */
  unit: string;
  costPrice: number;
  salePrice: number;
  /** On hand */
  quantity: number;
  /** At or below this, the product is "low" */
  reorderLevel: number;
  /** quantity × cost price */
  stockValue: number;
  isLow: boolean;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MovementType = "in" | "out" | "adjust" | "sale" | "return";

export interface StockMovement {
  id: number;
  productId: number;
  product?: { id: number; name: string; sku: string; unit: string };
  type: MovementType;
  /** Signed quantity */
  change: number;
  balanceAfter: number;
  reason: string | null;
  /** e.g. a PO or sales order number */
  reference: string | null;
  createdBy: PersonRef | null;
  createdAt: string;
}

export interface ProductDetail extends Product {
  movements: StockMovement[];
}

export interface ProductQuery {
  search?: string;
  category?: string;
  stock?: "low" | "out" | string;
  status?: "active" | "inactive" | "all" | string;
  sort?: string;
  page?: number;
  /** Up to 200 (order pickers load a long page) */
  pageSize?: number;
}

export interface ProductInput {
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  costPrice: number;
  salePrice: number;
  reorderLevel: number;
  description: string | null;
  isActive: boolean;
  openingStock?: number;
}

export interface InventorySummary {
  products: number;
  units: number;
  stockValue: number;
  lowStock: number;
  outOfStock: number;
  recentMovements: StockMovement[];
}

export interface ProductPage {
  items: Product[];
  page: number;
  total: number;
  totalPages: number;
}

export interface StockMovementInput {
  id: number;
  type: "in" | "out" | "adjust";
  quantity: number;
  reason: string | null;
  reference: string | null;
}

interface SignalOptions {
  signal?: AbortSignal;
}

export const inventoryService = {
  summary({ signal }: SignalOptions = {}) {
    return apiClient.get<InventorySummary>("/inventory/summary", { signal });
  },

  async categories({ signal }: SignalOptions = {}): Promise<string[]> {
    return (await apiClient.get<string[] | null>("/inventory/categories", { signal })) ?? [];
  },

  async list(query: ProductQuery = {}, { signal }: SignalOptions = {}): Promise<ProductPage> {
    const data = await apiClient.get<Partial<ProductPage> | null>("/inventory/products", { params: { ...query }, signal });
    return { items: data?.items ?? [], page: data?.page ?? 1, total: data?.total ?? 0, totalPages: data?.totalPages ?? 1 };
  },

  async get(id: number, { signal }: SignalOptions = {}): Promise<ProductDetail> {
    const data = await apiClient.get<Product & { movements?: StockMovement[] }>(`/inventory/products/${id}`, { signal });
    return { ...data, movements: data?.movements ?? [] };
  },

  create(input: ProductInput) {
    return apiClient.post<Product>("/inventory/products", input);
  },

  update({ id, changes }: { id: number; changes: Partial<ProductInput> }) {
    return apiClient.patch<Product>(`/inventory/products/${id}`, changes);
  },

  remove(id: number) {
    return apiClient.delete(`/inventory/products/${id}`);
  },

  addMovement({ id, ...movement }: StockMovementInput) {
    return apiClient.post<Product>(`/inventory/products/${id}/movements`, movement);
  },
};
