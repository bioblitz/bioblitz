"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/lib/chatStore";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  otherUser: {
    displayName: string;
    photoURL?: string;
  } | null;
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function formatDayLabel(ms: number): string {
  const now = new Date();
  const date = new Date(ms);
  const diffDays = Math.floor(
    (now.setHours(0, 0, 0, 0) - new Date(ms).setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)
    return date.toLocaleDateString("en-US", { weekday: "long" });
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: now.getFullYear() === date.getFullYear() ? undefined : "numeric",
  });
}

export default function MessageList({
  messages,
  currentUserId,
  otherUser,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full px-6 py-12">
        <div className="text-center max-w-xs">
          <p className="text-sm text-neutral-400 mb-1">No messages yet</p>
          <p className="text-xs text-neutral-600 leading-relaxed">
            Say hi to {otherUser?.displayName || "your friend"} below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 flex flex-col gap-0.5">
      {messages.map((msg, i) => {
        const prev = i > 0 ? messages[i - 1] : null;
        const next = i < messages.length - 1 ? messages[i + 1] : null;

        const isMine = msg.senderId === currentUserId;
        const showDayLabel = !prev || !isSameDay(prev.createdAt, msg.createdAt);

        const groupedWithPrev =
          prev &&
          prev.senderId === msg.senderId &&
          msg.createdAt - prev.createdAt < 5 * 60 * 1000 &&
          isSameDay(prev.createdAt, msg.createdAt);

        const groupedWithNext =
          next &&
          next.senderId === msg.senderId &&
          next.createdAt - msg.createdAt < 5 * 60 * 1000 &&
          isSameDay(msg.createdAt, next.createdAt);

        return (
          <div key={msg.id}>
            {showDayLabel && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-neutral-800" />
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                  {formatDayLabel(msg.createdAt)}
                </span>
                <div className="flex-1 h-px bg-neutral-800" />
              </div>
            )}
            <MessageBubble
              message={msg}
              isMine={isMine}
              showAvatar={!isMine && !groupedWithNext}
              isGroupedStart={!groupedWithPrev}
              isGroupedEnd={!groupedWithNext}
              otherUser={otherUser}
            />
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
