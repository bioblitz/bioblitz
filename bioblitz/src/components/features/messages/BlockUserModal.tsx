//lots of vibes, functional but UI fix needed

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Ban, AlertTriangle, Loader2 } from "lucide-react";
import { blockUser } from "@/lib/messages";
import { removeFriendship } from "@/lib/friends";

interface BlockUserModalProps {
  blockerUid: string;
  blockedUid: string;
  blockedDisplayName: string;
  onClose: () => void;
}

export default function BlockUserModal({
  blockerUid,
  blockedUid,
  blockedDisplayName,
  onClose,
}: BlockUserModalProps) {
  const router = useRouter();
  const [alsoUnfriend, setAlsoUnfriend] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, submitting]);

  const handleBlock = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await blockUser(blockerUid, blockedUid);
      if (alsoUnfriend) {
        await removeFriendship(blockerUid, blockedUid);
      }
      router.push("/messages");
      onClose();
    } catch (err) {
      console.error("Block failed:", err);
      setError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-md mx-4 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-red-400" />
            <h2 className="text-base font-bold text-white">
              Block {blockedDisplayName}?
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-neutral-500 hover:text-white transition-colors p-1 -mr-1 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="text-sm text-neutral-300 leading-relaxed">
            Blocked users can&apos;t send you messages or see your profile in
            search. They won&apos;t be notified.
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={alsoUnfriend}
              onChange={(e) => setAlsoUnfriend(e.target.checked)}
              disabled={submitting}
              className="mt-0.5 w-4 h-4 accent-red-500 cursor-pointer"
            />
            <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">
              Also unfriend
            </span>
          </label>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-neutral-800">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleBlock}
            disabled={submitting}
            className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Blocking...
              </>
            ) : (
              "Block"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
