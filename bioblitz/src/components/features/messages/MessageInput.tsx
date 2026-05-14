"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";
import { sendMessageBasic } from "@/lib/messages";

interface MessageInputProps {
  conversationId: string;
  senderId: string;
  recipientId: string;
}

const MAX_LENGTH = 1000;

export default function MessageInput({
  conversationId,
  senderId,
  recipientId,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = text.trim();
  const canSend =
    trimmed.length > 0 && trimmed.length <= MAX_LENGTH && !sending;
  const showCounter = text.length > MAX_LENGTH * 0.8;

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [text]);

  const handleSend = async () => {
    if (!canSend) return;
    setError(null);
    setSending(true);

    const textToSend = trimmed;
    setText(""); // Optimistic clear

    try {
      await sendMessageBasic({
        conversationId,
        senderId,
        recipientId,
        text: textToSend,
      });
    } catch (err) {
      console.error("Send failed:", err);
      setText(textToSend); // Restore on failure
      setError("Failed to send. Try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-3 py-3">
      {error && (
        <div className="mb-2 px-3 py-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
          {error}
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            disabled={sending}
            maxLength={MAX_LENGTH + 100} // Allow typing slightly over for visible feedback
            className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-2.5 pr-12 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors placeholder:text-neutral-500 resize-none disabled:opacity-60"
          />
          {showCounter && (
            <span
              className={`absolute right-3 bottom-2 text-[10px] tabular-nums pointer-events-none ${
                text.length > MAX_LENGTH ? "text-red-400" : "text-neutral-500"
              }`}
            >
              {MAX_LENGTH - text.length}
            </span>
          )}
        </div>
        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            canSend
              ? "bg-neutral-200 hover:bg-white text-neutral-900"
              : "bg-neutral-800 text-neutral-600 cursor-not-allowed"
          }`}
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
