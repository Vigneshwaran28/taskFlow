import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listService, type ListInput } from "../services/listService";

export const listKeys = {
  all: ["lists"] as const,
};

export function useLists() {
  return useQuery({
    queryKey: listKeys.all,
    queryFn: ({ signal }) => listService.getLists({ signal }),
  });
}

export function useCreateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: listService.createList,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKeys.all }),
  });
}

export function useUpdateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<ListInput> }) => listService.updateList(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listKeys.all });
      queryClient.invalidateQueries({ queryKey: ["tasks"] }); // task rows show list name/color
    },
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: listService.deleteList,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listKeys.all });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
