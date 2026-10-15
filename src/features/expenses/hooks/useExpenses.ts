import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { expenseService, type ClaimQuery } from "../services/expenseService";

export const expenseKeys = {
  all: ["expenses"] as const,
  list: (query: ClaimQuery) => ["expenses", "list", query] as const,
  summary: ["expenses", "summary"] as const,
};

export const useClaims = (query: ClaimQuery) => useQuery({ queryKey: expenseKeys.list(query), queryFn: ({ signal }) => expenseService.list(query, { signal }) });
export const useExpenseSummary = () => useQuery({ queryKey: expenseKeys.summary, queryFn: ({ signal }) => expenseService.summary({ signal }) });

function useExpenseChange<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: expenseKeys.all }) });
}

export const useSubmitClaim = () => useExpenseChange(expenseService.create);
export const useUpdateClaim = () => useExpenseChange(expenseService.update);
