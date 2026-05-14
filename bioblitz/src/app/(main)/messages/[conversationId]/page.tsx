"use client";

import { useParams } from "next/navigation";
import ConversationView from "@/components/features/messages/ConversationView";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params?.conversationId as string;

  if (!conversationId) return null;

  return <ConversationView conversationId={conversationId} />;
}
