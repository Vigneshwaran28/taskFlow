import { apiClient } from "@/lib/apiClient";

export interface ConversationMember {
  id: number;
  name: string;
  jobTitle: string | null;
  /** Profile picture link (null = initials) */
  avatarUrl?: string | null;
  role: "owner" | "member";
  isActive: boolean;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  /** system = joined / left / renamed notices */
  kind: "text" | "system";
  /** null once deleted */
  body: string | null;
  deleted: boolean;
  sender: { id: number; name: string } | null;
  createdAt: string;
}

export interface Conversation {
  id: number;
  type: "direct" | "group";
  /** For direct chats, the other person's name */
  name: string;
  /** For direct chats, the other person's picture link */
  avatarUrl?: string | null;
  myRole: "owner" | "member";
  /** The viewer may rename and add or remove people */
  canManage: boolean;
  members: ConversationMember[];
  lastMessage: ChatMessage | null;
  unread: number;
  lastActivityAt: string;
}

export interface UnreadMessages {
  total: number;
  conversations: number;
}

export interface MessagePage {
  /** Oldest first */
  messages: ChatMessage[];
  hasMore: boolean;
}

type Signal = { signal?: AbortSignal };

export const messagingService = {
  async conversations({ signal }: Signal = {}): Promise<Conversation[]> {
    return (await apiClient.get<Conversation[] | null>("/messages/conversations", { signal })) ?? [];
  },
  unread: ({ signal }: Signal = {}) => apiClient.get<UnreadMessages>("/messages/unread", { signal }),

  /** The latest page of messages (oldest first), or the page before `before`. */
  messages: (id: number, { before }: { before?: number } = {}, { signal }: Signal = {}) =>
    apiClient.get<MessagePage>(`/messages/conversations/${id}/messages`, { params: { before }, signal }),

  send: ({ id, body }: { id: number; body: string }) => apiClient.post<ChatMessage>(`/messages/conversations/${id}/messages`, { body }),
  openDirect: (userId: number) => apiClient.post<Conversation>("/messages/conversations/direct", { userId }),
  createGroup: (input: { name: string; memberIds: number[] }) => apiClient.post<Conversation>("/messages/conversations/group", input),
  rename: ({ id, name }: { id: number; name: string }) => apiClient.patch<Conversation>(`/messages/conversations/${id}`, { name }),
  addMembers: ({ id, userIds }: { id: number; userIds: number[] }) => apiClient.post<Conversation>(`/messages/conversations/${id}/members`, { userIds }),
  /** Removing yourself leaves the group */
  removeMember: ({ id, userId }: { id: number; userId: number }) => apiClient.delete(`/messages/conversations/${id}/members/${userId}`),
  markRead: (id: number) => apiClient.post<null>(`/messages/conversations/${id}/read`),
  deleteMessage: ({ messageId }: { messageId: number }) => apiClient.delete(`/messages/messages/${messageId}`),
};
