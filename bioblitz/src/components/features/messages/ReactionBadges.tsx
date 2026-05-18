"use client";

import { useAuth } from "@/context/AuthContext";
import { toggleReaction, type ReactionEmoji } from "@/lib/messages";
import TwemojiText from "./TwemojiText";

interface ReactionBadgesProps {
  reactions: Record<string, string[]>;
  conversationId: string;
  messageId: string;
  alignRight: boolean;
}

export default function ReactionBadges({
  reactions,
  conversationId,
  messageId,
  alignRight,
}: ReactionBadgesProps) {
  const { user } = useAuth();

  const entries = Object.entries(reactions).filter(
    ([, uids]) => uids.length > 0,
  );
  if (entries.length === 0) return null;

  const handleToggle = async (emoji: string) => {
    if (!user) return;
    try {
      await toggleReaction({
        conversationId,
        messageId,
        userId: user.uid,
        emoji: emoji as ReactionEmoji,
      });
    } catch (err) {
      console.error("Reaction toggle failed:", err);
    }
  };

  return (
    <div
      className={`flex flex-wrap gap-1 mt-0.5 ${
        alignRight ? "justify-end" : "justify-start"
      }`}
    >
      {entries.map(([emoji, uids]) => {
        const iReacted = user ? uids.includes(user.uid) : false;
        return (
          <button
            key={emoji}
            onClick={() => handleToggle(emoji)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border transition-all duration-150 hover:scale-105 ${
              iReacted
                ? "bg-red-500/15 border-red-500/40 text-white"
                : "bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:border-neutral-700"
            }`}
          >
            <TwemojiText className="text-base leading-none">
              {emoji}
            </TwemojiText>{" "}
            <span className="text-[10px] font-bold tabular-nums">
              {uids.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}
