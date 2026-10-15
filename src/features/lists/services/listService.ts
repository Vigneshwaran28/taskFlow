import { apiClient } from "@/lib/apiClient";

export type ListColor = "slate" | "red" | "orange" | "amber" | "emerald" | "teal" | "sky" | "indigo" | "violet" | "pink";

export interface TaskList {
  id: number;
  name: string;
  color: ListColor;
  openCount: number;
  createdAt: string;
}

export interface ListInput {
  name: string;
  color: ListColor;
}

export const listService = {
  async getLists({ signal }: { signal?: AbortSignal } = {}): Promise<TaskList[]> {
    return (await apiClient.get<TaskList[] | null>("/lists", { signal })) ?? [];
  },

  createList(input: ListInput) {
    return apiClient.post<TaskList>("/lists", input);
  },

  updateList(id: number, input: Partial<ListInput>) {
    return apiClient.patch<TaskList>(`/lists/${id}`, input);
  },

  deleteList(id: number) {
    return apiClient.delete(`/lists/${id}`);
  },
};
