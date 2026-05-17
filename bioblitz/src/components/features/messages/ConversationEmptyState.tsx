"use client";

import { MessageSquare } from "lucide-react";

export default function ConversationEmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center px-8">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-neutral-800/60 flex items-center justify-center mb-5 mx-auto">
          <MessageSquare className="w-6 h-6 text-neutral-500" />
        </div>
        <h3 className="text-base font-bold text-neutral-200 mb-1">
          Your messages
        </h3>
        <p className="text-sm text-neutral-500 leading-relaxed">
          Select a conversation from the list, or message a friend from their
          profile to start a new one.
        </p>
      </div>
    </div>
  );
}
