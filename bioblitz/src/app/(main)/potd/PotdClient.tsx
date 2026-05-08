"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Flame,
  CheckCircle2,
  XCircle,
  Search,
  Loader2,

  RotateCcw,
  Eye,
  ChevronRight,
} from "lucide-react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  arrayUnion,
  increment,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { DailyPuzzle } from "@/lib/potd";
import { createUserProfile } from "@/lib/user";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export default function PotdClient({
  initialPuzzles = [],
}: {
  initialPuzzles?: DailyPuzzle[];
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [topic, setTopic] = useState("All Topics");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"All" | "Completed" | "New">(
    "All"
  );
  const [activeTab, setActiveTab] = useState<"today" | "archive">("today");

  const [puzzles] = useState<DailyPuzzle[]>(initialPuzzles);

  const [userDataLoading, setUserDataLoading] = useState(true);

  const [playedGameIds, setPlayedGameIds] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);
  const [isStaffUser, setIsStaffUser] = useState(false);

  const [streak, setStreak] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [streakUpdated, setStreakUpdated] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [viewAnyway, setViewAnyway] = useState(false);

  const auth = getAuth(app);
  const db = getFirestore(app);

  useEffect(() => {
    setUserDataLoading(true);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchUserData(currentUser.uid).finally(() => {
          setUserDataLoading(false);
        });
      } else {
        setPlayedGameIds(new Set());
        setStreak(0);
        setUserDataLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserData = async (uid: string) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setStreak(data.streak || 0);
        const completedArr = data.completedPotdIds || [];
        setPlayedGameIds(new Set(completedArr));
        const roles = Array.isArray(data.roles)
          ? data.roles.map((role: unknown) => String(role).toLowerCase())
          : [];
        setIsStaffUser(roles.includes("admin") || roles.includes("staff"));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };


const handleSubmit = async (puzzle: DailyPuzzle) => {
    if (!user) {
      alert("Please sign in to submit answers.");
      return;
    }

    setSubmitting(true);

    const sortedSelected = [...selectedOptions].sort();
    const sortedCorrect = [...puzzle.correctAnswer].sort();
    const correct = JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect);
    
    setIsCorrect(correct);
    setPlayedGameIds((prev) => new Set(prev).add(puzzle.id));
    if (correct) { 

    }

    try {
      await createUserProfile(user);
      const userRef = doc(db, "users", user.uid);
      const setPlayedRef = doc(db, "users", user.uid, "setsPlayed", puzzle.id);
      
      await setDoc(setPlayedRef, {
        gameId: puzzle.id,
        timestamp: serverTimestamp(),
        correct: correct,
        answers: sortedSelected,
        puzzleDate: puzzle.date
      });

      await setDoc(
        userRef,
        {
          completedPotdIds: arrayUnion(puzzle.id),
        },
        { merge: true }
      );

      try {
        const activityRef = doc(db, "potdActivity", puzzle.id);
        const globalStatsRef = doc(db, "stats", "global");
        const globalUpdate: Record<string, any> = { potdAttempts: increment(1) };
        if (correct) globalUpdate.potdCorrect = increment(1);
        await Promise.all([
          setDoc(
            activityRef,
            {
              attempts: increment(1),
              correctCount: correct ? increment(1) : increment(0),
              answeredUserIds: arrayUnion(user.uid),
              ...(correct ? { correctUserIds: arrayUnion(user.uid) } : {}),
              lastPlayedAt: serverTimestamp(),
            },
            { merge: true }
          ),
          setDoc(globalStatsRef, globalUpdate, { merge: true }),
        ]);
      } catch (error) {
        console.warn("Failed to update POTD activity:", error);
      }

      setIsSubmitted(true);
      setViewAnyway(true);
    } catch (error) {
      console.error("Error updating stats:", error);
      alert("Error submitting. Check console.");
    } finally {
      setSubmitting(false);
    }
};

  const handleOptionClick = (key: string, isMulti: boolean) => {
    if (isSubmitted) return;

    if (isMulti) {
      if (selectedOptions.includes(key)) {
        setSelectedOptions((prev) => prev.filter((k) => k !== key));
      } else {
        setSelectedOptions((prev) => [...prev, key]);
      }
    } else {
      if (selectedOptions.includes(key)) {
        setSelectedOptions([]);
      } else {
        setSelectedOptions([key]);
      }
    }
  };

  const getTopicColors = (topic: string | undefined) => {
    switch (topic) {
      case "Anatomy & Physiology":
      case "Anat & Phys":
        return { bg: "bg-blue-500/10 text-blue-400 border-blue-500/20"};
      case "Cell Biology":
      case "Cell Bio":
        return { bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"};
      case "Plant Biology":
      case "Plant Bio":
        return { bg: "bg-green-500/10 text-green-400 border-green-500/20"};
      case "Genetics & Evolution":
      case "Gen & Evo":
      case "Genetics":
        return { bg: "bg-lime-500/10 text-lime-400 border-lime-500/20"};
      case "Biosystematics":
      case "Biosys":
        return { bg: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"};
      case "Ecology":
        return { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"};
      case "Ethology":
        return { bg: "bg-orange-500/10 text-orange-400 border-orange-500/20"};
      case "Multiple":
        return { bg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"};
      default:
        return { bg: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"};
    }
  };

  const isToday = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();

    const currentPstString = now.toLocaleDateString("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });

    const puzzleDateString = d.toLocaleDateString("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });

    return currentPstString === puzzleDateString;
  };

  const todaysPuzzle = puzzles.find((p) => isToday(p.date));
  const archivePuzzles = puzzles.filter((p) => !isToday(p.date));
  const prevPuzzle = useMemo(() => {
    if (archivePuzzles.length === 0) return null;
    return [...archivePuzzles].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  }, [archivePuzzles]);
  const todayFormatted = new Date().toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const fallbackPuzzle = useMemo(() => {
    if (archivePuzzles.length === 0) return null;
    const pstDate = new Date().toLocaleDateString("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const seed = pstDate.replaceAll("/", "");
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const index = hash % archivePuzzles.length;
    return archivePuzzles[index] || null;
  }, [archivePuzzles]);
  const activePuzzle = todaysPuzzle || fallbackPuzzle;
  const isFallback = !todaysPuzzle && !!fallbackPuzzle;
  const isTodayCompleted = todaysPuzzle
    ? playedGameIds.has(todaysPuzzle.id)
    : false;
  const isActiveCompleted = activePuzzle
    ? playedGameIds.has(activePuzzle.id)
    : false;
  const activeFilterCount =
    (statusFilter !== "All" ? 1 : 0) + (topic !== "All Topics" ? 1 : 0);

  const filteredArchive = archivePuzzles.filter((puzzle) => {
    const matchesSearch =
      puzzle.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      puzzle.questionText.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = topic === "All Topics" || puzzle.topic === topic;
    const isPlayed = playedGameIds.has(puzzle.id);

    let matchesStatus = true;
    if (statusFilter === "Completed") matchesStatus = isPlayed;
    if (statusFilter === "New") matchesStatus = !isPlayed;

    return matchesSearch && matchesTopic && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-neutral-900">
      <main className="max-w-7xl mx-auto pr-4 sm:pr-6 lg:pr-8 pl-16 pt-24 pb-12">
        <div className="flex flex-row items-end justify-between gap-6 mb-8">
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500/10 border border-orange-500/20 p-2 rounded-lg">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <h1 className="text-4xl font-bold text-white tracking-tight">
                Daily Problem
              </h1>
            </div>
            <div className="flex items-center gap-2 ml-1">
              <span className="text-neutral-500 text-sm">{todayFormatted}</span>
              {prevPuzzle && (
                <button
                  onClick={() => router.push(`/potd/${prevPuzzle.id}`)}
                  className="text-neutral-600 hover:text-neutral-300 transition-colors"
                  title="Previous problem"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          {isStaffUser && (
            <Link
              href="/potd/staff"
              className="text-sm text-neutral-300 border border-neutral-200 hover:bg-neutral-700 hover:text-neutral-400 px-3 py-1.5 rounded-full transition-colors"
            >
              Manage Queue
            </Link>
          )}
        </div>

        {userDataLoading ? (
          <div className="flex flex-col justify-center items-center py-32 space-y-4">
            <Loader2 className="w-10 h-10 text-neutral-500 animate-spin" />
            <p className="text-neutral-500 text-sm font-medium animate-pulse">
              Loading Your Progress...
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            <div className="flex items-center gap-0.5 p-[3px] border-b border-neutral-800 mb-8">
              {(["today", "archive"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-[10px] text-[13px] font-bold transition-all ${
                    activeTab === tab
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {tab === "today" ? "Today's Problem" : "Archive"}
                </button>
              ))}
            </div>

            {activeTab === "today" && <section className="relative">
              {activePuzzle ? (
                !isFallback && isTodayCompleted && !viewAnyway ? (
                  <div className="relative overflow-hidden rounded bg-neutral-900 backdrop-blur-sm p-12 text-center animate-in fade-in duration-500">

                    <div className="relative z-10 flex flex-col items-center">
                      <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                        Daily Problem Completed!
                      </h2>
                      <p className="text-neutral-400 text-lg max-w-xl mx-auto mb-8">
                        Great work! You've kept your streak alive today. Come
                        back tomorrow for a new challenge.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <button
                          onClick={() => setActiveTab("archive")}
                          className="bg-neutral-500/10 border border-neutral-500/50 text-neutral-200 hover:bg-neutral-500/20 hover:text-white px-8 py-3 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                        >
                          Practice Past Problems
                        </button>
                        <button
                          onClick={() => setViewAnyway(true)}
                          className="bg-neutral-900 border border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white px-6 py-3 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Eye className="w-5 h-5" />
                          View Problem Again
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-3xl bg-neutral-900 group text-center">

                    <div className="relative z-10 p-8 md:p-10 flex flex-col items-center">
                      {isFallback && (
                        <span className="mb-4 px-3 py-1 rounded-full text-xs font-medium bg-neutral-800 text-neutral-300">
                          Sampled from archive
                        </span>
                      )}
                      <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            getTopicColors(activePuzzle.topic).bg
                          }`}
                        >
                          {activePuzzle.topic}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 border border-neutral-800 bg-neutral-900 px-3 py-1 rounded-full">
                          {activePuzzle.multiSelect
                            ? "Multi-Select"
                            : "Single Choice"}
                        </span>
                      </div>

                      <div className="space-y-4 mb-8 max-w-4xl mx-auto">
                        <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
                          {activePuzzle.title}
                        </h2>
                        <p className="text-neutral-300 text-lg leading-relaxed">
                          {activePuzzle.questionText}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 w-full max-w-2xl mx-auto">
                        {activePuzzle.options.map((option) => {
                          const isSelected = selectedOptions.includes(
                            option.key
                          );
                          const isCorrectKey =
                            activePuzzle.correctAnswer.includes(option.key);

                          const showResults =
                            isSubmitted ||
                            ((viewAnyway || isFallback) && isActiveCompleted);

                          let borderClass =
                            "border-neutral-800 hover:border-neutral-700";
                          let bgClass = "bg-neutral-900/50 hover:bg-neutral-800";
                          let textClass = "text-neutral-300";

                          if (showResults) {
                            if (isCorrectKey) {
                              borderClass = "border-green-500/50";
                              bgClass = "bg-green-500/10";
                              textClass = "text-green-100";
                            } else if (isSelected && !isCorrectKey) {
                              borderClass = "border-red-500/50";
                              bgClass = "bg-red-500/10";
                              textClass = "text-red-100";
                            }
                          } else if (isSelected) {
                            borderClass = "border-neutral-500/50";
                            bgClass = "bg-neutral-500/10";
                            textClass = "text-neutral-100";
                          }

                          return (
                            <button
                              key={option.key}
                              disabled={showResults || submitting}
                              onClick={() =>
                                handleOptionClick(option.key, activePuzzle.multiSelect)
                              }
                              className={`
                                                        relative flex items-center justify-center w-full p-4 rounded-xl border transition-all duration-200
                                                        ${bgClass} ${borderClass}
                                                        
                                                    `}
                            >
                              <div
                                className={`
                                                        flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold mr-4 transition-colors flex-shrink-0
                                                        ${
                                                          isSelected ||
                                                          (showResults &&
                                                            isCorrectKey)
                                                            ? "bg-white/20 text-white"
                                                            : "bg-neutral-800 text-neutral-500"
                                                        }
                                                    `}
                              >
                                {option.key.toUpperCase()}
                              </div>

                              <span
                                className={`text-base text-center font-medium ${textClass}`}
                              >
                                {option.text}
                              </span>

                            </button>
                          );
                        })}
                      </div>

                      {(isSubmitted ||
                        ((viewAnyway || isFallback) && isActiveCompleted)) && (
                        <div className="w-full max-w-2xl mx-auto mt-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                          <div className="bg-neutral-900 rounded p-6 text-left">
                            <p className="text-neutral-400 text-sm mb-3">Explanation</p>
                            <p className="text-neutral-300 leading-relaxed">
                              {activePuzzle.explanation}
                            </p>
                          </div>
                        </div>
                      )}

                      {!isSubmitted &&
                        !((viewAnyway || isFallback) && isActiveCompleted) && (
                        <div className="mt-8 flex justify-center w-full border-t border-white/5 pt-6">
                          <button
                            disabled={
                              selectedOptions.length === 0 || submitting
                            }
                            onClick={() => handleSubmit(activePuzzle)}
                            className={`
                                                    px-12 py-3 rounded-xl font-bold text-base transition-all w-full md:w-auto flex items-center justify-center gap-2
                                                    ${
                                                      selectedOptions.length >
                                                        0 && !submitting
                                                        ? "bg-neutral-600 text-white hover:bg-neutral-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg shadow-neutral-900/20"
                                                        : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                                    }
                                                `}
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              "Submit Answer"
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              ) : (
                <div className="p-12 rounded-3xl bg-neutral-950/50 backdrop-blur-sm border border-neutral-800 text-center">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    No Problem for Today (Yet)
                  </h3>
                  <p className="text-neutral-400">
                    Check back later or browse the archive below!
                  </p>
                </div>
              )}
            </section>}

            {activeTab === "archive" && (
              <section className="pb-20">
                <div className="flex flex-col gap-6 mb-8">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search past questions..."
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-neutral-500/50 transition-all placeholder:text-neutral-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredArchive.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-neutral-500">
                      No past problems found.
                    </div>
                  ) : (
                    filteredArchive.map((puzzle) => {
                      const theme = getTopicColors(puzzle.topic);
                      const isPlayed = playedGameIds.has(puzzle.id);

                      return (
                        <Link
                          key={puzzle.id}
                          href={`/potd/${puzzle.id}`}
                          className="block group"
                        >
                          <div
                            className={`relative h-full flex flex-col justify-between bg-neutral-950/50 backdrop-blur-sm border border-neutral-800 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1`}
                          >
                            <div className="p-5">
                              <div className="flex justify-between items-start mb-3">
                                <span
                                  className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide shadow-sm ${theme.bg}`}
                                >
                                  {puzzle.topic || "General"}
                                </span>
                                {isPlayed && (
                                  <div className="flex items-center gap-1 bg-green-300/10 border border-green-300/20 text-green-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Completed</span>
                                  </div>
                                )}
                                {isPlayed && (
                                  <div
                                    title="Redo Problem"
                                    className="absolute top-5 right-5 text-neutral-600 group-hover:text-neutral-400 transition-colors"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                              <h2 className="text-lg font-bold text-white mb-2 line-clamp-2">
                                {puzzle.title}
                              </h2>
                              <p className="text-sm text-neutral-500 line-clamp-2 mb-3">
                                {puzzle.questionText}
                              </p>
                              <div className="flex items-center text-sm text-neutral-400 mt-auto">
                                <Calendar className="w-3 h-3 mr-2" />
                                <span className="truncate">
                                  {new Date(puzzle.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    }
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}