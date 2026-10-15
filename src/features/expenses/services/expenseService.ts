import { apiClient } from "@/lib/apiClient";
import type { PersonRef } from "@/types/session";

export type ClaimStatus = "pending" | "approved" | "rejected" | "paid" | "cancelled";

export interface ExpenseClaim {
  id: number;
  /** e.g. "EXP-0007" */
  key: string;
  user: { id: number; name: string; jobTitle: string | null };
  title: string;
  category: string;
  amount: number;
  /** YYYY-MM-DD */
  spentOn: string;
  notes: string | null;
  status: ClaimStatus;
  reviewer: PersonRef | null;
  reviewNote: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface Total {
  count: number;
  amount: number;
}

export interface ExpenseSummary {
  mine: { pending: Total; approved: Total; paid: Total };
  team?: { pending: Total; toPay: Total; paidThisMonth: Total };
}

export interface ClaimQuery {
  scope: "mine" | "all";
  status?: ClaimStatus;
}

export interface ClaimInput {
  title: string;
  category: string;
  amount: number;
  spentOn: string;
  notes: string | null;
}

export interface ClaimUpdate {
  id: number;
  status: "approved" | "rejected" | "paid" | "cancelled";
  reviewNote?: string | null;
}

export const expenseService = {
  async list({ scope = "mine", status }: Partial<ClaimQuery> = {}, { signal }: { signal?: AbortSignal } = {}): Promise<ExpenseClaim[]> {
    return (await apiClient.get<ExpenseClaim[] | null>("/expenses", { params: { scope, status }, signal })) ?? [];
  },
  summary: ({ signal }: { signal?: AbortSignal } = {}) => apiClient.get<ExpenseSummary>("/expenses/summary", { signal }),
  create: (input: ClaimInput) => apiClient.post<ExpenseClaim>("/expenses", input),
  update: ({ id, ...changes }: ClaimUpdate) => apiClient.patch<ExpenseClaim>(`/expenses/${id}`, changes),
};
