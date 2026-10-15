import { apiClient } from "@/lib/apiClient";
import type { PersonRef } from "@/types/session";

export interface CustomerRef {
  id: number;
  name: string;
  company: string | null;
}

export interface Customer {
  id: number;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  owner: PersonRef | null;
  openDeals: number;
  /** Confirmed and fulfilled order totals */
  totalOrdered: number;
  createdAt: string;
}

export interface CustomerInput {
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  ownerId: number | null;
}

export type DealStage = "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

export interface Deal {
  id: number;
  title: string;
  value: number;
  stage: DealStage;
  /** YYYY-MM-DD */
  expectedClose: string | null;
  notes: string | null;
  customer: CustomerRef | null;
  owner: PersonRef | null;
  closedAt: string | null;
  updatedAt: string;
}

export interface DealInput {
  title: string;
  customerId: number | null;
  value: number;
  stage: DealStage;
  expectedClose: string | null;
  ownerId: number | null;
  notes: string | null;
}

export type OrderStatus = "draft" | "confirmed" | "fulfilled" | "cancelled";

export interface OrderItem {
  id?: number;
  productId: number | null;
  sku?: string | null;
  unit?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
}

export interface OrderItemInput {
  productId: number | null;
  description: string;
  quantity: number;
  /** Omitted: the product's sale price */
  unitPrice?: number;
}

export interface Order {
  id: number;
  /** e.g. "SO-0042" */
  key: string;
  status: OrderStatus;
  total: number;
  notes: string | null;
  customer: CustomerRef | null;
  createdBy: PersonRef | null;
  itemCount: number;
  /** Only on a single order */
  items?: OrderItem[];
  confirmedAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface OrderInput {
  customerId: number | null;
  notes: string | null;
  items: OrderItemInput[];
}

export interface OrderChanges extends Partial<OrderInput> {
  status?: OrderStatus;
}

export interface OrderQuery {
  status?: string;
  page: number;
}

export interface OrderPage {
  items: Order[];
  page: number;
  total: number;
  totalPages: number;
}

export interface SalesSummary {
  pipeline: Record<DealStage, { count: number; value: number }>;
  openPipeline: { count: number; value: number };
  wonThisMonth: { count: number; value: number };
  revenueThisMonth: number;
  ordersThisMonth: number;
  customers: number;
  /** Percent of closed deals that were won */
  winRate: number | null;
  topCustomers: { id: number; name: string; total: number }[];
}

interface SignalOptions {
  signal?: AbortSignal;
}

export const salesService = {
  summary({ signal }: SignalOptions = {}) {
    return apiClient.get<SalesSummary>("/sales/summary", { signal });
  },

  async customers({ search }: { search?: string } = {}, { signal }: SignalOptions = {}): Promise<Customer[]> {
    return (await apiClient.get<Customer[] | null>("/sales/customers", { params: { search }, signal })) ?? [];
  },
  createCustomer: (input: CustomerInput) => apiClient.post<Customer>("/sales/customers", input),
  updateCustomer: ({ id, changes }: { id: number; changes: Partial<CustomerInput> }) => apiClient.patch<Customer>(`/sales/customers/${id}`, changes),
  deleteCustomer: (id: number) => apiClient.delete(`/sales/customers/${id}`),

  async deals({ signal }: SignalOptions = {}): Promise<Deal[]> {
    return (await apiClient.get<Deal[] | null>("/sales/deals", { signal })) ?? [];
  },
  createDeal: (input: DealInput) => apiClient.post<Deal>("/sales/deals", input),
  updateDeal: ({ id, changes }: { id: number; changes: Partial<DealInput> }) => apiClient.patch<Deal>(`/sales/deals/${id}`, changes),
  deleteDeal: (id: number) => apiClient.delete(`/sales/deals/${id}`),

  async orders({ status, page = 1 }: Partial<OrderQuery> = {}, { signal }: SignalOptions = {}): Promise<OrderPage> {
    const data = await apiClient.get<Partial<OrderPage> | null>("/sales/orders", { params: { status, page }, signal });
    return { items: data?.items ?? [], page: data?.page ?? 1, total: data?.total ?? 0, totalPages: data?.totalPages ?? 1 };
  },
  order: (id: number, { signal }: SignalOptions = {}) => apiClient.get<Order>(`/sales/orders/${id}`, { signal }),
  createOrder: (input: OrderInput) => apiClient.post<Order>("/sales/orders", input),
  updateOrder: ({ id, changes }: { id: number; changes: OrderChanges }) => apiClient.patch<Order>(`/sales/orders/${id}`, changes),
  deleteOrder: (id: number) => apiClient.delete(`/sales/orders/${id}`),
};

/** Creates a draft invoice in billing from a confirmed or fulfilled order (409 ALREADY_INVOICED when one exists). */
export function createInvoiceFromOrder(orderId: number) {
  return apiClient.post<{ id: number }>(`/billing/from-order/${orderId}`, {});
}
