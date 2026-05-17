"use client";

import { MessageSquare, Plus } from "lucide-react";

interface EmptyInboxProps {
  onNewMessage: () => void;
}

export default function EmptyInbox({ onNewMessage }: EmptyInboxProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-neutral-800/60 flex items-center justify-center mb-4">
        <MessageSquare className="w-5 h-5 text-neutral-500" />
      </div>
      <h3 className="text-sm font-bold text-neutral-200 mb-1">
        No messages yet
      </h3>
      <p className="text-xs text-neutral-500 mb-5 max-w-[220px] leading-relaxed">
        Start a conversation with a friend to begin chatting.
      </p>
      <button
        onClick={onNewMessage}
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        New message
      </button>
    </div>
  );
}
