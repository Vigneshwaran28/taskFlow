import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePollInterval } from "@/realtime";
import { messagingService, type Conversation, type MessagePage } from "../services/messagingService";

export const messagingKeys = {
  all: ["messaging"] as const,
  conversations: ["messaging", "conversations"] as const,
  unread: ["messaging", "unread"] as const,
  messages: (id: number) => ["messaging", "messages", id] as const,
};

/**
 * Chats refresh on live events (message.created / conversation.updated invalidate the "messaging" root).
 * Polling is only a fallback: slow while live updates are connected, quicker while they're down.
 */
export function useConversations() {
  const refetchInterval = usePollInterval(10_000);
  return useQuery({ queryKey: messagingKeys.conversations, queryFn: ({ signal }) => messagingService.conversations({ signal }), refetchInterval });
}

export function useUnreadMessages({ enabled = true }: { enabled?: boolean } = {}) {
  const refetchInterval = usePollInterval(20_000, 120_000);
  return useQuery({ queryKey: messagingKeys.unread, queryFn: ({ signal }) => messagingService.unread({ signal }), refetchInterval, enabled });
}

/** The open conversation's latest messages: refreshed by live events, polled every few seconds only while offline. */
export function useMessages(id: number) {
  const refetchInterval = usePollInterval(4_000, 60_000);
  return useQuery({ queryKey: messagingKeys.messages(id), queryFn: ({ signal }) => messagingService.messages(id, {}, { signal }), enabled: Boolean(id), refetchInterval });
}

/** Fetches the page before a message id ("load older"); the thread keeps those pages itself. */
export const useOlderMessages = () => useMutation({ mutationFn: ({ id, before }: { id: number; before: number }) => messagingService.messages(id, { before }) });

function useMessagingChange<TData, TVariables>(mutationFn: (variables: TVariables) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: messagingKeys.all }) });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: messagingService.send,
    onSuccess: (message, { id }) => {
      // Show the sent message right away, then let the poll catch up.
      queryClient.setQueryData<MessagePage>(messagingKeys.messages(id), current =>
        current && !current.messages.some(item => item.id === message.id) ? { ...current, messages: [...current.messages, message] } : current
      );
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations });
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: messagingService.markRead,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Conversation[]>(messagingKeys.conversations, current => current?.map(item => (item.id === id ? { ...item, unread: 0 } : item)));
      queryClient.invalidateQueries({ queryKey: messagingKeys.unread });
    },
  });
}

/** Creating (or reopening) a chat: put it in the list right away so it can be selected before the refetch lands. */
function useConversationCreate<TVariables>(mutationFn: (variables: TVariables) => Promise<Conversation>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: conversation => {
      queryClient.setQueryData<Conversation[]>(messagingKeys.conversations, current =>
        current ? [conversation, ...current.filter(item => item.id !== conversation.id)] : [conversation]
      );
      void queryClient.invalidateQueries({ queryKey: messagingKeys.all });
    },
  });
}

export const useOpenDirect = () => useConversationCreate(messagingService.openDirect);
export const useCreateGroup = () => useConversationCreate(messagingService.createGroup);
export const useRenameGroup = () => useMessagingChange(messagingService.rename);
export const useAddMembers = () => useMessagingChange(messagingService.addMembers);
export const useRemoveMember = () => useMessagingChange(messagingService.removeMember);
export const useDeleteMessage = () => useMessagingChange(messagingService.deleteMessage);
