import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type MessageType = "text" | "challenge_sent" | "challenge_completed";

export interface ChallengeMeta {
  topic: string;
  questionCount: number;
  senderScore?: number;
  receiverScore?: number;
  eloDelta?: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  type: MessageType;
  createdAt: number; // stored as ms epoch (Firestore Timestamp converted)
  reactions: Record<string, string>;
  deletedAt?: number;
  deletedBy?: string;
  challengeId?: string;
  challengeMeta?: ChallengeMeta;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessageAt: number;
  lastMessagePreview: string;
  lastMessageSenderId: string;
  lastMessageType: MessageType;
  unreadCounts: Record<string, number>;
  createdAt: number;
}

interface ChatStore {
  currentUserId: string | null;

  conversations: Record<string, Conversation>;
  conversationOrder: string[]; // sorted by lastMessageAt desc
  conversationsLoadedAt: number | null;

  messagesByConversationId: Record<string, Message[]>;
  messagesLoadedAt: Record<string, number>;

  totalUnread: number;

  setCurrentUser: (userId: string | null) => void;

  setConversations: (convs: Conversation[]) => void;

  upsertConversation: (conv: Conversation) => void;

  setMessages: (conversationId: string, messages: Message[]) => void;

  appendMessage: (conversationId: string, message: Message) => void;

  updateMessage: (
    conversationId: string,
    messageId: string,
    patch: Partial<Message>,
  ) => void;

  markConversationRead: (conversationId: string) => void;

  clearAll: () => void;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

function recomputeTotalUnread(
  conversations: Record<string, Conversation>,
  currentUserId: string | null,
): number {
  if (!currentUserId) return 0;
  let total = 0;
  for (const conv of Object.values(conversations)) {
    total += conv.unreadCounts[currentUserId] || 0;
  }
  return total;
}

function recomputeOrder(conversations: Record<string, Conversation>): string[] {
  return Object.values(conversations)
    .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
    .map((c) => c.id);
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      currentUserId: null,
      conversations: {},
      conversationOrder: [],
      conversationsLoadedAt: null,
      messagesByConversationId: {},
      messagesLoadedAt: {},
      totalUnread: 0,

      setCurrentUser: (userId) => {
        const prev = get().currentUserId;
        if (prev !== userId) {
          set({
            currentUserId: userId,
            conversations: {},
            conversationOrder: [],
            conversationsLoadedAt: null,
            messagesByConversationId: {},
            messagesLoadedAt: {},
            totalUnread: 0,
          });
        }
      },

      setConversations: (convs) => {
        const map: Record<string, Conversation> = {};
        for (const c of convs) map[c.id] = c;
        set({
          conversations: map,
          conversationOrder: recomputeOrder(map),
          conversationsLoadedAt: Date.now(),
          totalUnread: recomputeTotalUnread(map, get().currentUserId),
        });
      },

      upsertConversation: (conv) => {
        const next = { ...get().conversations, [conv.id]: conv };
        set({
          conversations: next,
          conversationOrder: recomputeOrder(next),
          totalUnread: recomputeTotalUnread(next, get().currentUserId),
        });
      },

      setMessages: (conversationId, messages) => {
        set({
          messagesByConversationId: {
            ...get().messagesByConversationId,
            [conversationId]: messages,
          },
          messagesLoadedAt: {
            ...get().messagesLoadedAt,
            [conversationId]: Date.now(),
          },
        });
      },

      appendMessage: (conversationId, message) => {
        const existing = get().messagesByConversationId[conversationId] || [];
        // Skip if we already have this message ID (idempotent)
        if (existing.some((m) => m.id === message.id)) return;
        set({
          messagesByConversationId: {
            ...get().messagesByConversationId,
            [conversationId]: [...existing, message],
          },
        });
      },

      updateMessage: (conversationId, messageId, patch) => {
        const existing = get().messagesByConversationId[conversationId] || [];
        const next = existing.map((m) =>
          m.id === messageId ? { ...m, ...patch } : m,
        );
        set({
          messagesByConversationId: {
            ...get().messagesByConversationId,
            [conversationId]: next,
          },
        });
      },

      markConversationRead: (conversationId) => {
        const userId = get().currentUserId;
        if (!userId) return;
        const conv = get().conversations[conversationId];
        if (!conv) return;
        const updated: Conversation = {
          ...conv,
          unreadCounts: { ...conv.unreadCounts, [userId]: 0 },
        };
        const next = { ...get().conversations, [conversationId]: updated };
        set({
          conversations: next,
          totalUnread: recomputeTotalUnread(next, userId),
        });
      },

      clearAll: () => {
        set({
          currentUserId: null,
          conversations: {},
          conversationOrder: [],
          conversationsLoadedAt: null,
          messagesByConversationId: {},
          messagesLoadedAt: {},
          totalUnread: 0,
        });
      },
    }),
    {
      name: "bioblitz-chat-cache",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        conversations: state.conversations,
        conversationOrder: state.conversationOrder,
        conversationsLoadedAt: state.conversationsLoadedAt,
        totalUnread: state.totalUnread,
      }),
    },
  ),
);

export function isConversationCacheFresh(): boolean {
  const loadedAt = useChatStore.getState().conversationsLoadedAt;
  if (!loadedAt) return false;
  return Date.now() - loadedAt < CACHE_TTL_MS;
}

export function isMessagesCacheFresh(conversationId: string): boolean {
  const loadedAt = useChatStore.getState().messagesLoadedAt[conversationId];
  if (!loadedAt) return false;
  return Date.now() - loadedAt < CACHE_TTL_MS;
}

export function makeConversationId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("_");
}
