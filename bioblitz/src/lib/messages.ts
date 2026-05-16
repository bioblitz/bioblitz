import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  addDoc,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  serverTimestamp,
  deleteDoc,
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

import {
  validateMessageContent,
  type ValidationResult,
  RATE_LIMIT_PER_MINUTE,
  RATE_LIMIT_PER_DAY,
} from "@/lib/messageValidation";
import { useChatStore } from "@/lib/chatStore";

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

export async function getConversation(
  conversationId: string,
): Promise<Conversation | null> {
  const snap = await getDoc(doc(db, "conversations", conversationId));
  if (!snap.exists()) return null;
  return convertConversation(snap.id, snap.data());
}

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

export async function markConversationRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  const ref = doc(db, "conversations", conversationId);
  await updateDoc(ref, {
    [`unreadCounts.${userId}`]: 0,
  });
}

export function truncatePreview(text: string, maxLen: number = 80): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > maxLen * 0.6) {
    return cut.slice(0, lastSpace) + "…";
  }
  return cut + "…";
}

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

function checkRateLimit(): ValidationResult {
  const timestamps = useChatStore.getState().sendTimestamps;
  const now = Date.now();

  const oneMinAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const lastMinute = timestamps.filter((t) => t > oneMinAgo);
  if (lastMinute.length >= RATE_LIMIT_PER_MINUTE) {
    const oldest = Math.min(...lastMinute);
    return {
      ok: false,
      code: "rate_limit_minute",
      resetIn: 60 * 1000 - (now - oldest),
    };
  }

  const lastDay = timestamps.filter((t) => t > oneDayAgo);
  if (lastDay.length >= RATE_LIMIT_PER_DAY) {
    return {
      ok: false,
      code: "rate_limit_day",
      resetIn: 24 * 60 * 60 * 1000,
    };
  }

  return { ok: true };
}

export async function sendMessage(input: {
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
}): Promise<ValidationResult> {
  const contentResult = validateMessageContent(input.text);
  if (!contentResult.ok) return contentResult;

  const rateResult = checkRateLimit();
  if (!rateResult.ok) return rateResult;

  useChatStore.getState().recordSend();

  try {
    await sendMessageBasic(input);
    return { ok: true };
  } catch (err) {
    console.error("sendMessage Firestore write failed:", err);
    throw err;
  }
}

export async function blockUser(
  blockerUid: string,
  blockedUid: string,
): Promise<void> {
  const userRef = doc(db, "users", blockerUid);
  const snap = await getDoc(userRef);
  const current: string[] = snap.exists()
    ? snap.data().blockedUserIds || []
    : [];
  if (current.includes(blockedUid)) return; // already blocked
  await updateDoc(userRef, {
    blockedUserIds: [...current, blockedUid],
  });
}

export async function unblockUser(
  blockerUid: string,
  blockedUid: string,
): Promise<void> {
  const userRef = doc(db, "users", blockerUid);
  const snap = await getDoc(userRef);
  const current: string[] = snap.exists()
    ? snap.data().blockedUserIds || []
    : [];
  if (!current.includes(blockedUid)) return;
  await updateDoc(userRef, {
    blockedUserIds: current.filter((uid) => uid !== blockedUid),
  });
}

export async function isBlocked(
  blockerUid: string,
  potentiallyBlockedUid: string,
): Promise<boolean> {
  const snap = await getDoc(doc(db, "users", blockerUid));
  if (!snap.exists()) return false;
  const blocked: string[] = snap.data().blockedUserIds || [];
  return blocked.includes(potentiallyBlockedUid);
}

export async function reportMessage(input: {
  conversationId: string;
  messageId: string;
  messageText: string;
  senderUid: string;
  reportedByUid: string;
  reason: "harassment" | "spam" | "inappropriate" | "other";
  details?: string;
}): Promise<void> {
  await addDoc(collection(db, "messageReports"), {
    conversationId: input.conversationId,
    messageId: input.messageId,
    messageText: input.messageText,
    senderUid: input.senderUid,
    reportedByUid: input.reportedByUid,
    reason: input.reason,
    details: input.details ?? "",
    createdAt: serverTimestamp(),
    status: "pending",
  });
}
