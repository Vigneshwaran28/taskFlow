import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePollInterval } from "@/realtime";
import { ticketService, type TicketQuery } from "../services/ticketService";

export const ticketKeys = {
  all: ["tickets"] as const,
  lists: () => ["tickets", "list"] as const,
  list: (query: TicketQuery) => ["tickets", "list", query] as const,
  stats: ["tickets", "stats"] as const,
  detail: (id: number) => ["tickets", "detail", id] as const,
};

export function useTickets(query: TicketQuery) {
  return useQuery({
    queryKey: ticketKeys.list(query),
    queryFn: ({ signal }) => ticketService.list(query, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

/** ticket.updated refreshes the "tickets" root live; these polls are the fallback when the socket is down. */
export function useTicketStats() {
  const refetchInterval = usePollInterval(60_000, 120_000);
  return useQuery({
    queryKey: ticketKeys.stats,
    queryFn: ({ signal }) => ticketService.stats({ signal }),
    refetchInterval,
  });
}

export function useTicket(id: number) {
  const refetchInterval = usePollInterval(30_000); // pick up replies from the other side
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: ({ signal }) => ticketService.get(id, { signal }),
    enabled: Number.isInteger(id) && id > 0,
    refetchInterval,
  });
}

/** Any ticket change can move it between queues and counts: refresh lists, stats, and that ticket. */
function useTicketChange<TData, TVariables extends object>(mutationFn: (variables: TVariables) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats });
      if ("id" in variables && typeof variables.id === "number") queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
    },
  });
}

export const useCreateTicket = () => useTicketChange(ticketService.create);
export const useUpdateTicket = () => useTicketChange(ticketService.update);
export const useAddTicketComment = () => useTicketChange(ticketService.addComment);
export const useRateTicket = () => useTicketChange(ticketService.rate);
