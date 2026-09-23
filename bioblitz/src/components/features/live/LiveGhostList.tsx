"use client";

import { Ghost } from "lucide-react";
import { LivePlayer, formatLiveTime } from "@/lib/liveGame";
import LiveAvatar from "./LiveAvatar";

/**
 * Players who had already played the set. They answer along with everyone
 * else and keep their own score, but they hold no rank — so this is
 * deliberately a flat list, never a numbered one.
 */
export default function LiveGhostList({
  ghosts,
  questionsScored,
  highlightUid,
}: {
  ghosts: LivePlayer[];
  questionsScored: number;
  highlightUid?: string;
}) {
  if (ghosts.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Ghost className="w-4 h-4 text-neutral-600" />
        <h3 className="text-[13px] font-bold text-neutral-500">
          Playing along · not ranked
        </h3>
      </div>
      <ul className="space-y-2">
        {ghosts.map((ghost) => (
          <li
            key={ghost.uid}
            className={`flex items-center gap-4 px-4 py-2.5 rounded-xl border border-dashed ${
              ghost.uid === highlightUid
                ? "border-neutral-600 bg-neutral-800/30"
                : "border-neutral-800 bg-[rgba(24,24,27,0.3)]"
            }`}
          >
            <span className="w-10 shrink-0 text-center text-[14px] text-neutral-700">
              —
            </span>
            <LiveAvatar
              name={ghost.username}
              photoURL={ghost.photoURL}
              size={32}
              className="opacity-60"
            />
            <p className="flex-1 min-w-0 text-[14px] font-bold text-neutral-400 truncate">
              {ghost.username}
              {ghost.uid === highlightUid && (
                <span className="ml-2 text-[10px] font-bold text-neutral-500 tracking-wider">
                  you
                </span>
              )}
            </p>
            <p className="text-[13px] text-neutral-500 tabular-nums shrink-0">
              {ghost.correctCount}/{questionsScored} ·{" "}
              {formatLiveTime(ghost.totalMs)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
