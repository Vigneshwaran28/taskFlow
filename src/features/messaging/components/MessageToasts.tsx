"use client";
// A quiet "New message from …" toast for live messages that arrive outside the open conversation.
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useToast } from "@/components/shared/Toaster";
import { useCurrentUser } from "@/features/auth";
import { useRealtimeEvent } from "@/realtime";
import { messagingKeys } from "../hooks/useMessaging";
import type { Conversation } from "../services/messagingService";

interface MessageCreated {
  conversationId: number;
  messageId: number;
  senderId?: number;
  senderName?: string;
}

/** Mounted once in the app shell (messaging tenants only). */
export function MessageToasts() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const { conversationId: openId } = useParams<{ conversationId?: string }>();

  useRealtimeEvent<MessageCreated>("message.created", ({ data }) => {
    // Never for your own messages (other tabs), nor for the chat already on screen.
    if (!user || data.senderId === user.id || Number(openId) === data.conversationId) return;
    const conversation = queryClient.getQueryData<Conversation[]>(messagingKeys.conversations)?.find(item => item.id === data.conversationId);
    const title = data.senderName ? `New message from ${data.senderName}` : "New message";
    toast.info(title, conversation?.type === "group" ? `In ${conversation.name}` : undefined);
  });

  return null;
}
