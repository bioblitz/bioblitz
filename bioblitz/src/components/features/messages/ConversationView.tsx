"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MoreVertical, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useChatStore, Message } from "@/lib/chatStore";
import {
  subscribeToMessages,
  markConversationRead,
  getConversation,
} from "@/lib/messages";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

interface ConversationViewProps {
  conversationId: string;
}

interface OtherUser {
  uid: string;
  displayName: string;
  username?: string;
  photoURL?: string;
}

const EMPTY_MESSAGES: Message[] = [];

export default function ConversationView({
  conversationId,
}: ConversationViewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const conversation = useChatStore((s) => s.conversations[conversationId]);
  const messages = useChatStore(
    (s) => s.messagesByConversationId[conversationId] ?? EMPTY_MESSAGES,
  );
  const setMessages = useChatStore((s) => s.setMessages);
  const markRead = useChatStore((s) => s.markConversationRead);
  const upsertConversation = useChatStore((s) => s.upsertConversation);

  const [other, setOther] = useState<OtherUser | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(messages.length === 0);
  const [conversationExists, setConversationExists] = useState<boolean | null>(
    conversation ? true : null,
  );
  const [recipientUid, setRecipientUid] = useState<string | null>(null);

  const [conversationInFirestore, setConversationInFirestore] =
    useState<boolean>(!!conversation);

  useEffect(() => {
    if (!user) return;

    const [a, b] = conversationId.split("_");
    const otherId = a === user.uid ? b : b === user.uid ? a : null;

    if (!otherId) {
      setConversationExists(false);
      return;
    }

    setRecipientUid(otherId);

    if (conversation) {
      setConversationExists(true);
      setConversationInFirestore(true);
      return;
    }

    getConversation(conversationId)
      .then((conv) => {
        if (conv) {
          upsertConversation(conv);
          setConversationInFirestore(true);
        } else {
          setConversationInFirestore(false);
        }
        setConversationExists(true);
      })
      .catch((err) => {
        console.error("Failed to load conversation:", err);
        setConversationInFirestore(false);
        setConversationExists(true);
      });
  }, [conversationId, conversation, user, upsertConversation]);

  useEffect(() => {
    if (!recipientUid) return;
    const db = getFirestore(app);
    getDoc(doc(db, "users", recipientUid))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setOther({
            uid: recipientUid,
            displayName: data.displayName || "User",
            username: data.username,
            photoURL: data.photoURL,
          });
        }
      })
      .catch((err) => console.error("Failed to load user info:", err));
  }, [recipientUid]);

  useEffect(() => {
    if (!user || !conversationInFirestore) {
      setLoadingMessages(false);
      return;
    }

    const unsubscribe = subscribeToMessages(conversationId, (msgs) => {
      setMessages(conversationId, msgs);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [conversationId, user, conversationInFirestore, setMessages]);

  useEffect(() => {
    if (!user || !conversation) return;
    const myUnread = conversation.unreadCounts[user.uid] || 0;
    if (myUnread > 0) {
      markRead(conversationId);
      markConversationRead(conversationId, user.uid).catch((err) =>
        console.error("Failed to mark read:", err),
      );
    }
  }, [user, conversation, conversationId, markRead]);

  if (!user) return null;

  if (conversationExists === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
      </div>
    );
  }

  const profileHref = other?.username
    ? `/profile/${other.username}`
    : other
      ? `/profile/${other.uid}`
      : "#";

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800 shrink-0">
        {/* Back button (mobile only) */}
        <button
          onClick={() => router.push("/messages")}
          className="md:hidden p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          aria-label="Back to inbox"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Avatar + name (clickable -> profile) */}
        <Link
          href={profileHref}
          className="flex items-center gap-3 flex-1 min-w-0 group"
        >
          <div className="relative w-9 h-9 shrink-0">
            {other?.photoURL ? (
              <img
                src={other.photoURL}
                alt={other.displayName}
                className="w-9 h-9 rounded-full object-cover border border-neutral-800"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  target.nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <div
              className={`${
                other?.photoURL ? "hidden" : "flex"
              } w-9 h-9 rounded-full bg-neutral-800 items-center justify-center text-xs font-bold text-neutral-400`}
            >
              {(other?.displayName || "?")[0].toUpperCase()}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate group-hover:underline">
              {other?.username || other?.displayName || "..."}
            </p>
            {other?.username && other.displayName !== other.username && (
              <p className="text-xs text-neutral-500 truncate">
                {other.displayName}
              </p>
            )}
          </div>
        </Link>

        {/* More menu (placeholder for step 7 — block/report) */}
        <button
          className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          aria-label="Conversation options"
          title="More options (coming soon)"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent]">
        {loadingMessages ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
          </div>
        ) : (
          <MessageList
            messages={messages}
            currentUserId={user.uid}
            otherUser={other}
          />
        )}
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-neutral-800 bg-neutral-900">
        {recipientUid ? (
          <MessageInput
            conversationId={conversationId}
            senderId={user.uid}
            recipientId={recipientUid}
          />
        ) : (
          <div className="px-4 py-3 text-xs text-neutral-500">Loading...</div>
        )}
      </div>
    </div>
  );
}
