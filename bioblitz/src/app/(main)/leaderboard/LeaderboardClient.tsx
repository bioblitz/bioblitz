"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Trophy, Medal, Crown, Flame, Zap } from "lucide-react";
import { Inter } from "next/font/google";
import Link from "next/link";
import type { LeaderboardUser } from "./page";

const inter = Inter({ subsets: ["latin"] });

export default function LeaderboardClient({ 
  initialEloUsers, 
  initialStreakUsers 
}: { 
  initialEloUsers: LeaderboardUser[], 
  initialStreakUsers: LeaderboardUser[] 
}) {
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"elo" | "streak">("elo");
  
  const auth = getAuth(app);
  const displayedUsers = activeTab === "elo" ? initialEloUsers : initialStreakUsers;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setCurrentUserUid(user.uid);
      else setCurrentUserUid(null);
    });
    return () => unsubscribe();
  }, [auth]);

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return "border-yellow-500/50 bg-yellow-500/10 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]";
      case 1: return "border-zinc-400/50 bg-zinc-400/10 text-zinc-300";
      case 2: return "border-orange-700/50 bg-orange-700/10 text-orange-400";
      default: return "border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:bg-zinc-900/50";
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500/20" />;
      case 1: return <Medal className="w-6 h-6 text-zinc-300" />;
      case 2: return <Medal className="w-6 h-6 text-orange-500" />;
      default: return <span className="font-bold text-zinc-500 w-6 text-center tabular-nums">{index + 1}</span>;
    }
  };

  const getEloColor = (elo: number) => {
    if (elo >= 1700) return "bg-violet-500/20 text-violet-400 border-violet-500/50";
    if (elo >= 1400) return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    if (elo >= 1100) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
    return "bg-zinc-800 text-zinc-400 border-zinc-700";
  };

  return (
    <main className={`${inter.className} min-h-screen bg-black text-white pt-24 px-4 pb-12`}>
      <div className="max-w-3xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`inline-flex items-center justify-center p-3 rounded-full mb-4 ring-1 transition-colors duration-300 ${
                activeTab === "elo" 
                ? "bg-violet-500/10 ring-violet-500/30 text-violet-400" 
                : "bg-orange-500/10 ring-orange-500/30 text-orange-400"
            }`}
          >
            {activeTab === "elo" ? <Trophy className="w-8 h-8" /> : <Flame className="w-8 h-8" />}
          </motion.div>
          <h1 className="text-4xl font-bold mb-2 tracking-tight">Global Leaderboard</h1>
          <p className="text-zinc-500">See who's dominating the biology world.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-8">
            <div className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-xl flex items-center gap-1">
                <button
                    onClick={() => setActiveTab("elo")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        activeTab === "elo" 
                        ? "bg-zinc-800 text-white shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                    <Zap className="w-4 h-4" />
                    Rating
                </button>
                <button
                    onClick={() => setActiveTab("streak")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        activeTab === "streak" 
                        ? "bg-orange-900/20 text-orange-400 border border-orange-500/10 shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                    <Flame className="w-4 h-4" />
                    Streak
                </button>
            </div>
        </div>

        {/* List Container - Fades in as a single unit */}
        <motion.div 
            key={activeTab} // Triggers fade when switching tabs
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 min-h-[500px]"
        >
            {displayedUsers.map((user, index) => (
                <div
                key={user.uid}
                // Standard div means no per-item animation
                className={`
                    relative flex items-center p-3 sm:p-4 rounded-2xl border transition-all duration-200
                    ${getRankStyle(index)}
                    ${user.uid === currentUserUid ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-black scale-[1.01]" : "hover:border-zinc-700"}
                `}
                >
                    <div className="flex-shrink-0 w-8 sm:w-12 flex justify-center items-center">
                        {getRankIcon(index)}
                    </div>

                    <div className="flex-shrink-0 mr-4 ml-2">
                        {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-zinc-800" referrerPolicy="no-referrer" />
                        ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-zinc-700">
                            <span className="text-lg font-bold text-zinc-500">{user.displayName ? user.displayName[0].toUpperCase() : "?"}</span>
                        </div>
                        )}
                    </div>

                    <div className="flex-grow min-w-0 pr-4">
                        <h3 className={`font-bold truncate text-sm sm:text-base ${user.uid === currentUserUid ? "text-violet-400" : "text-white"}`}>
                        <Link href={`/profile/${user.username}`}>
                            <span className="cursor-pointer hover:underline">{user.displayName}</span>
                        </Link>
                        </h3>
                        {user.school && <p className="text-xs text-zinc-500 truncate">{user.school}</p>}
                    </div>

                    <div className="flex-shrink-0">
                        {activeTab === "elo" ? (
                            <div className={`px-3 py-1.5 rounded-lg border font-mono font-bold text-sm sm:text-base tracking-tight ${getEloColor(user.bElo)}`}>
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
          <div className="text-center py-20 text-zinc-500">
            <p>No active users found for this category yet ☹️</p>
          </div>
        )}
      </div>
    </main>
  );
}