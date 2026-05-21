import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { User } from "firebase/auth";
import { Loader2, LayoutGrid, ShieldAlert, Info } from "lucide-react";
import { LeaderboardEntry } from "./types";
import { formatTimePlayed, formatQuestionTime } from "./utils";
import { getRatingTier } from "@/lib/rating";

import type { Variants } from "framer-motion";

interface ContestLeaderboardProps {
  loadingLeaderboard: boolean;
  leaderboard: LeaderboardEntry[];
  authResolved: boolean;
  user: User | null;
  isAdmin: boolean;
  setInspectEntry: (entry: LeaderboardEntry) => void;
  setEloPenalty: (penalty: number) => void;
  setEraseAttempt: (erase: boolean) => void;
}

const slideUp: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 80 },
  },
};

export default function ContestLeaderboard({
  loadingLeaderboard,
  leaderboard,
  authResolved,
  user,
  isAdmin,
  setInspectEntry,
  setEloPenalty,
  setEraseAttempt,
}: ContestLeaderboardProps) {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(
    new Set(),
  );

  const getRankIcon = (index: number) => {
    return (
      <span className="text-neutral-500 font-mono text-xs w-6 text-center">
        #{index + 1}
      </span>
    );
  };

  return (
    <motion.aside
      variants={slideUp}
      className="flex flex-[0.8] flex-col p-4 h-fit w-full lg:w-auto border-t border-neutral-800/60 lg:border-t-0 lg:border-l mt-4 lg:mt-0"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl lg:text-lg font-bold text-white">Leaderboard</h2>
      </div>

      {loadingLeaderboard ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 text-neutral-600 animate-spin" />
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-10 text-neutral-500 text-sm">
          No ranked plays yet.
        </div>
      ) : (
        <div className="pr-1 flex-1 space-y-2">
          {leaderboard.map((entry, index) => (
            <div
              key={index}
              className={`rounded-xl border transition-all overflow-hidden ${
                authResolved && user && entry.userId === user.uid
                  ? "bg-neutral-500/10 border-neutral-500/30"
                  : "bg-neutral-950/50 border-neutral-800 hover:border-neutral-700"
              }`}
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="w-5 flex justify-center">
                    {getRankIcon(index)}
                  </div>

                  {entry.photoURL ? (
                    <img
                      src={entry.photoURL}
                      alt={entry.username}
                      className="w-8 h-8 rounded-full border border-neutral-700 bg-neutral-900 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-neutral-500/20 border border-neutral-500/30 flex items-center justify-center text-xs font-bold text-neutral-300">
                      {entry.username[0]?.toUpperCase()}
                    </div>
                  )}

                  <div>
                    <div
                      className={`text-sm font-bold ${
                        authResolved && user && entry.userId === user.uid
                          ? "text-neutral-300"
                          : entry.bElo
                            ? getRatingTier(entry.bElo).textClass
                            : "text-neutral-200"
                      }`}
                    >
                      {entry.username ? (
                        <Link
                          href={`/profile/${entry.username}`}
                          className="hover:underline transition-colors"
                        >
                          {authResolved && user && entry.userId === user.uid
                            ? "You"
                            : entry.username}
                        </Link>
                      ) : (
                        <span>
                          {authResolved && user && entry.userId === user.uid
                            ? "You"
                            : "Unknown"}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-100 font-mono">
                      {formatTimePlayed(entry.timeTaken)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-sm tabular-nums">
                    {entry.correctCount}/{entry.totalQuestions}
                  </span>
                  <button
                    onClick={() =>
                      setExpandedEntries((prev) => {
                        const next = new Set(prev);
                        next.has(entry.submissionId)
                          ? next.delete(entry.submissionId)
                          : next.add(entry.submissionId);
                        return next;
                      })
                    }
                    className={`p-1.5 rounded-lg transition-colors ${
                      expandedEntries.has(entry.submissionId)
                        ? "text-yellow-300 bg-yellow-300/10"
                        : "text-neutral-100 hover:text-white hover:bg-neutral-800"
                    }`}
                    title="View question breakdown"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setInspectEntry(entry);
                        setEloPenalty(100);
                        setEraseAttempt(true);
                      }}
                      className="p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Inspect attempt"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {expandedEntries.has(entry.submissionId) && (
                <div className="px-4 pb-4 pt-1 border-t border-neutral-800/60">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {entry.questionResults ? (
                      entry.questionResults.map((correct, qi) => (
                        <div key={qi} className="relative group">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold ${
                              correct
                                ? "bg-green-300/15 border border-green-400/30 text-green-300"
                                : "bg-red-300/15 border border-red-400/30 text-red-300"
                            }`}
                          >
                            {qi + 1}
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-neutral-500 text-[11px]">
                        no breakdown data
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800/40">
                    <div className="flex items-center gap-1 text-neutral-100">
                      <Info className="w-3 h-3" />
                      <span className="text-[10px]">attempt stats</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        <span className="text-neutral-100">tab switches</span>
                        <span
                          className={`font-semibold ${entry.tabSwitchCount == null ? "text-neutral-500" : entry.tabSwitchCount > 3 ? "text-amber-400" : "text-neutral-100"}`}
                        >
                          {entry.tabSwitchCount == null
                            ? "N/A"
                            : entry.tabSwitchCount}
                        </span>
                      </div>
                      <div className="w-px h-3 bg-neutral-700" />
                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        <span className="text-neutral-100">time off tab</span>
                        <span
                          className={`font-semibold ${entry.timeOffTab == null ? "text-neutral-500" : entry.timeOffTab > 10 ? "text-amber-400" : "text-neutral-100"}`}
                        >
                          {entry.timeOffTab == null
                            ? "N/A"
                            : entry.timeOffTab >= 60
                              ? `${Math.floor(entry.timeOffTab / 60)}m ${entry.timeOffTab % 60}s`
                              : `${entry.timeOffTab}s`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.aside>
  );
}
