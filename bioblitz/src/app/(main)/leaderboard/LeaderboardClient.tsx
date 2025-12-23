"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Trophy, Medal, Crown } from "lucide-react";
import { Inter } from "next/font/google";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

interface LeaderboardUser {
  uid: string;
  displayName: string;
  photoURL: string;
  bElo: number;
  school?: string;
  username: string;
}

export default function LeaderboardClient({ initialUsers }: { initialUsers: LeaderboardUser[] }) {
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setCurrentUserUid(user.uid);
      else setCurrentUserUid(null);
    });
    return () => unsubscribe();
  }, [auth]);

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return "border-yellow-500/50 bg-yellow-500/10 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]";
      case 1: return "border-zinc-400/50 bg-zinc-400/10 text-zinc-300";
      case 2: return "border-orange-700/50 bg-orange-700/10 text-orange-400";
      default: return "border-zinc-800 bg-zinc-900/50 text-zinc-400";
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500/20" />;
      case 1: return <Medal className="w-6 h-6 text-zinc-300" />;
      case 2: return <Medal className="w-6 h-6 text-orange-500" />;
      default: return <span className="font-bold text-zinc-500 w-6 text-center">{index + 1}</span>;
    }
  };

  const getEloColor = (elo: number) => {
    if (elo >= 1700) return "bg-violet-500/20 text-violet-400 border-violet-500/50";
    if (elo >= 1400) return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    if (elo >= 1100) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
    if (elo >= 800) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
    return "bg-zinc-800 text-zinc-400 border-zinc-700";
  };

  return (
    <main className={`${inter.className} min-h-screen bg-black text-white pt-24 px-4 pb-12`}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center p-3 bg-violet-500/10 rounded-full mb-4 ring-1 ring-violet-500/30"
          >
            <Trophy className="w-8 h-8 text-violet-400" />
          </motion.div>
          <h1 className="text-4xl font-bold mb-2 tracking-tight">Global Leaderboard</h1>
        </div>

        <div className="space-y-3">
          {initialUsers.map((user, index) => (
            <motion.div
              key={user.uid}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`
              relative flex items-center p-3 sm:p-4 rounded-2xl border transition-all duration-300
              ${getRankStyle(index)}
              ${user.uid === currentUserUid ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-black scale-[1.02]" : "hover:border-zinc-700"}
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
                <div className={`px-3 py-1.5 rounded-lg border font-mono font-bold text-sm sm:text-base tracking-tight ${getEloColor(user.bElo)}`}>
                  {user.bElo}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {initialUsers.length === 0 && (
          <div className="text-center py-20 text-zinc-500">
            <p>Error loading users ☹️</p>
          </div>
        )}
      </div>
    </main>
  );
}