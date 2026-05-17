"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Loader2, MoreHorizontal } from "lucide-react";
import { sendMessage } from "@/lib/messages";
import { failureMessage, MAX_MESSAGE_LENGTH } from "@/lib/messageValidation";
import ChallengeFromConversationModal from "./ChallengeFromConversationModal";

interface MessageInputProps {
  conversationId: string;
  senderId: string;
  recipientId: string;
}

export default function MessageInput({
  conversationId,
  senderId,
  recipientId,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dotsOpen, setDotsOpen] = useState(false);
  const [challengeType, setChallengeType] = useState<"official" | "unofficial" | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);

  const trimmed = text.trim();
  const canSend =
    trimmed.length > 0 && trimmed.length <= MAX_MESSAGE_LENGTH && !sending;
  const showCounter = text.length > MAX_MESSAGE_LENGTH * 0.8;

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [text]);

  useEffect(() => {
    if (!dotsOpen) return;
    const handler = (e: MouseEvent) => {
      if (dotsRef.current && !dotsRef.current.contains(e.target as Node)) {
        setDotsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dotsOpen]);

  const handleSend = async () => {
    if (!canSend) return;
    setError(null);
    setSending(true);

    const textToSend = trimmed;

    try {
      const result = await sendMessage({
        conversationId,
        senderId,
        recipientId,
        text: textToSend,
      });

      if (!result.ok) {
        setError(failureMessage(result));
        return;
      }

      setText("");
    } catch (err: any) {
      if (err?.code === "permission-denied") {
        setError("You can't message this user. They may have unfriended you.");
      } else {
        console.error("Send failed:", err);
        setError("Failed to send. Try again.");
      }
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
        {/* Three-dots challenge menu */}
        <div ref={dotsRef} className="relative shrink-0 self-end pb-0.5">
          <button
            onClick={() => setDotsOpen((v) => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-800 text-neutral-500 hover:text-white transition-colors"
            aria-label="Challenge options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {dotsOpen && (
            <div className="absolute left-0 bottom-full mb-2 w-52 bg-neutral-950 border border-neutral-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in slide-in-from-bottom-1 fade-in duration-150">
              <button
                onClick={() => {
                  setChallengeType("official");
                  setDotsOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-neutral-300 hover:bg-neutral-900 hover:text-white transition-colors text-left"
              >
                Official challenge
              </button>
              <button
                onClick={() => {
                  setChallengeType("unofficial");
                  setDotsOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-neutral-300 hover:bg-neutral-900 hover:text-white transition-colors text-left"
              >
                Unofficial challenge
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            disabled={sending}
            maxLength={MAX_MESSAGE_LENGTH + 100} // Allow typing slightly over for visible feedback
            className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-2.5 pr-12 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors placeholder:text-neutral-500 resize-none disabled:opacity-60"
          />
          {showCounter && (
            <span
              className={`absolute right-3 bottom-2 text-[10px] tabular-nums pointer-events-none ${
                text.length > MAX_MESSAGE_LENGTH
                  ? "text-red-400"
                  : "text-neutral-500"
              }`}
            >
              {MAX_MESSAGE_LENGTH - text.length}
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

      {challengeType && (
        <ChallengeFromConversationModal
          senderId={senderId}
          recipientId={recipientId}
          challengeType={challengeType}
          onClose={() => setChallengeType(null)}
        />
      )}
    </div>
  );
}
