"use client";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/navigation";
import { MessagesWorkspace } from "../components/MessagesWorkspace";

/** Page: the open conversation lives in the URL (/messages/[conversationId]) so chats are linkable. */
export function MessagesPage() {
  const router = useRouter();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const id = Number(conversationId) || null;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Messages</h1>
      <MessagesWorkspace conversationId={id} onOpen={next => router.push(next ? `/messages/${next}` : "/messages")} />
    </div>
  );
}
