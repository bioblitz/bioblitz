"use client";

import { useEffect, useState } from "react";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Trophy, Medal, Shield, Crown } from "lucide-react";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

interface LeaderboardUser {
  uid: string;
  displayName: string;
  photoURL: string;
  bElo: number;
  school?: string;
}

const LeaderboardPage = () => {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);

  const db = getFirestore(app);
  const auth = getAuth(app);

  useEffect(() => {
    // Set current user for highlighting
    if (auth.currentUser) {
      setCurrentUserUid(auth.currentUser.uid);
    }

    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        // Query: Get Users sorted by bElo descending, limit to top 50
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("bElo", "desc"), limit(50));

        const querySnapshot = await getDocs(q);
        const leaderboardData: LeaderboardUser[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Only include users who actually have an Elo rating
          if (typeof data.bElo === "number") {
            leaderboardData.push({
              uid: doc.id,
              displayName: data.displayName || "Anonymous User",
              photoURL: data.photoURL || "",
              bElo: data.bElo,
              school: data.school,
            });
          }
        });

        setUsers(leaderboardData);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [db, auth]);

  // Helper to get rank styles
  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return "border-yellow-500/50 bg-yellow-500/10 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]";
      case 1:
        return "border-zinc-400/50 bg-zinc-400/10 text-zinc-300";
      case 2:
        return "border-orange-700/50 bg-orange-700/10 text-orange-400";
      default:
        return "border-zinc-800 bg-zinc-900/50 text-zinc-400";
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500/20" />;
      case 1:
        return <Medal className="w-6 h-6 text-zinc-300" />;
      case 2:
        return <Medal className="w-6 h-6 text-orange-500" />;
      default:
        return (
          <span className="font-bold text-zinc-500 w-6 text-center">
            {index + 1}
          </span>
        );
    }
  };

  return (
    <main
      className={`${inter.className} min-h-screen bg-black text-white pt-24 px-4 pb-12`}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center p-3 bg-violet-500/10 rounded-full mb-4 ring-1 ring-violet-500/30"
          >
            <Trophy className="w-8 h-8 text-violet-400" />
          </motion.div>
          <h1 className="text-4xl font-bold mb-2 tracking-tight">
            Global Rankings
          </h1>
          <p className="text-zinc-400">The top minds competing for glory.</p>
        </div>

        {/* Leaderboard List */}
        <div className="space-y-3">
          {loading
            ? // Skeleton Loading State
              [...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-zinc-900/50 rounded-2xl animate-pulse border border-zinc-800"
                />
              ))
            : users.map((user, index) => (
                <motion.div
                  key={user.uid}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                  relative flex items-center p-4 rounded-2xl border transition-all duration-300
                  ${getRankStyle(index)}
                  ${
                    user.uid === currentUserUid
                      ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-black scale-[1.02]"
                      : "hover:border-zinc-700"
                  }
                `}
                >
                  {/* Rank Number/Icon */}
                  <div className="flex-shrink-0 w-12 flex justify-center items-center">
                    {getRankIcon(index)}
                  </div>

                  {/* Avatar */}
                  <div className="flex-shrink-0 mr-4">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-zinc-800"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-zinc-700">
                        <span className="text-lg font-bold text-zinc-500">
                          {user.displayName
                            ? user.displayName[0].toUpperCase()
                            : "?"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Name & School */}
                  <div className="flex-grow min-w-0">
                    <h3
                      className={`font-bold truncate ${
                        user.uid === currentUserUid
                          ? "text-violet-400"
                          : "text-white"
                      }`}
                    >
                      {user.displayName}
                      {user.uid === currentUserUid && " (You)"}
                    </h3>
                    {user.school && (
                      <p className="text-xs text-zinc-500 truncate">
                        {user.school}
                      </p>
                    )}
                  </div>

                  {/* Elo Score */}
                  <div className="flex-shrink-0 text-right pl-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Shield className="w-4 h-4 opacity-50" />
                      <span className="text-xl font-bold tracking-tighter">
                        {user.bElo}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                      Elo Rating
                    </span>
                  </div>

                  {/* Top 3 Glow Effect */}
                  {index < 3 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  )}
                </motion.div>
              ))}
        </div>

        {!loading && users.length === 0 && (
          <div className="text-center py-20 text-zinc-500">
            <p>No rankings available yet. Play a game to be the first!</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default LeaderboardPage;
