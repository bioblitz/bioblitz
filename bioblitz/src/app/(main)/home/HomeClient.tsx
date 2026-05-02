"use client";

import { gameRoom } from "@/types";
import { allGames } from "@/lib/gameRoomsAll";
import { useEffect, useState, useMemo, useCallback } from "react";
import ContestCard from "@/components/features/contests/ContestCard";
import {
  User,
  Filter,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import {
  getFirestore,
  doc,
  getDoc,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { rankGamesWithPersonalizedPageRank } from "@/lib/pagerank";

export default function HomeClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [topic, setTopic] = useState("All Topics");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"All" | "Completed" | "New">(
    "All",
  );
  const [typeFilter, setTypeFilter] = useState<
    "All" | "Official" | "Community"
  >("All");

  const [games, setGames] = useState<gameRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const [playedGameIds, setPlayedGameIds] = useState<Set<string>>(new Set());
  const [playedGamesLoaded, setPlayedGamesLoaded] = useState(false);
  const { user: authUser, loading: authLoading } = useAuth();

  const db = getFirestore(app);

  const topics = [
    { value: "All Topics", label: "All Topics" },
    { value: "Anatomy & Physiology", label: "Anatomy & Physiology" },
    { value: "Cell Biology", label: "Cell Biology" },
    { value: "Plant Biology", label: "Plant Biology" },
    { value: "Genetics & Evolution", label: "Gen & Evo" },
    { value: "Biosystematics", label: "Biosystematics" },
    { value: "Ecology", label: "Ecology" },
    { value: "Ethology", label: "Ethology" },
    { value: "Multiple", label: "Multiple" },
  ];

  const fetchPlayedGames = useCallback(async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      const ids: string[] = userDoc.data()?.playedGameIds ?? [];
      setPlayedGameIds(new Set(ids));
    } catch (error) {
      console.error("Error fetching played games:", error);
    } finally {
      setPlayedGamesLoaded(true);
    }
  }, [db]);

  useEffect(() => {
    if (authLoading) return;
    if (authUser?.uid) {
      fetchPlayedGames(authUser.uid);
    } else {
      setPlayedGamesLoaded(true);
    }
  }, [authLoading, authUser?.uid, fetchPlayedGames]);

  const loadAllGames = async () => {
    setLoading(true);
    try {
      const all = await allGames();
      setGames(all);
    } catch (error) {
      console.error("Error loading games:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllGames();
  }, []);

  const rankedGames = useMemo(() => {
    if (games.length === 0) return [];
    return rankGamesWithPersonalizedPageRank({
      games,
      playedGameIds,
    });
  }, [games, playedGameIds]);

  const filteredGames = useMemo(() => {
    const filtered = games.filter((game: gameRoom) => {
      const matchesSearch = game.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesTopic = topic === "All Topics" || game.topic === topic;
      const isPlayed = playedGameIds.has(game.id);

      let matchesStatus = true;
      if (statusFilter === "Completed") matchesStatus = isPlayed;
      if (statusFilter === "New") matchesStatus = !isPlayed;

      const hasSource = game.source;
      const hasCreator = game.creator;
      let matchesType = true;

      if (typeFilter === "Official") {
        matchesType = !!hasSource || !hasCreator;
      } else if (typeFilter === "Community") {
        matchesType = !!hasCreator && !hasSource;
      }

      return matchesSearch && matchesTopic && matchesStatus && matchesType;
    });

    const rankByGameId = new Map<string, number>();
    rankedGames.forEach((item, index) => {
      rankByGameId.set(item.game.id, index);
    });

    return [...filtered].sort((a, b) => {
      const aPlayed = playedGameIds.has(a.id);
      const bPlayed = playedGameIds.has(b.id);
      if (aPlayed !== bPlayed) return aPlayed ? 1 : -1;

      const aRank = rankByGameId.get(a.id);
      const bRank = rankByGameId.get(b.id);
      if (typeof aRank === "number" && typeof bRank === "number") {
        if (aRank !== bRank) return aRank - bRank;
      }

      const aScore = (a.trendingScore || 0) + (a.rating || 0);
      const bScore = (b.trendingScore || 0) + (b.rating || 0);
      if (bScore !== aScore) return bScore - aScore;

      return (b.rating || 0) - (a.rating || 0);
    });
  }, [games, rankedGames, searchQuery, topic, playedGameIds, statusFilter, typeFilter]);

  const activeFilterCount =
    (statusFilter !== "All" ? 1 : 0) +
    (typeFilter !== "All" ? 1 : 0) +
    (topic !== "All Topics" ? 1 : 0);

  return (
    <div className="min-h-screen bg-neutral-900">
      <main className="max-w-7xl mx-auto pr-4 sm:pr-6 lg:pr-8 pl-16 pt-24 pb-12">
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold text-neutral-300">Welcome back!</h1>
              <p className="text-neutral-400 mt-1">
                Select a Blitz to start competing
              </p>
            </div>

            <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative group flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-neutral-500 transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search titles..."
                  className="w-full sm:w-64 bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none transition-all placeholder:text-neutral-600"
                  suppressHydrationWarning
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`
                    flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all
                    ${
                      showFilters || activeFilterCount > 0
                        ? "bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700"
                        : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white"
                    }
                  `}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-neutral-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem]">
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

          {showFilters && (
            <div className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-5 space-y-6">
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3" /> Status
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(["All", "New", "Completed"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setStatusFilter(opt)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                            statusFilter === opt
                              ? "bg-neutral-800 text-white border-neutral-600"
                              : "bg-transparent text-neutral-500 border-neutral-800 hover:text-neutral-300 hover:border-neutral-700"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
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
                                ? "bg-neutral-800 text-white border-neutral-600"
                                : "bg-transparent text-neutral-500 border-neutral-800 hover:text-neutral-300 hover:border-neutral-700"
                            }`}
                          >
                            {opt}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-7 border-t md:border-t-0 md:border-l border-neutral-800 pt-6 md:pt-0 md:pl-8">
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                      <Filter className="w-3 h-3" /> Topics
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {topics.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setTopic(t.value)}
                          className={`
                                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border
                                  ${
                                    topic === t.value
                                      ? "bg-neutral-600/15 text-neutral-300 border-neutral-500/30"
                                      : "bg-transparent text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white"
                                  }
                                `}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {authLoading || loading || !playedGamesLoaded ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-10 h-10 border-[3px] border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
            <span className="text-neutral-400 text-sm font-medium">Loading...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGames.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-neutral-900/50 rounded-2xl border border-white/5">
                <Filter className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                <p className="text-neutral-400 text-lg">
                  No Blitzes found matching these filters.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setTopic("All Topics");
                    setStatusFilter("All");
                    setTypeFilter("All");
                  }}
                  className="mt-4 text-neutral-400 hover:text-neutral-500 font-medium transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              filteredGames.map((game: gameRoom) => (
                <div key={game.id} className="relative group">
                  <ContestCard
                    contest={game}
                    href={`/home/${game.id}`}
                    isCompleted={playedGameIds.has(game.id)}
                  />
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
