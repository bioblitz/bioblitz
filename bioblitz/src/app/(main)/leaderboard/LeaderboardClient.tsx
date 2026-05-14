"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Trophy, Flame, Zap } from "lucide-react";
import { Inter } from "next/font/google";
import Link from "next/link";
import type { LeaderboardUser } from "@/lib/leaderboard";
import { getRatingTier } from "@/lib/rating";

const inter = Inter({ subsets: ["latin"] });

export default function LeaderboardClient({
  initialEloUsers,
  initialStreakUsers,
}: {
  initialEloUsers: LeaderboardUser[];
  initialStreakUsers: LeaderboardUser[];
}) {
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"elo" | "streak">("elo");

  const auth = getAuth(app);
  const displayedUsers =
    activeTab === "elo" ? initialEloUsers : initialStreakUsers;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setCurrentUserUid(user.uid);
      else setCurrentUserUid(null);
    });
    return () => unsubscribe();
  }, [auth]);

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return "border-yellow-500/50 bg-yellow-500/10 text-yellow-500";
      case 1:
        return "border-neutral-400/50 bg-neutral-400/10 text-neutral-300";
      case 2:
        return "border-orange-700/50 bg-orange-700/10 text-orange-400";
      default:
        return "border-neutral-800 bg-neutral-900/30 text-neutral-400";
    }
  };

  const getRankIcon = (index: number) => {
    return (
      <span className="font-bold text-neutral-500 w-10 text-center tabular-nums text-lg">
        #{index + 1}
      </span>
    );
  };

  const getEloColor = (elo: number) => {
    const tier = getRatingTier(elo);
    return `${tier.bgClass} ${tier.textClass} ${tier.borderClass}`;
  };

  return (
    <main
      className={`${inter.className} min-h-screen bg-neutral-900 text-white pt-16 md:pt-24 px-7 md:pl-16 md:pr-4 pb-24 md:pb-12`}
    >
      {" "}
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-4 md:mb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`inline-flex items-center justify-center p-2 md:p-3 rounded-full mb-3 md:mb-4 ring-1 transition-colors duration-300 ${
              activeTab === "elo"
                ? "bg-neutral-500/10 ring-neutral-500/30 text-neutral-400"
                : "bg-orange-500/10 ring-orange-500/30 text-orange-400"
            }`}
          >
            {activeTab === "elo" ? (
              <Trophy className="w-6 h-6 md:w-8 md:h-8 text-[#FFD700]" />
            ) : (
              <Flame className="w-6 h-6 md:w-8 md:h-8" />
            )}
          </motion.div>
          <h1 className="text-2xl md:text-4xl font-bold text-neutral-100 mb-2 tracking-tight">
            Leaderboard
          </h1>
          <p className="text-sm md:text-base text-neutral-400">
            See who's dominating the biology world.
          </p>
        </div>

        <div className="flex justify-center mb-6 md:mb-8">
          <div className="bg-neutral-900/50 border border-neutral-800 p-1 rounded-xl flex items-center gap-1 w-full md:w-fit">
            <button
              onClick={() => setActiveTab("elo")}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === "elo"
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Zap className="w-4 h-4" />
              Rating
            </button>
            <button
              onClick={() => setActiveTab("streak")}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === "streak"
                  ? "bg-orange-500/15 text-orange-300 border border-orange-500/30 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Flame className="w-4 h-4" />
              Streak
            </button>
          </div>
        </div>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-3 min-h-[500px]"
        >
          {displayedUsers.map((user, index) => (
            <div
              key={user.uid}
              className={`
                    relative flex items-center p-3 sm:p-4 rounded-2xl border transition-all duration-200
                    ${getRankStyle(index)}
                    ${user.uid === currentUserUid ? "ring-2 ring-neutral-500 ring-offset-2 ring-offset-black scale-[1.01]" : "hover:border-neutral-700"}
                `}
            >
              <div className="flex-shrink-0 w-8 sm:w-12 flex justify-center items-center">
                {getRankIcon(index)}
              </div>

              <div className="flex-shrink-0 mr-4 ml-2">
                {user.photoURL ? (
                  <div className="relative w-10 h-10 sm:w-12 sm:h-12">
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-neutral-800"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.classList.remove(
                          "hidden",
                        );
                      }}
                    />
                    <div className="hidden absolute inset-0 rounded-full bg-neutral-800 flex items-center justify-center border-2 border-neutral-700">
                      <span className="text-lg font-bold text-neutral-500">
                        {user.username ? user.username[0].toUpperCase() : "?"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-neutral-800 flex items-center justify-center border-2 border-neutral-700">
                    <span className="text-lg font-bold text-neutral-500">
                      {user.username ? user.username[0].toUpperCase() : "?"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-grow min-w-0 pr-4">
                <h3 className="font-bold truncate text-sm sm:text-base">
                  {user.username ? (
                    <Link href={`/profile/${user.username}`}>
                      <span
                        className={`cursor-pointer hover:underline ${getRatingTier(user.bElo).textClass}`}
                      >
                        {user.username}
                      </span>
                    </Link>
                  ) : (
                    <span className={getRatingTier(user.bElo).textClass}>
                      Unknown
                    </span>
                  )}
                </h3>
                {user.school && (
                  <p className="text-xs text-neutral-500 truncate">
                    {user.school}
                  </p>
                )}
              </div>

              <div className="flex-shrink-0">
                {activeTab === "elo" ? (
                  <div
                    className={`px-3 py-1.5 rounded-lg border font-mono font-bold text-sm sm:text-base tracking-tight ${getEloColor(user.bElo)}`}
                  >
                    {user.bElo}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-400 font-mono font-bold text-sm sm:text-base tracking-tight">
                    <Flame className="w-4 h-4 fill-orange-500" />
                    {user.streak}
                  </div>
                )}
              </div>
            </div>
          ))}
        </motion.div>

        {displayedUsers.length === 0 && (
          <div className="text-center py-20 text-neutral-500">
            <p>No active users found for this category yet ☹️</p>
          </div>
        )}
      </div>
    </main>
  );
}
