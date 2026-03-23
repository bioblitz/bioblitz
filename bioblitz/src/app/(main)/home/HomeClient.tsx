"use client";

import Link from "next/link";
import { gameRoom } from "@/types";
import { getGamesPage } from "@/lib/gameRoomsAll";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import ContestCard from "@/components/features/contests/ContestCard";
import { X, Loader2 } from "lucide-react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { app } from "@/lib/firebase";

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

  const [pages, setPages] = useState<gameRoom[][]>([]);
  const [cursors, setCursors] = useState<
    (QueryDocumentSnapshot<DocumentData> | null)[]
  >([null]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingPage, setLoadingPage] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [playedGameIds, setPlayedGameIds] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);

  const auth = getAuth(app);
  const db = getFirestore(app);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchPlayedGames(currentUser.uid);
        currentUser.getIdTokenResult(true).then((result) => {
          const claims: any = result.claims || {};
          const roles = Array.isArray(claims.roles)
            ? claims.roles.map((r: any) => String(r).toLowerCase())
            : [];
          setIsAdmin(claims.admin === true || roles.includes("admin"));
        });
      } else {
        setPlayedGameIds(new Set());
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchPlayedGames = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      const ids: string[] = userDoc.data()?.playedGameIds ?? [];
      setPlayedGameIds(new Set(ids));
    } catch (error) {
      console.error("Error fetching played games:", error);
    }
  };

  const handleDeleteContest = async (gameId: string, title: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${title}"? This cannot be undone.`,
      )
    )
      return;
    if (!user) return;

    setDeletingId(gameId);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/contests", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gameId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPages((prev) =>
        prev.map((page) => page.filter((g) => g.id !== gameId)),
      );
    } catch (err: any) {
      alert(err?.message || "Failed to delete contest.");
    } finally {
      setDeletingId(null);
    }
  };
  const loadPage = async (pageIndex: number) => {
    if (pages[pageIndex]) {
      setCurrentPage(pageIndex);
      return;
    }
    setLoadingPage(true);
    const cursor = cursors[pageIndex] ?? null;
    const { games, lastSnap } = await getGamesPage(cursor);
    setPages((prev) => {
      const next = [...prev];
      next[pageIndex] = games;
      return next;
    });
    setCursors((prev) => {
      const next = [...prev];
      next[pageIndex + 1] = lastSnap;
      return next;
    });
    setHasMore(games.length === 20);
    setCurrentPage(pageIndex);
    setLoadingPage(false);
  };

  useEffect(() => {
    loadPage(0);
  }, []);

  const allGames = pages.flat();
  const filteredGames = useMemo(() => {
    return allGames.filter((game: gameRoom) => {
      const matchesSearch = game.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
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
  }, [allGames, searchQuery, topic, playedGameIds, statusFilter, typeFilter]);

  const loaderRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(loadingPage);
  loadingRef.current = loadingPage;

  const handleScroll = useCallback(() => {
    if (!loaderRef.current || loadingRef.current || !hasMore) return;
    const rect = loaderRef.current.getBoundingClientRect();
    if (rect.top < window.innerHeight + 200) {
      loadPage(pages.length);
    }
  }, [hasMore, loadPage, pages.length]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const getTopicColors = (topic: string | undefined) => {
    switch (topic) {
      case "Anatomy & Physiology":
      case "Anat & Phys":
        return {
          bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          shadow: "hover:shadow-blue-500/10 hover:border-blue-500/50",
          badge: "bg-blue-500 text-white",
        };
      case "Cell Biology":
      case "Cell Bio":
        return {
          bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
          shadow: "hover:shadow-cyan-500/10 hover:border-cyan-500/50",
          badge: "bg-cyan-500 text-white",
        };
      case "Plant Biology":
      case "Plant Bio":
        return {
          bg: "bg-green-500/10 text-green-400 border-green-500/20",
          shadow: "hover:shadow-green-500/10 hover:border-green-500/50",
          badge: "bg-green-600 text-white",
        };
      case "Genetics & Evolution":
      case "Gen & Evo":
      case "Genetics":
        return {
          bg: "bg-lime-500/10 text-lime-400 border-lime-500/20",
          shadow: "hover:shadow-lime-500/10 hover:border-lime-500/50",
          badge: "bg-lime-600 text-white",
        };
      case "Biosystematics":
      case "Biosys":
        return {
          bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
          shadow: "hover:shadow-indigo-500/10 hover:border-indigo-500/50",
          badge: "bg-indigo-600 text-white",
        };
      case "Ecology":
        return {
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          shadow: "hover:shadow-emerald-500/10 hover:border-emerald-500/50",
          badge: "bg-emerald-600 text-white",
        };
      case "Ethology":
        return {
          bg: "bg-orange-500/10 text-orange-400 border-orange-500/20",
          shadow: "hover:shadow-orange-500/10 hover:border-orange-500/50",
          badge: "bg-orange-600 text-white",
        };
      case "Multiple":
        return {
          bg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
          shadow: "hover:shadow-yellow-500/10 hover:border-yellow-500/50",
          badge: "bg-yellow-600 text-white",
        };
      default:
        return {
          bg: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
          shadow: "hover:shadow-neutral-500/10 hover:border-neutral-500/50",
          badge: "bg-neutral-600 text-white",
        };
    }
  };

  const activeFilterCount =
    (statusFilter !== "All" ? 1 : 0) +
    (typeFilter !== "All" ? 1 : 0) +
    (topic !== "All Topics" ? 1 : 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <main className="max-w-7xl mx-auto pr-4 sm:pr-6 lg:pr-8 pl-0 sm:pl-12 lg:pl-33.5 pt-24 pb-12">
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold text-white">Welcome back!</h1>
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
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteContest(game.id, game.title);
                    }}
                    disabled={deletingId === game.id}
                    className="absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-neutral-900/80 border border-neutral-700 text-neutral-500 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete contest"
                  >
                    {deletingId === game.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        <div ref={loaderRef} />
        {loadingPage && (
          <div className="flex justify-center mt-10">
            <div className="w-5 h-5 border-2 border-neutral-700 rounded-full animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}
