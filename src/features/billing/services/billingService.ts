// Billing API calls (/api/billing) and the shapes they return. See docs/api/billing.md and server/src/routes/billing.js.
import { apiClient, apiUrl, type QueryParams } from "@/lib/apiClient";
import type { Page, PaymentMethod } from "@/types/session";

export type DocumentKind = "invoice" | "quote";
export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "void";
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "converted";
export type DocumentStatus = InvoiceStatus | QuoteStatus;

export interface Ref {
  id: number;
  name: string;
}

export interface NumberRef {
  id: number;
  number: string;
}

export interface BillTo {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
}

/** A list item and the base of every write response. */
export interface BillingDocument {
  id: number;
  kind: DocumentKind;
  number: string;
  status: DocumentStatus;
  customer: { id: number; name: string; company: string | null } | null;
  billTo: BillTo;
  issueDate: string;
  /** Due date for invoices, "valid until" for quotes */
  dueDate: string | null;
  currency: string;
  /** Before discounts */
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  /** 0 for quotes and void invoices */
  balance: number;
  isOverdue: boolean;
  isExpired: boolean;
  notes: string | null;
  terms: string | null;
  sourceQuoteId: number | null;
  orderId: number | null;
  itemCount: number;
  createdBy: Ref | null;
  sentAt: string | null;
  paidAt: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LineItem {
  id: number;
  productId: number | null;
  sku: string | null;
  position: number;
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
  /** After the line discount, before tax */
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
}

export interface Payment {
  id: number;
  amount: number;
  method: string;
  paidOn: string;
  reference: string | null;
  notes: string | null;
  recordedBy: Ref | null;
  createdAt: string;
}

export interface Customer {
  id: number;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface CompanyDetails {
  legalName: string;
  address: string;
  taxId: string;
  email: string;
  phone: string;
  website: string;
  currency: string;
}

/** GET /documents/:id and every action response. */
export interface BillingDocumentDetail extends Omit<BillingDocument, "customer"> {
  customer: Customer | null;
  items: LineItem[];
  payments: Payment[];
  sourceQuote: NumberRef | null;
  convertedInvoice: NumberRef | null;
  order: { id: number; key: string } | null;
  taxLabel: string;
  company: CompanyDetails;
}

export interface AgingBuckets {
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90_plus: number;
}

export interface RecentPayment extends Payment {
  invoice: { id: number; number: string; billToName: string };
}

export interface TopCustomer {
  id: number;
  name: string;
  invoiceCount: number;
  total: number;
}

export interface BillingSummary {
  currency: string;
  outstanding: number;
  overdue: { count: number; amount: number };
  paidThisMonth: number;
  draftCount: number;
  aging: AgingBuckets;
  recentPayments: RecentPayment[];
  topCustomers: TopCustomer[];
}

export interface BillingProduct {
  id: number;
  sku: string;
  name: string;
  unit: string | null;
  salePrice: number;
}

export interface DocumentFilters {
  kind?: DocumentKind;
  status?: DocumentStatus;
  customerId?: number;
  search?: string;
  from?: string;
  to?: string;
  overdue?: boolean;
  page?: number;
  pageSize?: number;
}

export interface LineInput {
  productId?: number | null;
  description?: string;
  quantity: number;
  unit?: string | null;
  unitPrice?: number;
  discountPct?: number;
  taxRate?: number;
}

export interface BillToInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
}

export interface DocumentInput {
  kind?: DocumentKind;
  customerId?: number | null;
  billTo?: BillToInput | null;
  issueDate?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  terms?: string | null;
  items: LineInput[];
}

export type DocumentChanges = Partial<Omit<DocumentInput, "kind">>;

export interface CustomerInput {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface PaymentInput {
  amount: number;
  method: PaymentMethod | string;
  paidOn: string;
  reference?: string | null;
  notes?: string | null;
}

/** A sales order as listed by GET /api/sales/orders (only the fields billing uses). */
export interface SalesOrderSummary {
  id: number;
  key: string;
  status: "draft" | "confirmed" | "fulfilled" | "cancelled";
  total: number;
  customer: { id: number; name: string; company: string | null } | null;
  itemCount: number;
  confirmedAt: string | null;
  fulfilledAt: string | null;
  createdAt: string;
}

/** GET /api/sales/orders has a fixed page size and no pageSize field. */
export type SalesOrderPage = Omit<Page<SalesOrderSummary>, "pageSize">;

type Options = { signal?: AbortSignal };

function filterParams(filters: DocumentFilters): QueryParams {
  return {
    kind: filters.kind,
    status: filters.status,
    customerId: filters.customerId,
    search: filters.search?.trim() || undefined,
    from: filters.from,
    to: filters.to,
    overdue: filters.overdue ? "true" : undefined,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

const doc = (id: number) => `/billing/documents/${id}`;

export const billingService = {
  summary: ({ signal }: Options = {}) => apiClient.get<BillingSummary>("/billing/summary", { signal }),

  documents: (filters: DocumentFilters, { signal }: Options = {}) => apiClient.get<Page<BillingDocument>>("/billing/documents", { params: filterParams(filters), signal }),

  document: (id: number, { signal }: Options = {}) => apiClient.get<BillingDocumentDetail>(doc(id), { signal }),

  create: (input: DocumentInput) => apiClient.post<BillingDocumentDetail>("/billing/documents", input),

  update: ({ id, changes }: { id: number; changes: DocumentChanges }) => apiClient.patch<BillingDocumentDetail>(doc(id), changes),

  remove: (id: number) => apiClient.delete(doc(id)),

  send: (id: number) => apiClient.post<BillingDocumentDetail>(`${doc(id)}/send`),

  void: ({ id, reason }: { id: number; reason: string }) => apiClient.post<BillingDocumentDetail>(`${doc(id)}/void`, { reason }),

  setQuoteStatus: ({ id, status }: { id: number; status: "accepted" | "declined" }) => apiClient.post<BillingDocumentDetail>(`${doc(id)}/quote-status`, { status }),

  /** Sent or accepted quote -> a new draft invoice. */
  convert: (id: number) => apiClient.post<BillingDocumentDetail>(`${doc(id)}/convert`),

  duplicate: (id: number) => apiClient.post<BillingDocumentDetail>(`${doc(id)}/duplicate`),

  fromOrder: ({ orderId, taxRate }: { orderId: number; taxRate?: number }) =>
    apiClient.post<BillingDocumentDetail>(`/billing/from-order/${orderId}`, taxRate === undefined ? {} : { taxRate }),

  recordPayment: ({ id, payment }: { id: number; payment: PaymentInput }) => apiClient.post<BillingDocumentDetail>(`${doc(id)}/payments`, payment),

  removePayment: ({ id, paymentId }: { id: number; paymentId: number }) => apiClient.delete<BillingDocumentDetail>(`${doc(id)}/payments/${paymentId}`),

  customers: (search: string | undefined, { signal }: Options = {}) => apiClient.get<Customer[]>("/billing/customers", { params: { search: search?.trim() || undefined }, signal }),

  createCustomer: (input: CustomerInput) => apiClient.post<Customer>("/billing/customers", input),

  products: ({ signal }: Options = {}) => apiClient.get<BillingProduct[]>("/billing/products", { signal }),

  /** Sales orders that can be invoiced (the sales API filters one status at a time). */
  salesOrders: (status: "confirmed" | "fulfilled", { signal }: Options = {}) => apiClient.get<SalesOrderPage>("/sales/orders", { params: { status }, signal }),

  /** Same-origin CSV download URL for the current list filters. */
  exportUrl: (filters: DocumentFilters) => apiUrl("/billing/export", { ...filterParams(filters), page: undefined, pageSize: undefined }),
};
