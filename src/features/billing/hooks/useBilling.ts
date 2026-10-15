import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { billingService, type BillingDocumentDetail, type DocumentFilters } from "../services/billingService";

export const billingKeys = {
  all: ["billing"] as const,
  summary: ["billing", "summary"] as const,
  documents: (filters: DocumentFilters) => ["billing", "documents", filters] as const,
  document: (id: number) => ["billing", "document", id] as const,
  customers: (search: string) => ["billing", "customers", search] as const,
  products: ["billing", "products"] as const,
  salesOrders: ["billing", "sales-orders"] as const,
};

export const useBillingSummary = (options: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: billingKeys.summary, queryFn: ({ signal }) => billingService.summary({ signal }), enabled: options.enabled ?? true });

export const useBillingDocuments = (filters: DocumentFilters) =>
  useQuery({ queryKey: billingKeys.documents(filters), queryFn: ({ signal }) => billingService.documents(filters, { signal }), placeholderData: keepPreviousData });

export const useBillingDocument = (id: number | null) =>
  useQuery({ queryKey: billingKeys.document(id ?? 0), queryFn: ({ signal }) => billingService.document(id ?? 0, { signal }), enabled: Boolean(id) });

export const useBillingCustomers = (search: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: billingKeys.customers(search.trim()),
    queryFn: ({ signal }) => billingService.customers(search, { signal }),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });

export const useBillingProducts = () => useQuery({ queryKey: billingKeys.products, queryFn: ({ signal }) => billingService.products({ signal }), staleTime: 60_000 });

/** Confirmed and fulfilled sales orders (newest first), the ones that can become invoices. */
export const useInvoiceableOrders = (options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: billingKeys.salesOrders,
    queryFn: async ({ signal }) => {
      const [confirmed, fulfilled] = await Promise.all([billingService.salesOrders("confirmed", { signal }), billingService.salesOrders("fulfilled", { signal })]);
      return [...confirmed.items, ...fulfilled.items].sort((a, b) => b.id - a.id);
    },
    enabled: options.enabled ?? true,
  });

/** Same-origin CSV download link for list filters (for an <a href download>). */
export const useBillingExportUrl = (filters: DocumentFilters) => billingService.exportUrl(filters);

/** Every billing write can move totals, lists, and the summary: refresh the whole module. */
function useBillingChange<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: result => {
      // Seed the detail cache with full documents so the page updates without a refetch flash.
      const detail = result as unknown as BillingDocumentDetail | null;
      if (detail && typeof detail === "object" && "items" in detail && "id" in detail) queryClient.setQueryData(billingKeys.document(detail.id), detail);
      return queryClient.invalidateQueries({ queryKey: billingKeys.all });
    },
  });
}

export const useCreateDocument = () => useBillingChange(billingService.create);
export const useUpdateDocument = () => useBillingChange(billingService.update);
export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingService.remove,
    // The deleted document's own query is left alone: its page is navigating away and a refetch would 404.
    onSuccess: (_result, id) =>
      queryClient.invalidateQueries({ queryKey: billingKeys.all, predicate: query => !(query.queryKey[1] === "document" && query.queryKey[2] === id) }),
  });
};
export const useSendDocument = () => useBillingChange(billingService.send);
export const useVoidDocument = () => useBillingChange(billingService.void);
export const useSetQuoteStatus = () => useBillingChange(billingService.setQuoteStatus);
export const useConvertQuote = () => useBillingChange(billingService.convert);
export const useDuplicateDocument = () => useBillingChange(billingService.duplicate);
export const useInvoiceFromOrder = () => useBillingChange(billingService.fromOrder);
export const useRecordPayment = () => useBillingChange(billingService.recordPayment);
export const useRemovePayment = () => useBillingChange(billingService.removePayment);
/** Billing customers are the sales customers too, so the sales lists refresh as well. */
export const useCreateBillingCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingService.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales", "customers"] });
      return queryClient.invalidateQueries({ queryKey: billingKeys.all });
    },
  });
};
