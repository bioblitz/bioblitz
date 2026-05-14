import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  writeBatch,
  increment,
} from "firebase/firestore";
import { firestore as db } from "@/lib/firebase";
import {
  Conversation,
  Message,
  MessageType,
  ChallengeMeta,
  makeConversationId,
} from "@/lib/chatStore";

function convertConversation(id: string, data: any): Conversation {
  return {
    id,
    participantIds: data.participantIds || [],
    lastMessageAt: (data.lastMessageAt as Timestamp)?.toMillis() ?? 0,
    lastMessagePreview: data.lastMessagePreview || "",
    lastMessageSenderId: data.lastMessageSenderId || "",
    lastMessageType: (data.lastMessageType || "text") as MessageType,
    unreadCounts: data.unreadCounts || {},
    createdAt: (data.createdAt as Timestamp)?.toMillis() ?? 0,
  };
}

function convertMessage(id: string, data: any): Message {
  return {
    id,
    senderId: data.senderId,
    text: data.text || "",
    type: (data.type || "text") as MessageType,
    createdAt: (data.createdAt as Timestamp)?.toMillis() ?? Date.now(),
    reactions: data.reactions || {},
    deletedAt: (data.deletedAt as Timestamp)?.toMillis(),
    deletedBy: data.deletedBy,
    challengeId: data.challengeId,
    challengeMeta: data.challengeMeta as ChallengeMeta | undefined,
  };
}

// ====================================================================
// Read operations
// ====================================================================

/**
 * One-time fetch of a single conversation by ID.
 * Returns null if it doesn't exist (e.g. first-time conversation, not yet created).
 */
export async function getConversation(
  conversationId: string,
): Promise<Conversation | null> {
  const snap = await getDoc(doc(db, "conversations", conversationId));
  if (!snap.exists()) return null;
  return convertConversation(snap.id, snap.data());
}

/**
 * Subscribe to a user's conversation list, sorted by most recent activity.
 * Returns an unsubscribe function.
 *
 * Limit: 20 most recent conversations. For users with more than 20 active
 * threads, the older ones aren't shown in the live inbox (cost optimization).
 */
export function subscribeToConversations(
  userId: string,
  onUpdate: (conversations: Conversation[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, "conversations"),
    where("participantIds", "array-contains", userId),
    orderBy("lastMessageAt", "desc"),
    limit(20),
  );

  return onSnapshot(
    q,
    (snap) => {
      const conversations = snap.docs.map((d) =>
        convertConversation(d.id, d.data()),
      );
      onUpdate(conversations);
    },
    (err) => {
      console.error("subscribeToConversations error:", err);
    },
  );
}

/**
 * Subscribe to messages in a single conversation.
 * Most recent 30 messages, ordered chronologically (oldest first for rendering).
 *
 * Returns an unsubscribe function.
 */
export function subscribeToMessages(
  conversationId: string,
  onUpdate: (messages: Message[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "desc"),
    limit(30),
  );

  return onSnapshot(
    q,
    (snap) => {
      // Reverse so oldest is first (natural chat order)
      const messages = snap.docs
        .map((d) => convertMessage(d.id, d.data()))
        .reverse();
      onUpdate(messages);
    },
    (err) => {
      console.error("subscribeToMessages error:", err);
    },
  );
}

/**
 * Fetch messages older than a given message (for scroll-up pagination).
 * Returns up to `limitCount` older messages, ordered oldest first.
 */
export async function fetchOlderMessages(
  conversationId: string,
  beforeCreatedAt: number,
  limitCount: number = 30,
): Promise<Message[]> {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    where("createdAt", "<", Timestamp.fromMillis(beforeCreatedAt)),
    orderBy("createdAt", "desc"),
    limit(limitCount),
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => convertMessage(d.id, d.data())).reverse();
}

// ====================================================================
// Write operations (stubs — full implementation in step 6)
// ====================================================================

/**
 * Mark a conversation as read for the current user.
 * Resets that user's unread counter to 0 in the conversation document.
 */
export async function markConversationRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  const ref = doc(db, "conversations", conversationId);
  await updateDoc(ref, {
    [`unreadCounts.${userId}`]: 0,
  });
}

// ====================================================================
// Helpers
// ====================================================================

/**
 * Truncate text for the lastMessagePreview field. Cuts at a word boundary
 * when possible, fallback to hard cut at maxLen.
 */
export function truncatePreview(text: string, maxLen: number = 80): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > maxLen * 0.6) {
    return cut.slice(0, lastSpace) + "…";
  }
  return cut + "…";
}

/**
 * Preview text for special message types.
 * Used when writing the lastMessagePreview field on the conversation doc.
 */
export function previewForMessage(
  message: Pick<Message, "type" | "text">,
): string {
  if (message.type === "challenge_sent") return "Sent you a challenge";
  if (message.type === "challenge_completed") return "Completed your challenge";
  return truncatePreview(message.text);
}

export { makeConversationId };

export async function sendMessageBasic(input: {
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
}): Promise<void> {
  const { conversationId, senderId, recipientId, text } = input;
  const trimmed = text.trim();
  if (!trimmed) throw new Error("empty");
  if (trimmed.length > 1000) throw new Error("too long");
  const convRef = doc(db, "conversations", conversationId);
  const messagesCol = collection(
    db,
    "conversations",
    conversationId,
    "messages",
  );

  // Check if conversation exists. If not, create it first (separate write —
  // batch can't conditionally create-or-update).
  const existing = await getDoc(convRef);
  if (!existing.exists()) {
    await setDoc(convRef, {
      participantIds: [senderId, recipientId].sort(),
      lastMessageAt: serverTimestamp(),
      lastMessagePreview: previewForMessage({ type: "text", text: trimmed }),
      lastMessageSenderId: senderId,
      lastMessageType: "text",
      unreadCounts: { [senderId]: 0, [recipientId]: 0 },
      createdAt: serverTimestamp(),
    });
  }
  const batch = writeBatch(db);
  const newMessageRef = doc(messagesCol);

  batch.set(newMessageRef, {
    senderId,
    text: trimmed,
    type: "text",
    createdAt: serverTimestamp(),
    reactions: {},
  });
  batch.update(convRef, {
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: previewForMessage({ type: "text", text: trimmed }),
    lastMessageSenderId: senderId,
    lastMessageType: "text",
    [`unreadCounts.${recipientId}`]: increment(1),
  });

  await batch.commit();
}
