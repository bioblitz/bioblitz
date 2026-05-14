"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChatStore, isConversationCacheFresh } from "@/lib/chatStore";
import { subscribeToConversations } from "@/lib/messages";
import { MessageSquare, Plus } from "lucide-react";
import ConversationRow from "./ConversationRow";
import EmptyInbox from "./EmptyInbox";
import NewConversationModal from "./NewConversationModal";

interface InboxListProps {
  activeConversationId: string | null;
}

export default function InboxList({ activeConversationId }: InboxListProps) {
  const { user, loading: authLoading } = useAuth();
  const conversationOrder = useChatStore((s) => s.conversationOrder);
  const conversations = useChatStore((s) => s.conversations);
  const setConversations = useChatStore((s) => s.setConversations);

  const [isInitialLoad, setIsInitialLoad] = useState(
    !isConversationCacheFresh(),
  );
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToConversations(user.uid, (convs) => {
      setConversations(convs);
      setIsInitialLoad(false);
    });

    return () => unsubscribe();
  }, [user?.uid, setConversations]);

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
        Sign in to see messages
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-4 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-neutral-400" />
          <h2 className="text-sm font-bold text-white tracking-tight">
            Messages
          </h2>
          {conversationOrder.length > 0 && (
            <span className="text-[10px] font-bold text-neutral-500 tabular-nums">
              {conversationOrder.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="p-1.5 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
          aria-label="New conversation"
          title="New conversation"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent]">
        {isInitialLoad && conversationOrder.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
          </div>
        ) : conversationOrder.length === 0 ? (
          <EmptyInbox onNewMessage={() => setShowNewModal(true)} />
        ) : (
          <div className="py-1">
            {conversationOrder.map((id) => {
              const conv = conversations[id];
              if (!conv) return null;
              return (
                <ConversationRow
                  key={id}
                  conversation={conv}
                  currentUserId={user.uid}
                  isActive={id === activeConversationId}
                />
              );
            })}
          </div>
        )}
      </div>

      {showNewModal && (
        <NewConversationModal
          currentUserId={user.uid}
          onClose={() => setShowNewModal(false)}
        />
      )}
    </>
  );
}
