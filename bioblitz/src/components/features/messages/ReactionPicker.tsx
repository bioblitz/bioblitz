"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ALLOWED_REACTIONS, type ReactionEmoji } from "@/lib/messages";
import TwemojiText from "./TwemojiText";

interface ReactionPickerProps {
  anchorEl: HTMLElement | null;
  onPick: (emoji: ReactionEmoji) => void;
  onClose: () => void;
}

export default function ReactionPicker({
  anchorEl,
  onPick,
  onClose,
}: ReactionPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    setPos({
      top: rect.top - 50,
      left: rect.left + rect.width / 2,
    });
  }, [anchorEl]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorEl]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!mounted || !pos) return null;

  return createPortal(
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        transform: "translateX(-50%)",
        zIndex: 9999,
      }}
      className="flex items-center gap-1 px-2 py-1.5 bg-neutral-900 border border-neutral-800 rounded-full shadow-2xl animate-in fade-in zoom-in-95 duration-150"
    >
      {ALLOWED_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => {
            onPick(emoji);
            onClose();
          }}
          className="px-0.5 py-0.15 rounded-full hover:bg-white/[0.06] transition-all duration-150 hover:scale-125"
          aria-label={`React with ${emoji}`}
        >
          <TwemojiText className="text-lg leading-none">{emoji}</TwemojiText>
        </button>
      ))}
    </div>,
    document.body,
  );
}
