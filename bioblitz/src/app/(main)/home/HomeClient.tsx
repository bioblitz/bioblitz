"use client";

import Link from "next/link";
import { gameRoom } from "@/types";
import { allGames } from "@/lib/gameRoomsAll";
import { useEffect, useState, useMemo } from "react";
import ContestCard from "@/components/features/contests/ContestCard";
import {
  Clock,
  HelpCircle,
  User,
  Star,
  Filter,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { app } from "@/lib/firebase";

export default function HomeClient({
  initialGames,
}: {
  initialGames: gameRoom[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [topic, setTopic] = useState("All Topics");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"All" | "Completed" | "New">("All");
  const [typeFilter, setTypeFilter] = useState<"All" | "Official" | "Community">("All");

  // FIX 1: Removed `const [games, setGames]...` 
  // We use `initialGames` directly. This ensures that if Next.js revalidates 
  // the page on the server, the client immediately sees the new data.

  const [playedGameIds, setPlayedGameIds] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);

  const auth = getAuth(app);
  const db = getFirestore(app);

  const topics = [
    "All Topics",
    "Animal",
    "Cell Bio",
    "Biochem",
    "Genetics",
    "Plants",
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchPlayedGames(currentUser.uid);
      } else {
        setPlayedGameIds(new Set());
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchPlayedGames = async (uid: string) => {
    try {
      const userGamesRef = collection(db, "users", uid, "setsPlayed");
      const snapshot = await getDocs(userGamesRef);

      const playedIds = new Set(
        snapshot.docs
          .map((doc) => {
            const data = doc.data() as { gameId?: string };
            return data.gameId || doc.id;
          })
          .filter(Boolean) as string[]
      );

      setPlayedGameIds(playedIds);
    } catch (error) {
      console.error("Error fetching played games:", error);
    }
  };

  // FIX 2: Wrapped in useMemo to prevent expensive re-filtering on every minor render
  const filteredGames = useMemo(() => {
    return initialGames.filter((game) => {
      const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTopic = topic === "All Topics" || game.topic === topic;
      const isPlayed = playedGameIds.has(game.id);

      let matchesStatus = true;
      if (statusFilter === "Completed") matchesStatus = isPlayed;
      if (statusFilter === "New") matchesStatus = !isPlayed;

      const hasSource = (game as any).source;
      const hasCreator = game.creator;
      let matchesType = true;

      if (typeFilter === "Official") {
        matchesType = !!hasSource || !hasCreator;
      } else if (typeFilter === "Community") {
        matchesType = !!hasCreator && !hasSource;
      }

      return matchesSearch && matchesTopic && matchesStatus && matchesType;
    });
  }, [initialGames, searchQuery, topic, playedGameIds, statusFilter, typeFilter]);

  const getTopicColors = (topic: string | undefined) => {
    switch (topic) {
      case "Animal":
        return {
          bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          shadow: "hover:shadow-blue-500/10 hover:border-blue-500/50",
          badge: "bg-blue-500 text-white",
        };
      case "Cell Bio":
        return {
          bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
          shadow: "hover:shadow-cyan-500/10 hover:border-cyan-500/50",
          badge: "bg-cyan-500 text-white",
        };
      case "Biochem":
        return {
          bg: "bg-teal-500/10 text-teal-400 border-teal-500/20",
          shadow: "hover:shadow-teal-500/10 hover:border-teal-500/50",
          badge: "bg-teal-600 text-white",
        };
      case "Genetics":
        return {
          bg: "bg-lime-500/10 text-lime-400 border-lime-500/20",
          shadow: "hover:shadow-lime-500/10 hover:border-lime-500/50",
          badge: "bg-lime-600 text-white",
        };
      case "Plants":
        return {
          bg: "bg-green-500/10 text-green-400 border-green-500/20",
          shadow: "hover:shadow-green-500/10 hover:border-green-500/50",
          badge: "bg-green-600 text-white",
        };
      default:
        return {
          bg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
          shadow: "hover:shadow-yellow-500/10 hover:border-yellow-500/50",
          badge: "bg-yellow-600 text-white",
        };
    }
  };

  const activeFilterCount =
    (statusFilter !== "All" ? 1 : 0) +
    (typeFilter !== "All" ? 1 : 0) +
    (topic !== "All Topics" ? 1 : 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="flex flex-col gap-6 mb-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                Welcome back!
              </h1>
              <p className="text-zinc-400 mt-1">
                Select a Blitz to start competing
              </p>
            </div>

            <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative group flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search titles..."
                  className="w-full sm:w-64 bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder:text-zinc-600"
                  suppressHydrationWarning // Good use of suppression here
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`
                    flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all
                    ${
                      showFilters || activeFilterCount > 0
                        ? "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white"
                    }
                  `}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem]">
                    {activeFilterCount}
                  </span>
                )}
                {showFilters ? (
                  <ChevronUp className="w-3 h-3 ml-1" />
                ) : (
                  <ChevronDown className="w-3 h-3 ml-1" />
                )}
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-5 space-y-6">
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3" /> Status
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(["All", "New", "Completed"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setStatusFilter(opt)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                            statusFilter === opt
                              ? "bg-zinc-800 text-white border-zinc-600"
                              : "bg-transparent text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                      <User className="w-3 h-3" /> Type
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(["All", "Official", "Community"] as const).map(
                        (opt) => (
                          <button
                            key={opt}
                            onClick={() => setTypeFilter(opt)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                              typeFilter === opt
                                ? "bg-zinc-800 text-white border-zinc-600"
                                : "bg-transparent text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700"
                            }`}
                          >
                            {opt}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-7 border-t md:border-t-0 md:border-l border-zinc-800 pt-6 md:pt-0 md:pl-8">
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                      <Filter className="w-3 h-3" /> Topics
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {topics.map((t) => (
                        <button
                          key={t}
                          onClick={() => setTopic(t)}
                          className={`
                                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border
                                  ${
                                    topic === t
                                      ? "bg-violet-600/15 text-violet-300 border-violet-500/30"
                                      : "bg-transparent text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white"
                                  }
                                `}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredGames.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-zinc-900/50 rounded-2xl border border-white/5">
              <Filter className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 text-lg">
                No Blitzes found matching these filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setTopic("All Topics");
                  setStatusFilter("All");
                  setTypeFilter("All");
                }}
                className="mt-4 text-violet-400 hover:text-violet-500 font-medium transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            filteredGames.map((game) => (
              <ContestCard key={game.id} contest={game} href={`/home/${game.id}`} />
            ))
          )}
        </div>
      </main>
    </div>
  );
}