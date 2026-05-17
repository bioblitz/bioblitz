"use client";

import { Message } from "@/lib/chatStore";
import { Trophy } from "lucide-react";
import { useState } from "react";
import { Flag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ReportMessageModal from "./ReportMessageModal";
import ChallengeCard from "./ChallengeCard";
import { Trash2 } from "lucide-react";
import { softDeleteMessage } from "@/lib/messages";

interface MessageBubbleProps {
  message: Message;
  conversationId: string;
  isMine: boolean;
  showAvatar: boolean;
  isGroupedStart: boolean;
  isGroupedEnd: boolean;
  otherUser: {
    displayName: string;
    photoURL?: string;
  } | null;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MessageBubble({
  message,
  conversationId,
  isMine,
  showAvatar,
  isGroupedStart,
  isGroupedEnd,
  otherUser,
}: MessageBubbleProps) {
  const { user } = useAuth();
  const [showReportModal, setShowReportModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (message.deletedAt) {
    return (
      <div
        className={`flex ${isMine ? "justify-end" : "justify-start"} mt-0.5`}
      >
        <div className="px-3 py-1.5 text-xs italic text-neutral-600 max-w-[75%]">
          Message deleted
        </div>
      </div>
    );
  }

  if (
    message.type === "challenge_invite" ||
    message.type === "challenge_result"
  ) {
    return (
      <ChallengeCard
        message={message}
        currentUserId={user?.uid ?? ""}
        isMine={isMine}
      />
    );
  }

  const myRadius = isMine
    ? `rounded-2xl ${isGroupedStart ? "rounded-tr-2xl" : "rounded-tr-md"} ${
        isGroupedEnd ? "rounded-br-md" : "rounded-br-md"
      }`
    : `rounded-2xl ${isGroupedStart ? "rounded-tl-2xl" : "rounded-tl-md"} ${
        isGroupedEnd ? "rounded-bl-md" : "rounded-bl-md"
      }`;

  const handleDelete = async () => {
    if (!user || deleting) return;
    if (!confirm("Delete this message?")) return;
    setDeleting(true);
    try {
      await softDeleteMessage({
        conversationId,
        messageId: message.id,
        userId: user.uid,
      });
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Couldn't delete. Try again.");
      setDeleting(false);
    }
  };
  return (
    <div
      className={`group flex items-end gap-2 ${
        isMine ? "justify-end" : "justify-start"
      } ${isGroupedStart ? "mt-2" : "mt-0.5"}`}
    >
      {!isMine && (
        <div className="w-7 shrink-0">
          {showAvatar && (
            <>
              {otherUser?.photoURL ? (
                <img
                  src={otherUser.photoURL}
                  alt={otherUser.displayName}
                  className="w-7 h-7 rounded-full object-cover border border-neutral-800"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = "none";
                    target.nextElementSibling?.classList.remove("hidden");
                  }}
                />
              ) : null}
              <div
                className={`${
                  otherUser?.photoURL ? "hidden" : "flex"
                } w-7 h-7 rounded-full bg-neutral-800 items-center justify-center text-[10px] font-bold text-neutral-400`}
              >
                {(otherUser?.displayName || "?")[0].toUpperCase()}
              </div>
            </>
          )}
        </div>
      )}

      <div
        className={`relative max-w-[70%] px-3.5 py-2 ${myRadius} ${
          isMine
            ? "bg-neutral-200 text-neutral-900"
            : "bg-neutral-800 text-neutral-100"
        }`}
      >
        <p className="text-sm leading-snug whitespace-pre-wrap break-words">
          {message.text}
        </p>
        {!isMine && user && (
          <button
            onClick={() => setShowReportModal(true)}
            className="absolute -right-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-neutral-600 hover:text-orange-400"
            aria-label="Report message"
            title="Report message"
          >
            <Flag className="w-3 h-3" />
          </button>
        )}
        {isMine && user && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-neutral-600 hover:text-red-400 disabled:opacity-30"
            aria-label="Delete message"
            title="Delete message"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      <span
        className={`text-[10px] text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums shrink-0 ${
          isMine ? "order-first" : ""
        }`}
      >
        {formatTime(message.createdAt)}
      </span>

      {showReportModal && user && (
        <ReportMessageModal
          conversationId={conversationId}
          messageId={message.id}
          messageText={message.text}
          senderUid={message.senderId}
          reportedByUid={user.uid}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
