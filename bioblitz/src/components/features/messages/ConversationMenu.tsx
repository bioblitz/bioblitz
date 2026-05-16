//menu for each user to either block  or view profile

"use client";

import { useEffect, useRef } from "react";
import { UserMinus, Ban, ExternalLink } from "lucide-react";
import Link from "next/link";

interface ConversationMenuProps {
  otherUserId: string;
  otherUsername?: string;
  onClose: () => void;
  onBlock: () => void;
}

export default function ConversationMenu({
  otherUserId,
  otherUsername,
  onClose,
  onBlock,
}: ConversationMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const profileHref = otherUsername
    ? `/profile/${otherUsername}`
    : `/profile/${otherUserId}`;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 w-48 bg-neutral-950 border border-neutral-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in slide-in-from-top-1 fade-in duration-150"
    >
      <Link
        href={profileHref}
        onClick={onClose}
        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-neutral-300 hover:bg-neutral-900 hover:text-white transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        View profile
      </Link>
      <div className="h-px bg-neutral-800" />
      <button
        onClick={() => {
          onClose();
          onBlock();
        }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
      >
        <Ban className="w-3.5 h-3.5" />
        Block user
      </button>
    </div>
  );
}
