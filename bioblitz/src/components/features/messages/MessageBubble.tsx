"use client";

import { Message } from "@/lib/chatStore";
import { Trophy } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
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
  isMine,
  showAvatar,
  isGroupedStart,
  isGroupedEnd,
  otherUser,
}: MessageBubbleProps) {
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
    message.type === "challenge_sent" ||
    message.type === "challenge_completed"
  ) {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} mt-1`}>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 max-w-[75%]">
          <Trophy className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="text-xs text-orange-200">
            {message.type === "challenge_sent"
              ? "Sent a challenge"
              : "Completed a challenge"}
          </span>
        </div>
      </div>
    );
  }

  const myRadius = isMine
    ? `rounded-2xl ${isGroupedStart ? "rounded-tr-2xl" : "rounded-tr-md"} ${
        isGroupedEnd ? "rounded-br-md" : "rounded-br-md"
      }`
    : `rounded-2xl ${isGroupedStart ? "rounded-tl-2xl" : "rounded-tl-md"} ${
        isGroupedEnd ? "rounded-bl-md" : "rounded-bl-md"
      }`;

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
      </div>

      <span
        className={`text-[10px] text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums shrink-0 ${
          isMine ? "order-first" : ""
        }`}
      >
        {formatTime(message.createdAt)}
      </span>
    </div>
  );
}
