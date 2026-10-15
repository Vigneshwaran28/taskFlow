import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryService, type ProductQuery } from "../services/inventoryService";

export const inventoryKeys = {
  all: ["inventory"] as const,
  summary: ["inventory", "summary"] as const,
  categories: ["inventory", "categories"] as const,
  list: (query: ProductQuery) => ["inventory", "products", query] as const,
  detail: (id: number) => ["inventory", "product", id] as const,
};

export function useInventorySummary() {
  return useQuery({ queryKey: inventoryKeys.summary, queryFn: ({ signal }) => inventoryService.summary({ signal }) });
}

export function useProductCategories() {
  return useQuery({ queryKey: inventoryKeys.categories, queryFn: ({ signal }) => inventoryService.categories({ signal }), staleTime: 60_000 });
}

/** `enabled`: other modules pass false when the workspace has no inventory. */
export function useProducts(query: ProductQuery, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: inventoryKeys.list(query), queryFn: ({ signal }) => inventoryService.list(query, { signal }), placeholderData: keepPreviousData, enabled });
}

export function useProduct(id: number) {
  return useQuery({ queryKey: inventoryKeys.detail(id), queryFn: ({ signal }) => inventoryService.get(id, { signal }), enabled: Number.isInteger(id) && id > 0 });
}

/** Stock and product changes affect lists, totals, and the product page; sales order pickers show stock too. */
function useInventoryChange<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}

export const useCreateProduct = () => useInventoryChange(inventoryService.create);
export const useUpdateProduct = () => useInventoryChange(inventoryService.update);
export const useDeleteProduct = () => useInventoryChange(inventoryService.remove);
export const useAddStockMovement = () => useInventoryChange(inventoryService.addMovement);
