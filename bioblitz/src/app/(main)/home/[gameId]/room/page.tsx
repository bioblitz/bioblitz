"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { tryResolveChallenge } from "@/lib/challenges";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import BookmarkButton from "@/components/ui/BookmarkButton";
import ReportButton from "@/components/ui/ReportQuestionButton";

import Link from "next/link";
import {
  addDoc,
  onSnapshot,
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { firestore, auth } from "@/lib/firebase";
import { User } from "firebase/auth";
import {
  Loader2,
  AlertCircle,
  Crown,
  Medal,
  ChevronLeft,
  ChevronRight,
  Flag,
  ClipboardList,
  X,
} from "lucide-react";
import { getRatingTier } from "@/lib/rating";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const mono = jetbrainsMono.className;

const size = 220;
const strokeWidth = 20;
const radius = (size - strokeWidth) / 2;

type Question = {
  a: string;
  b: string;
  c: string;
  content: string;
  d?: string;
  e?: string;
  imgURL?: string;
};

type Tab = "result" | "leaderboard" | "home";

type GameResult = {
  score: number;
  correctCount: number;
  totalQuestions: number;
  correctAnswers: { [key: number]: string };
  ratingDelta: number | null;
  newElo: number | null;
};

type LeaderboardEntry = {
  userId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  timeTaken: number;
  username?: string;
  handle?: string;
  photoURL?: string;
  bElo?: number;
};

export default function GameRoomPage() {
  const { gameId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isRanked = searchParams.get("ranked") === "true";

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfileData, setUserProfileData] = useState({
    handle: "",
    photoURL: "",
    bElo: 500,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<{ [index: number]: string }>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [gameTitle, setGameTitle] = useState("");
  const [timeTotal, setTimeTotal] = useState(0);
  const [showTimeUpAlert, setShowTimeUpAlert] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("result");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<GameResult | null>(null);
  const [ratingTimedOut, setRatingTimedOut] = useState(false);
  const [isOwnBlitz, setIsOwnBlitz] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(
    new Set(),
  );
  const [showReviewPanel, setShowReviewPanel] = useState(false);

  const questionTimings = useRef<number[]>([]);
  const questionStartTime = useRef<number>(Date.now());
  const currentQuestionRef = useRef(0);

  const tabSwitchCount = useRef(0);
  const timeOffTab = useRef(0);
  const tabHiddenAt = useRef<number | null>(null);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  function flushCurrentTiming() {
    const elapsed = Date.now() - questionStartTime.current;
    questionTimings.current[currentQuestionRef.current] =
      (questionTimings.current[currentQuestionRef.current] ?? 0) + elapsed;
    questionStartTime.current = Date.now();
  }

  function goTo(idx: number) {
    flushCurrentTiming();
    setCurrentQuestion(idx);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (submitted) return;
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        if (currentQuestionRef.current < questions.length - 1) {
          flushCurrentTiming();
          setCurrentQuestion((p) => p + 1);
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        if (currentQuestionRef.current > 0) {
          flushCurrentTiming();
          setCurrentQuestion((p) => p - 1);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [submitted, questions.length]);

  // Tab visibility tracking
  useEffect(() => {
    if (submitted) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchCount.current += 1;
        tabHiddenAt.current = Date.now();
      } else if (tabHiddenAt.current !== null) {
        timeOffTab.current += Math.floor(
          (Date.now() - tabHiddenAt.current) / 1000,
        );
        tabHiddenAt.current = null;
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [submitted]);

  useEffect(() => {
    if (!finalResult || finalResult.ratingDelta != null) return;
    const t = setTimeout(() => {
      if (isMounted.current) setRatingTimedOut(true);
    }, 12000);
    return () => clearTimeout(t);
  }, [finalResult?.ratingDelta]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (isMounted.current) {
        setUser(currentUser);
        if (currentUser) {
          try {
            const userDocRef = doc(firestore, "users", currentUser.uid);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              const data = userSnap.data();
              setUserProfileData({
                handle: data.username || "",
                photoURL: data.photoURL || currentUser.photoURL || "",
                bElo: data.bElo || 500,
              });
            }
          } catch (e) {
            console.error("Error fetching user profile data", e);
          }
        }
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!gameId || authLoading) return;

    const loadGameData = async () => {
      setLoading(true);
      try {
        const gameDocRef = doc(firestore, "sets", gameId as string);
        const gameDocSnap = await getDoc(gameDocRef);
        if (!gameDocSnap.exists()) {
          alert("Blitz not found!");
          router.push("/home");
          return;
        }

        const data = gameDocSnap.data();
        if (isMounted.current) {
          setGameTitle(data.title || "Untitled Blitz");
          setTimeTotal(data.timeLimit);
          if (user && data.creator === user.uid) setIsOwnBlitz(true);

          if (user) {
            const key = `startTime-${user.uid}-${gameId}`;
            const savedStart = localStorage.getItem(key);
            if (savedStart) {
              const elapsed = Math.floor(
                (Date.now() - parseInt(savedStart)) / 1000,
              );
              setTimeLeft(Math.max(0, data.timeLimit - elapsed));
            } else {
              localStorage.setItem(key, Date.now().toString());
              setTimeLeft(data.timeLimit);
            }

            const answerKey = `answers-${user.uid}-${gameId}`;
            const savedAnswers = localStorage.getItem(answerKey);
            if (savedAnswers) {
              try {
                setUserAnswers(JSON.parse(savedAnswers));
              } catch (e) {
                console.error("Failed to parse saved answers", e);
              }
            }
          }
        }

        const functions = getFunctions();
        const getPublicQuestions = httpsCallable(
          functions,
          "getPublicQuestions",
        );
        const result = await getPublicQuestions({ gameId });
        const loadedQuestions = (result.data as { questions: Question[] })
          .questions;
        if (isMounted.current) {
          setQuestions(loadedQuestions);
          questionTimings.current = new Array(loadedQuestions.length).fill(0);
          questionStartTime.current = Date.now();
        }
      } catch (error) {
        console.error("Error loading Blitz data:", error);
        alert("Could not load the Blitz. Please try again later.");
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    loadGameData();
  }, [gameId, router, authLoading, user]);

  const handleSubmit = async (isAutoSubmit = false) => {
    if (submitted) return;

    if (!isAutoSubmit && Object.keys(userAnswers).length < questions.length) {
      alert("Please answer all questions before submitting.");
      return;
    }
    if (!user) {
      alert("You must be logged in to submit a score.");
      return;
    }

    flushCurrentTiming();

    setSubmitted(true);
    setActiveTab("result");
    window.scrollTo({ top: 0, behavior: "smooth" });

    const timeTaken = timeTotal - (timeLeft ?? 0);

    if (tabHiddenAt.current !== null) {
      timeOffTab.current += Math.floor(
        (Date.now() - tabHiddenAt.current) / 1000,
      );
      tabHiddenAt.current = null;
    }

    const commonData = {
      gameId,
      userId: user.uid,
      userAnswers,
      timeTaken,
      submittedAt: serverTimestamp(),
      status: "pending_grading",
      username: user.displayName || "Unknown",
      handle: userProfileData.handle,
      photoURL: userProfileData.photoURL,
      tabSwitchCount: tabSwitchCount.current,
      timeOffTab: timeOffTab.current,
      questionTimings: questionTimings.current,
    };

    try {
      let submissionRef;
      if (isRanked) {
        const rankedRef = doc(
          firestore,
          "gameSubmissions",
          `${user.uid}_${gameId}`,
        );
        await setDoc(rankedRef, { ...commonData, ranked: true });
        submissionRef = rankedRef;
      } else {
        submissionRef = await addDoc(collection(firestore, "gameSubmissions"), {
          ...commonData,
          ranked: false,
        });
      }
      if (isMounted.current) setSubmissionId(submissionRef.id);
      localStorage.removeItem(`startTime-${user.uid}-${gameId}`);
      localStorage.removeItem(`answers-${user.uid}-${gameId}`);
    } catch (error) {
      console.error("Error submitting Blitz:", error);
      alert("There was an error submitting your Blitz. Please try again.");
    }
  };

  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) {
      setShowTimeUpAlert(true);
      handleSubmit(true);
      return;
    }
    const interval = setInterval(
      () => setTimeLeft((p) => (p !== null ? p - 1 : null)),
      1000,
    );
    return () => clearInterval(interval);
  }, [timeLeft, submitted]);

  useEffect(() => {
    if (!submissionId) return;
    const unsub = onSnapshot(
      doc(firestore, "gameSubmissions", submissionId),
      (snap) => {
        const data = snap.data();
        if (data?.score !== undefined) {
          if (isMounted.current) {
            setFinalResult({
              score: data.score,
              correctCount: data.correctCount,
              totalQuestions: data.totalQuestions,
              correctAnswers: data.correctAnswers,
              ratingDelta: data.ratingDelta ?? null,
              newElo: data.newElo ?? null,
            });
          }
          tryResolveChallenge({
            blitzId: gameId as string,
            userId: user?.uid ?? "",
            score: data.score,
            timeTaken: timeTotal - (timeLeft ?? 0),
          }).catch(() => {});
        }
      },
    );
    return () => unsub();
  }, [submissionId]);

  const handleAnswer = (idx: number, choice: string) => {
    if (submitted) return;
    setUserAnswers((prev) => ({ ...prev, [idx]: choice }));
  };

  const toggleFlag = (idx: number) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const formatTime = (totalSeconds: number | null) => {
    if (totalSeconds === null) return "0 mins 0 secs";
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m} min${m !== 1 ? "s" : ""} ${s} sec${s !== 1 ? "s" : ""}`;
  };

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    if (!finalResult || !user) return;
    const myCorrect = finalResult.correctCount;
    const myTimeTaken = timeTotal - (timeLeft ?? 0);

    const fetchLeaderboard = async () => {
      setLoadingLeaderboard(true);
      try {
        const q = query(
          collection(firestore, "gameSubmissions"),
          where("gameId", "==", gameId),
          where("ranked", "==", true),
          orderBy("score", "desc"),
          orderBy("timeTaken", "asc"),
          orderBy("submittedAt", "asc"),
          limit(200),
        );
        const snapshot = await getDocs(q);
        const firstByUser: { [userId: string]: any } = {};
        snapshot.docs.forEach((d) => {
          const data = d.data();
          if (!firstByUser[data.userId]) firstByUser[data.userId] = data;
        });
        const sorted = (Object.values(firstByUser) as LeaderboardEntry[]).sort(
          (a, b) =>
            b.correctCount - a.correctCount || a.timeTaken - b.timeTaken,
        );
        setLeaderboard(sorted);
        const rank = sorted.findIndex((e) => e.userId === user.uid);
        if (rank !== -1) {
          setUserRank(rank + 1);
        } else {
          const better = sorted.filter(
            (e) =>
              e.correctCount > myCorrect ||
              (e.correctCount === myCorrect && e.timeTaken < myTimeTaken),
          ).length;
          setUserRank(better + 1);
        }
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoadingLeaderboard(false);
      }
    };
    fetchLeaderboard();
  }, [finalResult?.correctCount, gameId, user?.uid]);

  const [usersMap, setUsersMap] = useState<{
    [uid: string]: { name: string; handle: string; bElo: number };
  }>({});

  useEffect(() => {
    if (leaderboard.length === 0) return;
    const fetchSpecificUsers = async () => {
      try {
        const missing = leaderboard
          .filter((l) => !l.username)
          .map((l) => l.userId);
        if (missing.length === 0) return;
        const snaps = await Promise.all(
          [...new Set(missing)].map((uid) =>
            getDoc(doc(firestore, "users", uid)),
          ),
        );
        const newMap: {
          [uid: string]: { name: string; handle: string; bElo: number };
        } = {};
        snaps.forEach((snap) => {
          if (snap.exists()) {
            const d = snap.data();
            newMap[snap.id] = {
              name: d.username || "Unknown",
              handle: d.username || "",
              bElo: d.bElo || 500,
            };
          }
        });
        setUsersMap(newMap);
      } catch (err) {
        console.error("Error fetching user profiles:", err);
      }
    };
    fetchSpecificUsers();
  }, [leaderboard]);

  useEffect(() => {
    if (user && gameId && Object.keys(userAnswers).length > 0 && !submitted) {
      localStorage.setItem(
        `answers-${user.uid}-${gameId}`,
        JSON.stringify(userAnswers),
      );
    }
  }, [userAnswers, user, gameId, submitted]);

  if (loading || authLoading) {
    return (
      <div
        className={`${dmSans.className} flex items-center justify-center h-screen bg-neutral-900 text-white`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
          <span className="text-neutral-400 text-sm font-medium">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const choices = question
    ? (["a", "b", "c", "d", "e"] as const)
        .filter((key) => question[key])
        .map((key) => ({ key, text: question[key] as string }))
    : [];
  const answeredCount = Object.keys(userAnswers).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div
      className={`${dmSans.className} min-h-screen bg-neutral-900 text-white flex flex-col pt-24 ${
        submitted ? "select-text" : "select-none"
      }`}
    >
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {showTimeUpAlert && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-neutral-900/80 border border-neutral-500/40 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center justify-between space-x-4 w-[90%] max-w-xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-neutral-300 w-6 h-6" />
            <span className="text-lg font-bold">
              Time's up! Submitting results...
            </span>
          </div>
          <button
            onClick={() => setShowTimeUpAlert(false)}
            className="text-white/70 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>
      )}

      <div className="flex-1 flex justify-center py-8 px-4 relative z-10">
        <div className="w-full max-w-4xl relative">
          <div className="mb-8 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-4">
              <h1
                className="text-[32px] font-[900] text-white mb-2"
                style={{ letterSpacing: "-0.02em" }}
              >
                {gameTitle}
              </h1>
              {!submitted && (
                <span
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-normal mb-2 ${
                    isRanked
                      ? "bg-neutral-600 text-white"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                  style={{ letterSpacing: "0.08em" }}
                >
                  {isRanked ? "Ranked" : "Practice"}
                </span>
              )}
            </div>
            <div className="h-[3px] w-20 bg-neutral-600 rounded-full mx-auto md:mx-0" />
          </div>

          {submitted && (
            <div className="mb-8 flex flex-wrap gap-2 justify-center md:justify-start">
              {(["result", "leaderboard"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-xl font-bold text-[14px] transition-all capitalize ${
                    activeTab === tab
                      ? "bg-neutral-600 text-white shadow-lg shadow-neutral-900/40"
                      : "bg-[rgba(9,9,11,0.8)] border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {tab === "result" ? "Results" : "Leaderboard"}
                </button>
              ))}
              <button
                onClick={() => router.push("/home")}
                className="px-5 py-2 rounded-xl bg-[rgba(9,9,11,0.8)] border border-zinc-800 text-zinc-300 font-bold text-[14px] hover:bg-white hover:text-black hover:border-white transition-all"
              >
                Back to Home
              </button>
            </div>
          )}

          <div className="space-y-6 pb-32">
            {!submitted && question && (
              <>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      currentQuestion > 0 && goTo(currentQuestion - 1)
                    }
                    disabled={currentQuestion === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(9,9,11,0.8)] border border-zinc-800 text-zinc-300 font-bold text-[13px] rounded-lg hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>
                  <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neutral-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${((currentQuestion + 1) / questions.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`text-zinc-400 text-[11px] font-[700] tabular-nums shrink-0`}
                  >
                    {currentQuestion + 1} / {questions.length}
                  </span>
                  <button
                    onClick={() =>
                      currentQuestion < questions.length - 1 &&
                      goTo(currentQuestion + 1)
                    }
                    disabled={currentQuestion === questions.length - 1}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(9,9,11,0.8)] border border-zinc-800 text-zinc-300 font-bold text-[13px] rounded-lg hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-[rgba(9,9,11,0.8)] border border-zinc-800 rounded-2xl p-6 md:p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-neutral-400 text-sm">
                        Question {currentQuestion + 1}
                      </span>
                      <ReportButton
                        gameId={gameId as string}
                        questionIndex={currentQuestion}
                        gameTitle={gameTitle}
                      />
                    </div>
                  </div>

                  <div
                    className="mb-6 text-[18px] leading-relaxed text-zinc-100 font-medium overflow-hidden [&_p]:mb-2 [&_p:last-child]:mb-0 [&_p]:text-left [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                    dangerouslySetInnerHTML={{ __html: question.content }}
                  />

                  {question.imgURL && (
                    <div className="mb-6 rounded-xl overflow-hidden border border-zinc-800 bg-neutral-900">
                      <img
                        src={question.imgURL}
                        alt={`Question ${currentQuestion + 1}`}
                        className="w-full max-h-[400px] object-contain"
                      />
                    </div>
                  )}

                  <div className="flex flex-col space-y-2.5">
                    {choices.map(({ key, text }) => {
                      const isSelected = userAnswers[currentQuestion] === key;
                      return (
                        <button
                          key={key}
                          onClick={() => handleAnswer(currentQuestion, key)}
                          className={`group flex items-center w-full px-5 py-4 rounded-xl text-left border transition-all duration-200 ${
                            isSelected
                              ? "bg-neutral-600 text-white border-neutral-500 shadow-lg shadow-neutral-900/30"
                              : "bg-[rgba(24,24,27,0.6)] text-zinc-300 border-zinc-700/60 hover:bg-zinc-800 hover:text-white hover:border-neutral-500/50"
                          }`}
                        >
                          <span
                            className={`flex items-center justify-center w-8 h-8 rounded-lg mr-4 font-normal text-[12px] uppercase transition-colors ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-neutral-900/30 text-zinc-500 group-hover:text-white"
                            }`}
                          >
                            {key}
                          </span>
                          <span
                            className="text-[16px]"
                            dangerouslySetInnerHTML={{ __html: text }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit / Quit */}
                <div className="mt-2 flex flex-col md:flex-row justify-center gap-4">
                  <button
                    onClick={() => handleSubmit(false)}
                    className="w-full md:w-auto px-10 py-4 bg-neutral-600 text-white text-[16px] font-bold rounded-xl hover:bg-neutral-500 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-neutral-900/30"
                  >
                    Submit Blitz
                  </button>
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="w-full md:w-auto px-10 py-4 bg-[rgba(9,9,11,0.8)] border border-zinc-800 text-zinc-300 text-[16px] font-bold rounded-xl hover:bg-zinc-800 hover:text-white transition-all"
                  >
                    Quit Blitz
                  </button>
                </div>
              </>
            )}

            {submitted && activeTab === "result" && (
              <>
                {!finalResult ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Loader2 className="w-10 h-10 text-neutral-500 animate-spin mb-4" />
                    <p className="text-[18px] font-bold text-zinc-400 animate-pulse">
                      Calculating score...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                      <div className="bg-[rgba(9,9,11,0.8)] border border-zinc-800 p-6 rounded-2xl text-center">
                        <h2 className="text-zinc-500 font-medium text-[13px] mb-2">
                          Correct
                        </h2>
                        <p className="text-[28px] font-[900] text-white">
                          <span className="text-neutral-400">
                            {finalResult.correctCount}
                          </span>
                          <span className={`text-zinc-600 text-[18px]`}>
                            {" "}
                            / {finalResult.totalQuestions}
                          </span>
                        </p>
                      </div>
                      <div className="bg-[rgba(9,9,11,0.8)] border border-zinc-800 p-6 rounded-2xl text-center">
                        <h2 className="text-zinc-500 font-medium text-[13px] mb-2">
                          Time
                        </h2>
                        <p className={`text-[24px] font-normal text-white`}>
                          {formatTime(timeTotal - (timeLeft ?? 0))}
                        </p>
                      </div>
                      <div className="relative bg-[rgba(9,9,11,0.8)] border border-neutral-500/30 p-6 rounded-2xl text-center overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-neutral-600/[0.08] to-transparent pointer-events-none" />
                        <h2 className="relative text-zinc-500 font-medium text-[13px] mb-2">
                          Rank
                        </h2>
                        {loadingLeaderboard ? (
                          <Loader2 className="w-5 h-5 text-neutral-400 animate-spin mx-auto mt-1" />
                        ) : userRank !== null ? (
                          <p
                            className={`relative text-[32px] font-normal text-neutral-400`}
                          >
                            {userRank === 1
                              ? "🥇"
                              : userRank === 2
                                ? "🥈"
                                : userRank === 3
                                  ? "🥉"
                                  : `#${userRank}`}
                          </p>
                        ) : (
                          <p
                            className={`relative text-[20px] font-normal text-zinc-500`}
                          >
                            —
                          </p>
                        )}
                      </div>
                      <div className="bg-[rgba(9,9,11,0.8)] border border-zinc-800 p-6 rounded-2xl text-center">
                        <h2 className="text-zinc-500 font-medium text-[13px] mb-2">
                          Rating
                        </h2>
                        {!isRanked || isOwnBlitz ? (
                          <p className="text-[14px] font-[700] text-zinc-500">
                            {isOwnBlitz ? "Your blitz" : "Practice"}
                          </p>
                        ) : finalResult.ratingDelta !== null ? (
                          <p
                            className={`text-[28px] font-normal ${finalResult.ratingDelta >= 0 ? "text-emerald-400" : "text-red-400"}`}
                          >
                            {finalResult.ratingDelta >= 0 ? "+" : ""}
                            {finalResult.ratingDelta}
                          </p>
                        ) : ratingTimedOut ? (
                          <p className="text-[12px] font-[700] text-zinc-500 leading-snug">
                            Pending
                            <br />
                            activation
                          </p>
                        ) : (
                          <div className="flex flex-col items-center gap-1 mt-1">
                            <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
                            <p className="text-[10px] text-zinc-500">
                              Calculating…
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {questions.map((q, idx) => {
                      const qChoices = (["a", "b", "c", "d", "e"] as const)
                        .filter((key) => q[key])
                        .map((key) => ({ key, text: q[key] as string }));
                      const userAnswer = userAnswers[idx];
                      const correctAnswer = finalResult.correctAnswers[idx];

                      return (
                        <div
                          key={idx}
                          className="bg-[rgba(9,9,11,0.8)] border border-zinc-800 rounded-2xl p-6 md:p-8"
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-zinc-400 text-sm">
                              Question {idx + 1}
                            </span>
                            <BookmarkButton
                              gameId={gameId as string}
                              questionIndex={idx}
                              gameTitle={gameTitle}
                              correctAnswer={correctAnswer}
                              userAnswer={userAnswer}
                            />
                            <ReportButton
                              gameId={gameId as string}
                              questionIndex={idx}
                              gameTitle={gameTitle}
                            />
                          </div>
                          <div
                            className="mb-6 text-[18px] text-zinc-100"
                            dangerouslySetInnerHTML={{ __html: q.content }}
                          />
                          {q.imgURL && (
                            <img
                              src={q.imgURL}
                              alt={`Question ${idx + 1}`}
                              className="mb-6 rounded-xl max-h-[300px] w-auto border border-zinc-800"
                            />
                          )}
                          <div className="flex flex-col space-y-2.5">
                            {qChoices.map(({ key, text }) => {
                              const isUserAnswer = userAnswer === key;
                              const isCorrect = correctAnswer === key;
                              let bgClass =
                                "bg-[rgba(24,24,27,0.6)] border-zinc-700/60 text-zinc-500";
                              if (isCorrect)
                                bgClass =
                                  "bg-emerald-500/10 border-emerald-500/50 text-emerald-300";
                              else if (isUserAnswer)
                                bgClass =
                                  "bg-red-500/10 border-red-500/50 text-red-300";
                              return (
                                <div
                                  key={key}
                                  className={`flex items-center px-5 py-4 rounded-xl border ${bgClass}`}
                                >
                                  <span
                                    className={`font-normal mr-4 uppercase w-6 text-[12px]`}
                                  >
                                    {key}
                                  </span>
                                  <span
                                    className="font-medium text-[15px]"
                                    dangerouslySetInnerHTML={{ __html: text }}
                                  />
                                  {isCorrect && (
                                    <span
                                      className={`ml-auto text-emerald-400 font-normal text-[11px] uppercase`}
                                      style={{ letterSpacing: "0.06em" }}
                                    >
                                      CORRECT
                                    </span>
                                  )}
                                  {isUserAnswer && !isCorrect && (
                                    <span
                                      className={`ml-auto text-red-400 font-normal text-[11px] uppercase`}
                                      style={{ letterSpacing: "0.06em" }}
                                    >
                                      YOUR ANSWER
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}

            {submitted && activeTab === "leaderboard" && (
              <div className="bg-[rgba(9,9,11,0.8)] border border-zinc-800 rounded-2xl p-8">
                <h2
                  className="text-[22px] font-[900] mb-6 text-center"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Blitz Leaderboard
                </h2>
                {loadingLeaderboard ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-neutral-500 animate-spin mb-2" />
                    <span className="text-zinc-500 text-[13px]">
                      Loading leaderboard...
                    </span>
                  </div>
                ) : leaderboard.length === 0 ? (
                  <p className="text-zinc-600 text-center text-[14px]">
                    No submissions yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto">
                    {leaderboard.map((entry, idx) => {
                      const isCurrentUser = entry.userId === user?.uid;
                      const displayName =
                        entry.username ||
                        usersMap[entry.userId]?.name ||
                        "Unknown";
                      const bElo =
                        entry.bElo || usersMap[entry.userId]?.bElo || 500;
                      return (
                        <div
                          key={entry.userId}
                          className={`flex items-center gap-4 px-4 py-3 rounded-xl transition ${
                            isCurrentUser
                              ? "bg-neutral-500/[0.08] border border-neutral-500/30 text-white font-semibold"
                              : "bg-[rgba(24,24,27,0.6)] text-zinc-300 border border-transparent hover:border-zinc-800"
                          }`}
                        >
                          <div className="w-6 flex justify-center">
                            <span
                              className={`font-bold text-zinc-600 w-6 text-center text-[12px]`}
                            >
                              #{idx + 1}
                            </span>
                          </div>
                          <img
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`}
                            alt={displayName}
                            className="w-9 h-9 rounded-full border border-zinc-800 bg-zinc-900"
                          />
                          <div className="truncate flex-1 text-left text-[13px] font-bold">
                            {displayName ? (
                              <Link
                                href={`/profile/${displayName}`}
                                className={`hover:underline transition-colors ${getRatingTier(bElo).textClass}`}
                              >
                                {displayName}
                              </Link>
                            ) : (
                              <span className={getRatingTier(bElo).textClass}>
                                Unknown
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span
                              className={`font-normal text-[16px] tabular-nums ${isCurrentUser ? "text-neutral-400" : "text-zinc-300"}`}
                            >
                              {entry.correctCount ?? "?"}/
                              {entry.totalQuestions ?? "?"}
                            </span>
                            <p className={`text-[11px] text-zinc-500`}>
                              {formatTime(entry.timeTaken)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {!submitted && (
          <div className="hidden xl:flex fixed right-10 top-28 z-40 flex-col items-center gap-4">
            {timeLeft !== null && timeLeft > 0 && (
              <div style={{ width: size, height: size, position: "relative" }}>
                <svg
                  height={size}
                  width={size}
                  className="transform -rotate-90"
                >
                  <circle
                    stroke="#18181b"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                  />
                  <circle
                    stroke="#ededed"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * radius}
                    strokeDashoffset={
                      2 * Math.PI * radius * (1 - timeLeft / timeTotal)
                    }
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    className="transition-[stroke-dashoffset] duration-1000 linear"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className={`text-[36px] font-normal text-white tabular-nums`}
                  >
                    {`${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")}`}
                  </span>
                  <span
                    className={`text-zinc-500 text-[10px] font-bold mt-1`}
                    style={{ letterSpacing: "0.06em" }}
                  >
                    Remaining
                  </span>
                </div>
              </div>
            )}

            <div
              className="w-full bg-[rgba(9,9,11,0.8)] border border-zinc-800 rounded-2xl overflow-hidden"
              style={{ width: size }}
            >
              <button
                onClick={() => setShowReviewPanel((p) => !p)}
                className="w-full flex items-center justify-between px-4 py-3 text-zinc-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  <span className={`text-[12px] font-[700]`}>Review</span>
                </div>
                <div className="flex items-center gap-2">
                  {unansweredCount > 0 && (
                    <span className="bg-zinc-700 text-zinc-300 text-[10px] font-normal px-1.5 py-0.5 rounded-full">
                      {unansweredCount}
                    </span>
                  )}
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${showReviewPanel ? "rotate-90" : ""}`}
                  />
                </div>
              </button>

              {showReviewPanel && (
                <div className="px-3 pb-3 border-t border-zinc-800">
                  <div className="grid grid-cols-5 gap-1.5 pt-3">
                    {questions.map((_, i) => {
                      const isAnswered = !!userAnswers[i];
                      const isFlagged = flaggedQuestions.has(i);
                      const isCurrent = i === currentQuestion;
                      return (
                        <button
                          key={i}
                          onClick={() => goTo(i)}
                          title={`Question ${i + 1}`}
                          className={`h-8 rounded-lg text-[11px] font-normal transition-all border ${
                            isCurrent
                              ? "ring-2 ring-neutral-400 ring-offset-1 ring-offset-zinc-950"
                              : ""
                          } ${
                            isFlagged
                              ? "bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25"
                              : isAnswered
                                ? "bg-neutral-600/70 border-neutral-500/40 text-zinc-200 hover:bg-neutral-500/70"
                                : "bg-zinc-800/80 border-zinc-700 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                          }`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col gap-1.5 mt-3 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-sm bg-neutral-600/70 border border-neutral-500/40 shrink-0" />
                      <span className="text-zinc-500">
                        {answeredCount} answered
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-sm bg-zinc-800/80 border border-zinc-700 shrink-0" />
                      <span className="text-zinc-500">
                        {unansweredCount} unanswered
                      </span>
                    </div>
                    {flaggedQuestions.size > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-sm bg-amber-500/15 border border-amber-500/40 shrink-0" />
                        <span className="text-zinc-500">
                          {flaggedQuestions.size} flagged
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-neutral-900/80 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-[rgba(9,9,11,0.95)] border border-zinc-800 rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
            <h2
              className="text-[22px] font-[900] mb-2 text-white"
              style={{ letterSpacing: "-0.02em" }}
            >
              Quit the Blitz?
            </h2>
            <p className="text-zinc-500 text-[14px] mb-8">
              Your current answers will be submitted and you will return to the
              home screen.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={async () => {
                  await handleSubmit(true);
                  router.push("/home");
                }}
                className="flex-1 px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/30 font-bold rounded-xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
              >
                Quit
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-6 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
