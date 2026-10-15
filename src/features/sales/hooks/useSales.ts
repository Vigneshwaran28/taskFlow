import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createInvoiceFromOrder, salesService, type OrderQuery } from "../services/salesService";

export const salesKeys = {
  all: ["sales"] as const,
  summary: ["sales", "summary"] as const,
  customers: (search?: string) => ["sales", "customers", search ?? ""] as const,
  deals: ["sales", "deals"] as const,
  orders: (query: OrderQuery) => ["sales", "orders", query] as const,
  order: (id: number | null) => ["sales", "order", id] as const,
};

export const useSalesSummary = () => useQuery({ queryKey: salesKeys.summary, queryFn: ({ signal }) => salesService.summary({ signal }) });

export const useCustomers = (search?: string) =>
  useQuery({ queryKey: salesKeys.customers(search), queryFn: ({ signal }) => salesService.customers({ search }, { signal }), placeholderData: keepPreviousData });

export const useDeals = () => useQuery({ queryKey: salesKeys.deals, queryFn: ({ signal }) => salesService.deals({ signal }) });

export const useOrders = (query: OrderQuery) =>
  useQuery({ queryKey: salesKeys.orders(query), queryFn: ({ signal }) => salesService.orders(query, { signal }), placeholderData: keepPreviousData });

export const useOrder = (id: number | null) =>
  useQuery({ queryKey: salesKeys.order(id), queryFn: ({ signal }) => salesService.order(id as number, { signal }), enabled: Boolean(id) });

/** Sales changes move summary numbers; confirming or cancelling orders also moves stock. */
function useSalesChange<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.all });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      // Billing lists customers and invoiceable orders from the same tables.
      queryClient.invalidateQueries({ queryKey: ["billing", "customers"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "sales-orders"] });
    },
  });
}

export const useCreateCustomer = () => useSalesChange(salesService.createCustomer);
export const useUpdateCustomer = () => useSalesChange(salesService.updateCustomer);
export const useDeleteCustomer = () => useSalesChange(salesService.deleteCustomer);
export const useCreateDeal = () => useSalesChange(salesService.createDeal);
export const useUpdateDeal = () => useSalesChange(salesService.updateDeal);
export const useDeleteDeal = () => useSalesChange(salesService.deleteDeal);
export const useCreateOrder = () => useSalesChange(salesService.createOrder);
export const useUpdateOrder = () => useSalesChange(salesService.updateOrder);
export const useDeleteOrder = () => useSalesChange(salesService.deleteOrder);

/** Creates a draft invoice from an order; billing lists and totals change. */
export function useCreateInvoiceFromOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInvoiceFromOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing"] }),
  });
}
