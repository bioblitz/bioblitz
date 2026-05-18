"use client";

import { Message } from "@/lib/chatStore";
import { Trophy } from "lucide-react";
import { useState } from "react";
import { Flag } from "lucide-react";
import { useRef } from "react";

import { useAuth } from "@/context/AuthContext";
import ReportMessageModal from "./ReportMessageModal";
import ChallengeCard from "./ChallengeCard";
import { Trash2 } from "lucide-react";
import { softDeleteMessage } from "@/lib/messages";
import { SmilePlus } from "lucide-react";
import ReactionPicker from "./ReactionPicker";
import ReactionBadges from "./ReactionBadges";
import { toggleReaction, type ReactionEmoji } from "@/lib/messages";

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
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const smileyButtonRef = useRef<HTMLButtonElement>(null);

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

  const handleReact = async (emoji: ReactionEmoji) => {
    if (!user) return;
    try {
      await toggleReaction({
        conversationId,
        messageId: message.id,
        userId: user.uid,
        emoji,
      });
    } catch (err) {
      console.error("React failed:", err);
    }
  };

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
      {/* Avatar (only on other-user messages, last in group) */}
      {!isMine && (
        <div className="w-7 shrink-0">
          {showAvatar && (
            <>
              {otherUser?.photoURL ? (
                <img
                  src={otherUser.photoURL}
                  alt={otherUser.displayName}
                  className="w-7 h-7 rounded-full object-cover"
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

      {/* Bubble + badges column */}
      <div
        className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[70%]`}
      >
        <div className="relative">
          {/* Bubble */}
          <div
            className={`px-3.5 py-2 ${myRadius} ${
              isMine
                ? "bg-neutral-200 text-neutral-900"
                : "bg-neutral-800 text-neutral-100"
            }`}
          >
            <p className="text-sm leading-snug whitespace-pre-wrap break-words">
              {message.text}
            </p>
          </div>

          {/* Action buttons (react + flag/trash) — appear on hover */}
          {user && (
            <div
              className={`absolute ${
                isMine ? "right-full mr-1" : "left-full ml-1"
              } top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity`}
            >
              {!isMine && (
                <button
                  ref={smileyButtonRef}
                  onClick={() => setShowReactionPicker((v) => !v)}
                  className="p-1 text-neutral-600 hover:text-neutral-300 transition-colors"
                  aria-label="React"
                  title="React"
                >
                  <SmilePlus className="w-3.5 h-3.5" />
                </button>
              )}

              {!isMine && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="p-1 text-neutral-600 hover:text-red-400 transition-colors"
                  aria-label="Report"
                  title="Report"
                >
                  <Flag className="w-3 h-3" />
                </button>
              )}
              {isMine && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-1 text-neutral-600 hover:text-red-400 transition-colors disabled:opacity-30"
                  aria-label="Delete"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Reaction picker (when open) */}
          {showReactionPicker && (
            <ReactionPicker
              anchorEl={smileyButtonRef.current}
              onPick={handleReact}
              onClose={() => setShowReactionPicker(false)}
            />
          )}
        </div>

        {/* Reaction badges */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <ReactionBadges
            reactions={message.reactions}
            conversationId={conversationId}
            messageId={message.id}
            alignRight={isMine}
          />
        )}
      </div>

      {/* Report modal */}
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
