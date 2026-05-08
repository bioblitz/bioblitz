"use client";

import { useState, useEffect, useRef } from "react";
import { Star, Lock } from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { firestore, auth } from "@/lib/firebase";

interface GameRatingProps {
  gameId: string;
  hasPlayed: boolean;
  averageRating?: number;
  ratingCount?: number;
}

export default function GameRating({ gameId, hasPlayed, averageRating, ratingCount }: GameRatingProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userRating, setUserRating] = useState(0);
  const [pendingRating, setPendingRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(firestore, "user_ratings", `${gameId}_${user.uid}`)).then((snap) => {
      if (snap.exists()) {
        const score = snap.data().score;
        setUserRating(score);
        setPendingRating(score);
      }
    });
  }, [user, gameId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        badgeRef.current && !badgeRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSubmit = async () => {
    if (!user || !hasPlayed || pendingRating === 0) return;
    setSubmitting(true);
    try {
      await setDoc(doc(firestore, "user_ratings", `${gameId}_${user.uid}`), {
        userId: user.uid,
        gameId,
        score: pendingRating,
        updatedAt: serverTimestamp(),
      });
      setUserRating(pendingRating);
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = (averageRating ?? 0) > 0 ? (averageRating as number).toFixed(1) : "–";
  const hasUserRated = userRating > 0;

  return (
    <div className="relative">
      <button
        ref={badgeRef}
        onClick={() => setOpen((v) => !v)}
        title="Rate this blitz"
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition-all duration-150"
      >
        <Star
          className={`w-3.5 h-3.5 transition-colors duration-150 ${
            hasUserRated
              ? "fill-yellow-400 text-yellow-400"
              : "text-neutral-500 group-hover:text-yellow-400"
          }`}
        />
        <span
          className={`text-xs font-semibold tabular-nums transition-colors duration-150 ${
            hasUserRated ? "text-yellow-400" : "text-neutral-400 group-hover:text-neutral-200"
          }`}
        >
          {displayRating}
        </span>
      </button>

      {open && (
        <div
          ref={popupRef}
          className="absolute left-0 top-full mt-2 z-50 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
          style={{ width: 232 }}
        >
          {/* Stats row */}
          <div className="flex items-stretch divide-x divide-neutral-800 border-b border-neutral-800">
            <div className="flex-1 px-4 py-3">
              <p className="text-[22px] font-bold text-white leading-none">
                {ratingCount ?? 0}
              </p>
              <p className="text-[11px] text-neutral-500 mt-0.5">ratings</p>
            </div>
            {(averageRating ?? 0) > 0 && (
              <div className="flex-1 px-4 py-3">
                <p className="text-[22px] font-bold text-white leading-none">
                  {(averageRating as number).toFixed(1)}
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">average</p>
              </div>
            )}
          </div>

          {/* Picker */}
          <div className="px-4 py-3">
            {hasPlayed ? (
              <>
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isActive = star <= (hover || pendingRating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHover(star)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => setPendingRating(star)}
                        className="transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          className={`w-7 h-7 transition-all duration-100 ${
                            isActive
                              ? "fill-yellow-400 text-yellow-400"
                              : "fill-neutral-800 text-neutral-600"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || pendingRating === 0}
                  className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? "Submitting…"
                    : hasUserRated
                    ? "Update rating"
                    : "Submit rating"}
                </button>
              </>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                <Lock className="w-3 h-3 flex-shrink-0" />
                Play first to rate
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
