"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChatStore } from "@/lib/chatStore";
import { subscribeToConversations } from "@/lib/messages";

export default function ChatSubscriber() {
  const { user } = useAuth();
  const setConversations = useChatStore((s) => s.setConversations);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToConversations(user.uid, (convs) => {
      setConversations(convs);
    });

    return () => unsubscribe();
  }, [user?.uid, setConversations]);

  return null;
}
