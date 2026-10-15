import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePollInterval } from "@/realtime";
import { broadcastService, type ProviderInbox } from "../services/broadcastService";

export const broadcastKeys = {
  all: ["broadcasts"] as const,
};

/** broadcast.published refreshes the inbox live; the poll is the fallback (and picks up expiries and retractions). */
export function useProviderInbox({ enabled = true }: { enabled?: boolean } = {}) {
  const refetchInterval = usePollInterval(2 * 60_000, 5 * 60_000);
  return useQuery({ queryKey: broadcastKeys.all, queryFn: ({ signal }) => broadcastService.inbox({ signal }), refetchInterval, enabled, staleTime: 30_000 });
}

/** Read / dismiss update the cached inbox at once, then re-check with the server. */
function useInboxChange(mutationFn: (id: number) => Promise<unknown>, patch: { isRead: true; dismissed?: true }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: broadcastKeys.all });
      const previous = queryClient.getQueryData<ProviderInbox>(broadcastKeys.all);
      if (previous) {
        const items = previous.items.map(item => (item.id === id ? { ...item, ...patch } : item));
        queryClient.setQueryData<ProviderInbox>(broadcastKeys.all, { ...previous, items, unread: items.filter(item => !item.isRead).length });
      }
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(broadcastKeys.all, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: broadcastKeys.all }),
  });
}

export const useMarkNoticeRead = () => useInboxChange(broadcastService.markRead, { isRead: true });
export const useDismissNotice = () => useInboxChange(broadcastService.dismiss, { isRead: true, dismissed: true });
