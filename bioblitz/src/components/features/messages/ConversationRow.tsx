"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Trophy } from "lucide-react";
import { Conversation } from "@/lib/chatStore";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";

interface ConversationRowProps {
  conversation: Conversation;
  currentUserId: string;
  isActive: boolean;
}

interface OtherUserInfo {
  displayName: string;
  username?: string;
  photoURL?: string;
}

function formatRelativeTime(ms: number): string {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (sec < 60) return "now";
  if (min < 60) return `${min}m`;
  if (hr < 24) return `${hr}h`;
  if (day < 7) return `${day}d`;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function ConversationRow({
  conversation,
  currentUserId,
  isActive,
}: ConversationRowProps) {
  const otherUid = conversation.participantIds.find(
    (id) => id !== currentUserId,
  );
  const [other, setOther] = useState<OtherUserInfo | null>(null);
  const unread = conversation.unreadCounts[currentUserId] || 0;

  useEffect(() => {
    if (!otherUid) return;
    const db = getFirestore(app);
    getDoc(doc(db, "users", otherUid))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setOther({
            displayName: data.displayName || "User",
            username: data.username,
            photoURL: data.photoURL,
          });
        }
      })
      .catch((err) => console.error("Failed to load user info:", err));
  }, [otherUid]);

  const isChallengePreview =
    conversation.lastMessageType === "challenge_invite" ||
    conversation.lastMessageType === "challenge_result";
  const previewPrefix =
    conversation.lastMessageSenderId === currentUserId ? "You: " : "";

  return (
    <Link
      href={`/messages/${conversation.id}`}
      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
    >
      <div className="relative w-11 h-11 shrink-0">
        {other?.photoURL ? (
          <img
            src={other.photoURL}
            alt={other.displayName}
            className="w-11 h-11 rounded-full object-cover"
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
          } w-11 h-11 rounded-full bg-neutral-800 items-center justify-center text-sm font-bold text-neutral-400`}
        >
          {(other?.displayName || "?")[0].toUpperCase()}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={`text-sm truncate ${
              unread > 0
                ? "font-bold text-white"
                : "font-medium text-neutral-300"
            }`}
          >
            {other?.username || other?.displayName || "..."}
          </p>
          <span
            className={`text-[10px] tabular-nums shrink-0 ${
              unread > 0 ? "text-red-400 font-bold" : "text-neutral-600"
            }`}
          >
            {formatRelativeTime(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {isChallengePreview && (
            <Trophy className="w-3 h-3 text-red-400/80 shrink-0" />
          )}
          <p
            className={`text-xs truncate ${
              unread > 0 ? "text-neutral-300" : "text-neutral-500"
            }`}
          >
            {previewPrefix}
            {conversation.lastMessagePreview || "No messages yet"}
          </p>
        </div>
      </div>

      {unread > 0 && (
        <div className="shrink-0 min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500/90 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white tabular-nums">
            {unread > 99 ? "99+" : unread}
          </span>
        </div>
      )}
    </Link>
  );
}
