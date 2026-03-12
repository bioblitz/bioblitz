"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Calendar,
  Flame,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  ChevronUp,
  Search,
  ListChecks,
  History,
  Trophy,
  MousePointerClick,
  Loader2,
  Lightbulb,
  ArrowDown,
  RotateCcw,
  Eye,
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
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { DailyPuzzle } from "@/lib/potd";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [topic, setTopic] = useState("All Topics");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"All" | "Completed" | "New">(
    "All"
  );
  const [showArchive, setShowArchive] = useState(false);

  const [puzzles] = useState<DailyPuzzle[]>(initialPuzzles);

  const [userDataLoading, setUserDataLoading] = useState(true);

  const [playedGameIds, setPlayedGameIds] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);

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
    
    // Optimistic UI updates (Make it feel instant)
    setIsCorrect(correct);
    setPlayedGameIds((prev) => new Set(prev).add(puzzle.id));
    // Optionally assume streak increased for UI purposes (will be corrected on refresh)
    if (correct) { 
        // Logic to visually increment streak if you want
    }

    try {
      const setPlayedRef = doc(db, "users", user.uid, "setsPlayed", puzzle.id);
      
      // *** CRITICAL: You must include puzzleDate here ***
      await setDoc(setPlayedRef, {
        gameId: puzzle.id,
        timestamp: serverTimestamp(),
        correct: correct,
        answers: sortedSelected,
        puzzleDate: puzzle.date // <--- REQUIRED for index.ts to trigger
      });

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
      case "Animal":
        return {
          bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          shadow: "hover:shadow-blue-500/10 hover:border-blue-500/50",
        };
      case "Cell Bio":
        return {
          bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
          shadow: "hover:shadow-cyan-500/10 hover:border-cyan-500/50",
        };
      case "Biochem":
        return {
          bg: "bg-teal-500/10 text-teal-400 border-teal-500/20",
          shadow: "hover:shadow-teal-500/10 hover:border-teal-500/50",
        };
      case "Genetics":
        return {
          bg: "bg-lime-500/10 text-lime-400 border-lime-500/20",
          shadow: "hover:shadow-lime-500/10 hover:border-lime-500/50",
        };
      case "Plants":
        return {
          bg: "bg-green-500/10 text-green-400 border-green-500/20",
          shadow: "hover:shadow-green-500/10 hover:border-green-500/50",
        };
      default:
        return {
          bg: "bg-violet-500/10 text-violet-400 border-violet-500/20",
          shadow: "hover:shadow-violet-500/10 hover:border-violet-500/50",
        };
    }
  };

  const isToday = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();

    // 1. Get the current Calendar Date in Pacific Time
    const currentPstString = now.toLocaleDateString("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });

    // 2. Get the Puzzle's Calendar Date (using UTC to avoid timezone shifting)
    // We assume the puzzle date (e.g. "2025-01-10") represents the target day.
    const puzzleDateString = d.toLocaleDateString("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });

    // 3. Compare: This ensures the puzzle for "Jan 10" shows up exactly when it is "Jan 10" in PST.
    return currentPstString === puzzleDateString;
  };

  const todaysPuzzle = puzzles.find((p) => isToday(p.date));
  const archivePuzzles = puzzles.filter((p) => !isToday(p.date));
  const isTodayCompleted = todaysPuzzle
    ? playedGameIds.has(todaysPuzzle.id)
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
    <div
      className={`${inter.className} min-h-screen bg-black text-zinc-100 relative overflow-hidden`}
    >
      <div className="absolute top-0 left-0 w-full h-125 bg-violet-900/10 blur-[100px] pointer-events-none" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 relative z-10">
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
            <p className="text-zinc-500 ml-1">Keep your streak alive!</p>
          </div>
        </div>

        {userDataLoading ? (
          <div className="flex flex-col justify-center items-center py-32 space-y-4">
            <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
            <p className="text-zinc-500 text-sm font-medium animate-pulse">
              Loading Your Progress...
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            <section className="relative">
              {todaysPuzzle ? (
                isTodayCompleted && !viewAnyway ? (
                  <div className="relative overflow-hidden rounded-3xl bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 shadow-xl p-12 text-center animate-in fade-in duration-500">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/5 blur-[100px] rounded-full pointer-events-none -mr-20 -mt-20"></div>

                    <div className="relative z-10 flex flex-col items-center">
                      <div className="bg-green-500/20 p-4 rounded-full mb-6">
                        <Trophy className="w-10 h-10 text-green-500" />
                      </div>
                      <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                        Daily Problem Completed!
                      </h2>
                      <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-8">
                        Great work! You've kept your streak alive today. Come
                        back tomorrow for a new challenge.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <button
                          onClick={() => setShowArchive(true)}
                          className="bg-violet-500/10 border border-violet-500/50 text-violet-200 hover:bg-violet-500/20 hover:text-white px-8 py-3 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                        >
                          <History className="w-5 h-5" />
                          Practice Past Problems
                        </button>
                        <button
                          onClick={() => setViewAnyway(true)}
                          className="bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white px-6 py-3 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Eye className="w-5 h-5" />
                          View Problem Again
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-3xl bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 shadow-2xl group text-center">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/5 blur-[100px] rounded-full pointer-events-none -mr-20 -mt-20"></div>

                    <div className="relative z-10 p-8 md:p-10 flex flex-col items-center">
                      <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            getTopicColors(todaysPuzzle.topic).bg
                          }`}
                        >
                          {todaysPuzzle.topic}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 border border-zinc-800 bg-zinc-900 px-3 py-1 rounded-full">
                          {todaysPuzzle.multiSelect ? (
                            <ListChecks className="w-3 h-3" />
                          ) : (
                            <MousePointerClick className="w-3 h-3" />
                          )}
                          {todaysPuzzle.multiSelect
                            ? "Multi-Select"
                            : "Single Choice"}
                        </span>
                      </div>

                      <div className="space-y-4 mb-8 max-w-4xl mx-auto">
                        <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
                          {todaysPuzzle.title}
                        </h2>
                        <p className="text-zinc-300 text-lg leading-relaxed">
                          {todaysPuzzle.questionText}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 w-full max-w-2xl mx-auto">
                        {todaysPuzzle.options.map((option) => {
                          const isSelected = selectedOptions.includes(
                            option.key
                          );
                          const isCorrectKey =
                            todaysPuzzle.correctAnswer.includes(option.key);

                          const showResults =
                            isSubmitted || (viewAnyway && isTodayCompleted);

                          let borderClass =
                            "border-zinc-800 hover:border-zinc-700";
                          let bgClass = "bg-zinc-900/50 hover:bg-zinc-800";
                          let textClass = "text-zinc-300";

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
                            borderClass = "border-violet-500/50";
                            bgClass = "bg-violet-500/10";
                            textClass = "text-violet-100";
                          }

                          return (
                            <button
                              key={option.key}
                              disabled={showResults || submitting}
                              onClick={() =>
                                handleOptionClick(
                                  option.key,
                                  todaysPuzzle.multiSelect
                                )
                              }
                              className={`
                                                        relative flex items-center justify-center w-full p-4 rounded-xl border transition-all duration-200
                                                        ${bgClass} ${borderClass}
                                                        ${
                                                          isSelected &&
                                                          !showResults
                                                            ? "shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                                                            : ""
                                                        } 
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
                                                            : "bg-zinc-800 text-zinc-500"
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

                              <div className="absolute right-4 animate-in zoom-in duration-200">
                                {!showResults && isSelected && (
                                  <CheckCircle2 className="w-5 h-5 text-violet-500" />
                                )}
                                {showResults && isCorrectKey && (
                                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                                )}
                                {showResults && isSelected && !isCorrectKey && (
                                  <XCircle className="w-5 h-5 text-red-500" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {(isSubmitted || (viewAnyway && isTodayCompleted)) && (
                        <div className="w-full max-w-2xl mx-auto mt-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                          {isSubmitted && (
                            <div
                              className={`p-6 rounded-2xl border mb-6 flex flex-col items-center gap-3 ${
                                isCorrect
                                  ? "bg-green-500/10 border-green-500/20"
                                  : "bg-red-500/10 border-red-500/20"
                              }`}
                            >
                              {isCorrect ? (
                                <>
                                  <div className="bg-green-500/20 p-3 rounded-full">
                                    <Trophy className="w-8 h-8 text-green-500" />
                                  </div>
                                  <h3 className="text-xl font-bold text-green-400">
                                    Correct! Great Job!
                                  </h3>
                                 
                                </>
                              ) : (
                                <>
                                  <div className="bg-red-500/20 p-3 rounded-full">
                                    <XCircle className="w-8 h-8 text-red-500" />
                                  </div>
                                  <h3 className="text-xl font-bold text-red-400">
                                    Incorrect. Keep Learning!
                                  </h3>
                                </>
                              )}
                            </div>
                          )}

                          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left">
                            <div className="flex items-center gap-2 mb-3 text-zinc-400 text-sm font-bold uppercase tracking-wider">
                              <Lightbulb className="w-4 h-4 text-yellow-500" />
                              Explanation
                            </div>
                            <p className="text-zinc-300 leading-relaxed">
                              {todaysPuzzle.explanation}
                            </p>
                          </div>
                        </div>
                      )}

                      {!isSubmitted && !(viewAnyway && isTodayCompleted) && (
                        <div className="mt-8 flex justify-center w-full border-t border-white/5 pt-6">
                          <button
                            disabled={
                              selectedOptions.length === 0 || submitting
                            }
                            onClick={() => handleSubmit(todaysPuzzle)}
                            className={`
                                                    px-12 py-3 rounded-xl font-bold text-base transition-all w-full md:w-auto flex items-center justify-center gap-2
                                                    ${
                                                      selectedOptions.length >
                                                        0 && !submitting
                                                        ? "bg-violet-600 text-white hover:bg-violet-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg shadow-violet-900/20"
                                                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
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
                <div className="p-12 rounded-3xl bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 text-center">
                  <div className="bg-zinc-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-8 h-8 text-zinc-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    No Problem for Today (Yet)
                  </h3>
                  <p className="text-zinc-400">
                    Check back later or browse the archive below!
                  </p>
                </div>
              )}
            </section>

            <div className="flex flex-col items-center justify-center pt-8 pb-12 border-t border-white/5">
              <button
                onClick={() => setShowArchive(!showArchive)}
                className={`
                            flex items-center gap-2 px-6 py-3 rounded-full border text-sm font-medium transition-all duration-300
                            ${
                              showArchive
                                ? "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                                : "bg-transparent text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700 hover:bg-zinc-900"
                            }
                        `}
              >
                {showArchive ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide Past Problems
                  </>
                ) : (
                  <>
                    <History className="w-4 h-4" />
                    View Problem Archive
                    <ArrowDown className="w-4 h-4 ml-1 opacity-50" />
                  </>
                )}
              </button>
            </div>

            {showArchive && (
              <section className="animate-in slide-in-from-top-4 fade-in duration-300 pb-20">
                <div className="flex flex-col gap-6 mb-8">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search past questions..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-zinc-600"
                      />
                    </div>
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        showFilters || activeFilterCount > 0
                          ? "bg-zinc-800 text-white border-zinc-700"
                          : "bg-zinc-900 text-zinc-400 border-zinc-800"
                      }`}
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      Filters
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredArchive.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-zinc-500">
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
                            className={`relative h-full flex flex-col justify-between bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${theme.shadow}`}
                          >
                            <div className="p-5">
                              <div className="flex justify-between items-start mb-3">
                                <span
                                  className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide shadow-sm ${theme.bg}`}
                                >
                                  {puzzle.topic || "General"}
                                </span>
                                {isPlayed && (
                                  <div className="flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Completed</span>
                                  </div>
                                )}
                                {isPlayed && (
                                  <div
                                    title="Redo Problem"
                                    className="absolute top-5 right-5 text-zinc-600 group-hover:text-zinc-400 transition-colors"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                              <h2 className="text-lg font-bold text-white mb-2 line-clamp-2">
                                {puzzle.title}
                              </h2>
                              <p className="text-sm text-zinc-500 line-clamp-2 mb-3">
                                {puzzle.questionText}
                              </p>
                              <div className="flex items-center text-sm text-zinc-400 mt-auto">
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