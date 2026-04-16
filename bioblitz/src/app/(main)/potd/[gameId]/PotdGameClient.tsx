"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Flame,
  Search,
  Loader2,
  Lightbulb,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { DailyPuzzle } from "@/lib/potd";
import { createUserProfile } from "@/lib/user";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const getTopicColors = (topic: string | undefined) => {
  switch (topic) {
    case "Anatomy & Physiology":
    case "Anat & Phys":
      return { bg: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    case "Cell Biology":
    case "Cell Bio":
      return { bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" };
    case "Plant Biology":
    case "Plant Bio":
      return { bg: "bg-green-500/10 text-green-400 border-green-500/20" };
    case "Genetics & Evolution":
    case "Gen & Evo":
    case "Genetics":
      return { bg: "bg-lime-500/10 text-lime-400 border-lime-500/20" };
    case "Biosystematics":
    case "Biosys":
      return { bg: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20" };
    case "Ecology":
      return { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    case "Ethology":
      return { bg: "bg-orange-500/10 text-orange-400 border-orange-500/20" };
    case "Multiple":
      return { bg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" };
    default:
      return { bg: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" };
  }
};

export default function PotdGameClient({
  puzzle,
  archivePuzzles = [],
}: {
  puzzle: DailyPuzzle;
  archivePuzzles: DailyPuzzle[];
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [playedGameIds, setPlayedGameIds] = useState<Set<string>>(new Set());
  const [isStaffUser, setIsStaffUser] = useState(false);

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<"problem" | "archive">("problem");
  const [searchQuery, setSearchQuery] = useState("");
  const [topic, setTopic] = useState("All Topics");
  const [statusFilter, setStatusFilter] = useState<"All" | "Completed" | "New">(
    "All",
  );

  const auth = getAuth(app);
  const db = getFirestore(app);

  const isToday = (dateString: string) => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    const pstDateString = now.toLocaleDateString("en-US", options);
    const [month, day, year] = pstDateString.split("/");
    const currentPST = `${year}-${month}-${day}`;
    return dateString === currentPST;
  };

  useEffect(() => {
    if (isToday(puzzle.date)) {
      router.replace("/potd");
    }
  }, [puzzle.date, router]);

  useEffect(() => {
    setLoadingUser(true);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("auth state:", currentUser?.uid, currentUser?.email);

      setUser(currentUser);
      if (currentUser) {
        fetchUserData(currentUser.uid).finally(() => setLoadingUser(false));
      } else {
        console.log("no user signed in");

        setPlayedGameIds(new Set());
        setLoadingUser(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserData = async (uid: string) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      console.log("userSnap exists:", userSnap.exists());

      if (userSnap.exists()) {
        const data = userSnap.data();
        const completedArr = data.completedPotdIds || [];
        console.log("completedPotdIds:", completedArr);
        console.log("puzzle.id:", puzzle.id);
        console.log("includes puzzle.id:", completedArr.includes(puzzle.id));

        const roles = Array.isArray(data.roles)
          ? data.roles.map((role: unknown) => String(role).toLowerCase())
          : [];
        setPlayedGameIds(new Set(completedArr));
        setIsCompleted(completedArr.includes(puzzle.id));
        setIsStaffUser(roles.includes("admin") || roles.includes("staff"));

        if (completedArr.includes(puzzle.id)) {
          const setPlayedRef = doc(db, "users", uid, "setsPlayed", puzzle.id);
          const setPlayedSnap = await getDoc(setPlayedRef);
          console.log("setPlayedSnap exists:", setPlayedSnap.exists());
          console.log("setPlayedSnap data:", setPlayedSnap.data());

          if (setPlayedSnap.exists()) {
            const playData = setPlayedSnap.data();
            setSelectedOptions(playData.answers || []);
            setIsCorrect(playData.correct ?? false);
            setIsSubmitted(true);
          }
        }
      }
    } catch (error) {
      console.error("Error checking status:", error);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      alert("Please sign in to submit answers.");
      return;
    }
    setSubmitting(true);

    const sortedSelected = [...selectedOptions].sort();
    const sortedCorrect = [...puzzle.correctAnswer].sort();
    const correct =
      JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect);
    setIsCorrect(correct);
    setPlayedGameIds((prev) => new Set(prev).add(puzzle.id));

    try {
      await createUserProfile(user);
      const userRef = doc(db, "users", user.uid);
      const setPlayedRef = doc(db, "users", user.uid, "setsPlayed", puzzle.id);

      await setDoc(setPlayedRef, {
        gameId: puzzle.id,
        timestamp: serverTimestamp(),
        puzzleDate: puzzle.date,
        correct,
        answers: sortedSelected,
      });

      await setDoc(
        userRef,
        { completedPotdIds: arrayUnion(puzzle.id) },
        { merge: true },
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
              lastPlayedAt: serverTimestamp(),
            },
            { merge: true },
          ),
          setDoc(globalStatsRef, globalUpdate, { merge: true }),
        ]);
      } catch (error) {
        console.warn("Failed to update POTD activity:", error);
      }

      setIsSubmitted(true);
      setIsCompleted(true);
    } catch (error) {
      console.error("Error submitting:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOptionClick = (key: string) => {
    if (isSubmitted) return;
    if (puzzle.multiSelect) {
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

  const sortedArchive = useMemo(
    () =>
      [...archivePuzzles].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    [archivePuzzles],
  );
  const currentIndex = sortedArchive.findIndex((p) => p.id === puzzle.id);
  const prevPuzzle = currentIndex > 0 ? sortedArchive[currentIndex - 1] : null;
  const nextPuzzleEntry =
    currentIndex < sortedArchive.length - 1
      ? sortedArchive[currentIndex + 1]
      : null;
  const nextIsToday = nextPuzzleEntry ? isToday(nextPuzzleEntry.date) : false;

  const filteredArchive = archivePuzzles.filter((p) => {
    if (p.id === puzzle.id) return false;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.questionText.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = topic === "All Topics" || p.topic === topic;
    const isPlayed = playedGameIds.has(p.id);
    let matchesStatus = true;
    if (statusFilter === "Completed") matchesStatus = isPlayed;
    if (statusFilter === "New") matchesStatus = !isPlayed;
    return matchesSearch && matchesTopic && matchesStatus;
  });

  const theme = getTopicColors(puzzle.topic);

  return (
    <div
      className={`${inter.className} min-h-screen bg-neutral-900 text-zinc-100 relative overflow-hidden`}
    >
      <div className="absolute top-0 left-0 w-full h-125 bg-neutral-900 pointer-events-none" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 relative z-10">
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
              {nextPuzzleEntry && (
                <button
                  onClick={() =>
                    nextIsToday
                      ? router.push("/potd")
                      : router.push(`/potd/${nextPuzzleEntry.id}`)
                  }
                  className="text-zinc-600 hover:text-zinc-300 transition-colors"
                  title="Newer problem"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <span className="text-zinc-500 text-sm">
                {new Date(puzzle.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              {prevPuzzle && (
                <button
                  onClick={() => router.push(`/potd/${prevPuzzle.id}`)}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors"
                  title="Older problem"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          {isStaffUser && (
            <Link
              href="/potd/staff"
              className="text-sm text-orange-300 border border-orange-500/40 hover:border-orange-300 hover:text-orange-200 px-3 py-1.5 rounded-full transition-colors"
            >
              Manage Queue
            </Link>
          )}
        </div>

        {loadingUser ? (
          <div className="flex flex-col justify-center items-center py-32 space-y-4">
            <Loader2 className="w-10 h-10 text-neutral-500 animate-spin" />
            <p className="text-zinc-500 text-sm font-medium animate-pulse">
              Loading Your Progress...
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            <div className="flex items-center gap-0.5 p-[3px] border-b border-zinc-800 mb-8">
              {(["problem", "archive"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-[10px] text-[13px] font-bold transition-all ${
                    activeTab === tab
                      ? "bg-zinc-800 text-white shadow-sm shadow-white/5"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab === "problem" ? "Daily Problem" : "Archive"}
                </button>
              ))}
            </div>

            {activeTab === "problem" && (
              <section className="relative">
                <div className="relative overflow-hidden rounded-3xl bg-neutral-900 group text-center">
                  <div className="relative z-10 p-8 md:p-10 flex flex-col items-center">
                    <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${theme.bg}`}
                      >
                        {puzzle.topic}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 border border-zinc-800 bg-zinc-900 px-3 py-1 rounded-full">
                        {puzzle.multiSelect ? "Multi-Select" : "Single Choice"}
                      </span>
                      {isCompleted && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed
                        </span>
                      )}
                    </div>

                    <div className="space-y-4 mb-8 max-w-4xl mx-auto">
                      <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
                        {puzzle.title}
                      </h2>
                      <p className="text-zinc-300 text-lg leading-relaxed">
                        {puzzle.questionText}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 w-full max-w-2xl mx-auto">
                      {puzzle.options.map((option) => {
                        const isSelected = selectedOptions.includes(option.key);
                        const isCorrectKey = puzzle.correctAnswer.includes(
                          option.key,
                        );
                        const showResults = isSubmitted;

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
                          borderClass = "border-neutral-500/50";
                          bgClass = "bg-neutral-500/10";
                          textClass = "text-neutral-100";
                        }

                        return (
                          <button
                            key={option.key}
                            disabled={showResults || submitting}
                            onClick={() => handleOptionClick(option.key)}
                            className={`
                              relative flex items-center justify-center w-full p-4 rounded-xl border transition-all duration-200
                              ${bgClass} ${borderClass}
                              ${isSelected && !showResults ? "shadow-[0_0_20px_rgba(139,92,246,0.15)]" : ""}
                            `}
                          >
                            <div
                              className={`
                                flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold mr-4 transition-colors flex-shrink-0
                                ${
                                  isSelected || (showResults && isCorrectKey)
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
                                <CheckCircle2 className="w-5 h-5 text-neutral-500" />
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

                    {isSubmitted && (
                      <div className="w-full max-w-2xl mx-auto mt-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                        <div className="bg-zinc-900 rounded p-6 text-left">
                          <div className="flex items-center gap-2 mb-3 text-zinc-400 text-sm font-bold uppercase tracking-wider">
                            <Lightbulb className="w-4 h-4 text-yellow-500" />
                            Explanation
                          </div>
                          <p className="text-zinc-300 leading-relaxed">
                            {puzzle.explanation}
                          </p>
                        </div>
                      </div>
                    )}

                    {!isSubmitted && (
                      <div className="mt-8 flex justify-center w-full border-t border-white/5 pt-6">
                        <button
                          disabled={selectedOptions.length === 0 || submitting}
                          onClick={handleSubmit}
                          className={`
                            px-12 py-3 rounded-xl font-bold text-base transition-all w-full md:w-auto flex items-center justify-center gap-2
                            ${
                              selectedOptions.length > 0 && !submitting
                                ? "bg-neutral-600 text-white hover:bg-neutral-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg shadow-neutral-900/20"
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
              </section>
            )}

            {activeTab === "archive" && (
              <section className="pb-20">
                <div className="flex flex-col gap-6 mb-8">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search past questions..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-neutral-500/50 transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredArchive.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-zinc-500">
                      No past problems found.
                    </div>
                  ) : (
                    filteredArchive.map((p) => {
                      const pTheme = getTopicColors(p.topic);
                      const isPlayed = playedGameIds.has(p.id);

                      return (
                        <a
                          key={p.id}
                          href={`/potd/${p.id}`}
                          className="block group"
                        >
                          <div className="relative h-full flex flex-col justify-between bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1">
                            <div className="p-5">
                              <div className="flex justify-between items-start mb-3">
                                <span
                                  className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide shadow-sm ${pTheme.bg}`}
                                >
                                  {p.topic || "General"}
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
                                    className="absolute top-5 right-5 text-zinc-600 group-hover:text-zinc-400 transition-colors"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                              <h2 className="text-lg font-bold text-white mb-2 line-clamp-2">
                                {p.title}
                              </h2>
                              <p className="text-sm text-zinc-500 line-clamp-2 mb-3">
                                {p.questionText}
                              </p>
                              <div className="flex items-center text-sm text-zinc-400 mt-auto">
                                <Calendar className="w-3 h-3 mr-2" />
                                <span className="truncate">
                                  {new Date(p.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    },
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </a>
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
