"use client";

import { LiveStanding, formatLiveTime } from "@/lib/liveGame";
import LiveAvatar from "./LiveAvatar";

/** 2nd, 1st, 3rd — with the winner raised, the way a podium reads. */
const SLOTS = [
  { rank: 2, height: "h-24", medal: "🥈", ring: "ring-neutral-400/40", glow: "from-neutral-400/10" },
  { rank: 1, height: "h-36", medal: "🥇", ring: "ring-amber-400/50", glow: "from-amber-400/15" },
  { rank: 3, height: "h-16", medal: "🥉", ring: "ring-amber-700/40", glow: "from-amber-700/10" },
];

export default function LivePodium({
  standings,
  questionCount,
}: {
  standings: LiveStanding[];
  questionCount: number;
}) {
  const byRank = new Map(standings.map((s) => [s.rank, s]));
  const filled = SLOTS.filter((slot) => byRank.has(slot.rank));
  if (filled.length === 0) return null;

  return (
    <div className="flex items-end justify-center gap-3 md:gap-6">
      {filled.map((slot) => {
        const standing = byRank.get(slot.rank)!;
        return (
          <div key={slot.rank} className="flex flex-col items-center w-[30%] max-w-[200px]">
            <span className="text-[26px] md:text-[32px] leading-none mb-2">
              {slot.medal}
            </span>
            <LiveAvatar
              name={standing.username}
              photoURL={standing.photoURL}
              size={slot.rank === 1 ? 72 : 56}
              className={`ring-2 ${slot.ring} ring-offset-2 ring-offset-neutral-900`}
            />
            <p className="mt-3 text-[14px] md:text-[16px] font-bold text-white text-center truncate w-full px-1">
              {standing.username}
            </p>
            <p className="text-[12px] text-neutral-500 tabular-nums">
              {standing.correctCount}/{questionCount} · {formatLiveTime(standing.totalMs)}
            </p>
            <div
              className={`mt-3 w-full ${slot.height} rounded-t-2xl bg-gradient-to-b ${slot.glow} to-transparent border border-b-0 border-neutral-800 flex items-start justify-center pt-3`}
            >
              <span className="text-[28px] font-[900] text-neutral-700 leading-none">
                {slot.rank}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
