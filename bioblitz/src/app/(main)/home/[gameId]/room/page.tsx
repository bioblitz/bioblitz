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
import { Loader2, AlertCircle, Crown, Medal } from "lucide-react";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const mono = jetbrainsMono.className;

interface CircularTimerProps {
  timeLeft: number;
  timeTotal: number;
}

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
};

type LeaderboardEntry = {
  userId: string;
  score: number;
  timeTaken: number;
  username?: string;
  handle?: string;
  photoURL?: string;
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

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

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

          if (user) {
            const key = `startTime-${user.uid}-${gameId}`;
            const savedStart = localStorage.getItem(key);

            if (savedStart) {
              const elapsed = Math.floor(
                (Date.now() - parseInt(savedStart)) / 1000,
              );
              const remaining = Math.max(0, data.timeLimit - elapsed);

              setTimeLeft(remaining);
            } else {
              const startTime = Date.now();
              localStorage.setItem(key, startTime.toString());
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
        const result = await getPublicQuestions({ gameId: gameId });
        const loadedQuestions = (result.data as { questions: Question[] })
          .questions;
        if (isMounted.current) {
          setQuestions(loadedQuestions);
        }
      } catch (error) {
        console.error("Error loading Blitz data:", error);
        alert(`Could not load the Blitz. Please try again later.`);
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
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

    setSubmitted(true);
    setActiveTab("result");
    window.scrollTo({ top: 0, behavior: "smooth" });

    const timeTaken = timeTotal - (timeLeft ?? 0);

    const commonData = {
      gameId: gameId,
      userId: user.uid,
      userAnswers: userAnswers,
      timeTaken: timeTaken,
      submittedAt: serverTimestamp(),
      status: "pending_grading",
      username: user.displayName || "Unknown",
      handle: userProfileData.handle,
      photoURL: userProfileData.photoURL,
    };

    try {
      let submissionRef;

      if (isRanked) {
        const rankedId = `${user.uid}_${gameId}`;
        const rankedRef = doc(firestore, "gameSubmissions", rankedId);

        await setDoc(rankedRef, {
          ...commonData,
          ranked: true,
        });

        submissionRef = rankedRef;
      } else {
        submissionRef = await addDoc(collection(firestore, "gameSubmissions"), {
          ...commonData,
          ranked: false,
        });
      }

      if (isMounted.current) {
        setSubmissionId(submissionRef.id);
      }

      if (user) {
        localStorage.removeItem(`startTime-${user.uid}-${gameId}`);
        localStorage.removeItem(`answers-${user.uid}-${gameId}`);
      }
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

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, submitted, handleSubmit]);

  useEffect(() => {
    if (!submissionId) return;

    const unsub = onSnapshot(
      doc(firestore, "gameSubmissions", submissionId),
      (doc) => {
        const data = doc.data();
        if (data?.score !== undefined) {
          if (isMounted.current) {
            setFinalResult({
              score: data.score,
              correctCount: data.correctCount,
              totalQuestions: data.totalQuestions,
              correctAnswers: data.correctAnswers,
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

  const handleAnswer = (questionIndex: number, choice: string) => {
    if (submitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [questionIndex]: choice,
    }));
  };

  const formatTime = (totalSeconds: number | null) => {
    if (totalSeconds === null) return "0 mins 0 secs";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes} min${minutes !== 1 ? "s" : ""} ${seconds} sec${
      seconds !== 1 ? "s" : ""
    }`;
  };

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  useEffect(() => {
    if (!submitted || activeTab !== "leaderboard") return;

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
          limit(50),
        );

        const snapshot = await getDocs(q);

        const firstByUser: { [userId: string]: any } = {};
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (!firstByUser[data.userId]) {
            firstByUser[data.userId] = data;
          }
        });

        const data = Object.values(firstByUser) as LeaderboardEntry[];
        setLeaderboard(data);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    fetchLeaderboard();
  }, [submitted, activeTab, gameId]);

  const [usersMap, setUsersMap] = useState<{
    [uid: string]: { name: string; handle: string };
  }>({});

  useEffect(() => {
    if (leaderboard.length === 0) return;

    const fetchSpecificUsers = async () => {
      try {
        const missingProfileIds = leaderboard
          .filter((l) => !l.username)
          .map((l) => l.userId);

        if (missingProfileIds.length === 0) return;

        const uniqueUserIds = Array.from(new Set(missingProfileIds));

        const userPromises = uniqueUserIds.map((uid) =>
          getDoc(doc(firestore, "users", uid)),
        );

        const userSnapshots = await Promise.all(userPromises);

        const newMap: { [uid: string]: { name: string; handle: string } } = {};
        userSnapshots.forEach((snap) => {
          if (snap.exists()) {
            const d = snap.data();
            newMap[snap.id] = {
              name: d.displayName || "Unknown",
              handle: d.username || "",
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
      const answerKey = `answers-${user.uid}-${gameId}`;
      localStorage.setItem(answerKey, JSON.stringify(userAnswers));
    }
  }, [userAnswers, user, gameId, submitted]);

  if (loading || authLoading) {
    return (
      <div
        className={`${dmSans.className} flex items-center justify-center h-screen bg-black text-white`}
      >
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
          <p className="text-zinc-500 font-medium tracking-wide animate-pulse">
            Loading Blitz...
          </p>
        </div>
      </div>
    );
  }

  return (
    //! please don't cheat :(
    <div
      className={`${dmSans.className} min-h-screen bg-black text-white flex flex-col pt-24 ${
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
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-violet-900/80 border border-violet-500/40 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center justify-between space-x-4 w-[90%] max-w-xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-violet-300 w-6 h-6" />
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
              {isRanked && !submitted && (
                <span
                  className={`${mono} bg-violet-600 text-white text-[10px] px-2.5 py-1 rounded-lg font-[800] uppercase mb-2`}
                  style={{ letterSpacing: "0.08em" }}
                >
                  Ranked
                </span>
              )}
              {!isRanked && !submitted && (
                <span
                  className={`${mono} bg-zinc-800 text-zinc-400 text-[10px] px-2.5 py-1 rounded-lg font-[800] uppercase mb-2`}
                  style={{ letterSpacing: "0.08em" }}
                >
                  Practice
                </span>
              )}
            </div>
            <div className="h-[3px] w-20 bg-violet-600 rounded-full mx-auto md:mx-0"></div>
          </div>

          {submitted && (
            <div className="mb-8 flex flex-wrap gap-2 justify-center md:justify-start">
              <button
                onClick={() => setActiveTab("result")}
                className={`px-5 py-2 rounded-xl font-bold text-[14px] transition-all ${
                  activeTab === "result"
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                    : "bg-[rgba(9,9,11,0.8)] border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                Results
              </button>
              <button
                onClick={() => setActiveTab("leaderboard")}
                className={`px-5 py-2 rounded-xl font-bold text-[14px] transition-all ${
                  activeTab === "leaderboard"
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                    : "bg-[rgba(9,9,11,0.8)] border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                Leaderboard
              </button>
              <button
                onClick={() => router.push("/home")}
                className="px-5 py-2 rounded-xl bg-[rgba(9,9,11,0.8)] border border-zinc-800 text-zinc-300 font-bold text-[14px] hover:bg-white hover:text-black hover:border-white transition-all"
              >
                Back to Home
              </button>
            </div>
          )}

          <div className="space-y-6 pb-20">
            {!submitted && (
              <>
                {questions.map((question, idx) => {
                  const choices = ["a", "b", "c", "d", "e"]
                    .filter((key) => question[key as keyof Question])
                    .map((key) => ({
                      key,
                      text: question[key as keyof Question] as string,
                    }));

                  return (
                    <div
                      key={idx}
                      className="bg-[rgba(9,9,11,0.8)] border border-zinc-800 rounded-2xl p-6 md:p-8"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <span
                          className={`${mono} bg-violet-500/12 text-violet-400 text-[11px] font-[800] px-3 py-1 rounded-lg border border-violet-500/20`}
                          style={{ letterSpacing: "0.06em" }}
                        >
                          Question {idx + 1}
                        </span>
                        <ReportButton
                          gameId={gameId as string}
                          questionIndex={idx}
                          gameTitle={gameTitle}
                        />
                      </div>

                      <div
                        className="mb-6 text-[18px] leading-relaxed text-zinc-100 font-medium"
                        dangerouslySetInnerHTML={{ __html: question.content }}
                      />

                      {question.imgURL && (
                        <div className="mb-6 rounded-xl overflow-hidden border border-zinc-800 bg-black">
                          <img
                            src={question.imgURL}
                            alt={`Question ${idx + 1}`}
                            className="w-full max-h-[400px] object-contain"
                          />
                        </div>
                      )}

                      <div className="flex flex-col space-y-2.5">
                        {choices.map(({ key, text }) => {
                          const isSelected = userAnswers[idx] === key;
                          const bgClass = isSelected
                            ? "bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-900/30"
                            : "bg-[rgba(24,24,27,0.6)] text-zinc-300 border-zinc-700/60 hover:bg-zinc-800 hover:text-white hover:border-violet-500/50";

                          return (
                            <button
                              key={key}
                              onClick={() => handleAnswer(idx, key)}
                              className={`group flex items-center w-full px-5 py-4 rounded-xl text-left border transition-all duration-200 ${bgClass}`}
                            >
                              <span
                                className={`${mono} flex items-center justify-center w-8 h-8 rounded-lg mr-4 font-[800] text-[12px] uppercase transition-colors ${
                                  isSelected
                                    ? "bg-white/20 text-white"
                                    : "bg-black/30 text-zinc-500 group-hover:text-white"
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
                  );
                })}

                <div className="mt-10 flex flex-col md:flex-row justify-center gap-4">
                  <button
                    onClick={() => handleSubmit(false)}
                    className="w-full md:w-auto px-10 py-4 bg-violet-600 text-white text-[16px] font-bold rounded-xl hover:bg-violet-500 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-violet-900/30"
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
                    <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
                    <p className="text-[18px] font-bold text-zinc-400 animate-pulse">
                      Calculating score...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                      <div className="bg-[rgba(9,9,11,0.8)] border border-zinc-800 p-6 rounded-2xl text-center">
                        <h2 className="text-zinc-500 font-medium text-[13px] mb-2">
                          Accuracy
                        </h2>
                        <p className="text-[28px] font-[900] text-white">
                          <span className="text-violet-400">
                            {finalResult.correctCount}
                          </span>
                          <span className={`${mono} text-zinc-600 text-[18px]`}>
                            {" "}
                            / {finalResult.totalQuestions}
                          </span>
                        </p>
                      </div>
                      <div className="bg-[rgba(9,9,11,0.8)] border border-zinc-800 p-6 rounded-2xl text-center">
                        <h2 className="text-zinc-500 font-medium text-[13px] mb-2">
                          Time Played
                        </h2>
                        <p
                          className={`${mono} text-[24px] font-[800] text-white`}
                        >
                          {formatTime(timeTotal - (timeLeft ?? 0))}
                        </p>
                      </div>
                      <div className="relative bg-[rgba(9,9,11,0.8)] border border-violet-500/30 p-6 rounded-2xl text-center overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-violet-600/[0.08] to-transparent pointer-events-none" />
                        <h2 className="relative text-zinc-500 font-medium text-[13px] mb-2">
                          Score
                        </h2>
                        <p
                          className={`${mono} relative text-[32px] font-[800] text-violet-400`}
                        >
                          {finalResult.score}
                        </p>
                      </div>
                    </div>

                    {questions.map((question, idx) => {
                      const choices = ["a", "b", "c", "d", "e"]
                        .filter((key) => question[key as keyof Question])
                        .map((key) => ({
                          key,
                          text: question[key as keyof Question] as string,
                        }));
                      const userAnswer = userAnswers[idx];
                      const correctAnswer = finalResult.correctAnswers[idx];

                      return (
                        <div
                          key={idx}
                          className="bg-[rgba(9,9,11,0.8)] border border-zinc-800 rounded-2xl p-6 md:p-8"
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <span
                              className={`${mono} bg-zinc-800 text-zinc-400 text-[11px] font-[800] px-3 py-1 rounded-lg`}
                              style={{ letterSpacing: "0.06em" }}
                            >
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
                            dangerouslySetInnerHTML={{
                              __html: question.content,
                            }}
                          />

                          {question.imgURL && (
                            <img
                              src={question.imgURL}
                              alt={`Question ${idx + 1}`}
                              className="mb-6 rounded-xl max-h-[300px] w-auto border border-zinc-800"
                            />
                          )}

                          <div className="flex flex-col space-y-2.5">
                            {choices.map(({ key, text }) => {
                              const isUserAnswer = userAnswer === key;
                              const isCorrect = correctAnswer === key;

                              let bgClass =
                                "bg-[rgba(24,24,27,0.6)] border-zinc-700/60 text-zinc-500";

                              if (isCorrect) {
                                bgClass =
                                  "bg-emerald-500/10 border-emerald-500/50 text-emerald-300";
                              } else if (isUserAnswer) {
                                bgClass =
                                  "bg-red-500/10 border-red-500/50 text-red-300";
                              }

                              return (
                                <div
                                  key={key}
                                  className={`flex items-center px-5 py-4 rounded-xl border transition-all ${bgClass}`}
                                >
                                  <span
                                    className={`${mono} font-[800] mr-4 uppercase w-6 text-[12px]`}
                                  >
                                    {key}
                                  </span>
                                  <span
                                    className="font-medium text-[15px]"
                                    dangerouslySetInnerHTML={{ __html: text }}
                                  />
                                  {isCorrect && (
                                    <span
                                      className={`${mono} ml-auto text-emerald-400 font-[800] text-[11px] uppercase`}
                                      style={{ letterSpacing: "0.06em" }}
                                    >
                                      CORRECT
                                    </span>
                                  )}
                                  {isUserAnswer && !isCorrect && (
                                    <span
                                      className={`${mono} ml-auto text-red-400 font-[800] text-[11px] uppercase`}
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
                    <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-2" />
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
                      const handle =
                        entry.handle || usersMap[entry.userId]?.handle;

                      return (
                        <div
                          key={entry.userId}
                          className={`flex items-center gap-4 px-4 py-3 rounded-xl transition ${
                            isCurrentUser
                              ? "bg-violet-500/[0.08] border border-violet-500/30 text-white font-semibold"
                              : "bg-[rgba(24,24,27,0.6)] text-zinc-300 border border-transparent hover:border-zinc-800"
                          }`}
                        >
                          <div className="w-6 flex justify-center">
                            {idx === 0 ? (
                              <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500/20" />
                            ) : idx === 1 ? (
                              <Medal className="w-5 h-5 text-zinc-300" />
                            ) : idx === 2 ? (
                              <Medal className="w-5 h-5 text-orange-500" />
                            ) : (
                              <span
                                className={`${mono} font-bold text-zinc-600 w-6 text-center text-[12px]`}
                              >
                                {idx + 1}
                              </span>
                            )}
                          </div>

                          <img
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`}
                            alt={displayName}
                            className="w-9 h-9 rounded-full border border-zinc-800 bg-zinc-900"
                          />

                          <div className="truncate flex-1 text-left text-[13px] font-bold">
                            {handle ? (
                              <Link
                                href={`/profile/${handle}`}
                                className="hover:underline hover:text-white transition-colors"
                              >
                                {displayName}
                              </Link>
                            ) : (
                              <span>{displayName}</span>
                            )}
                          </div>

                          <span
                            className={`${mono} font-[800] text-[16px] text-right tabular-nums ${isCurrentUser ? "text-violet-400" : "text-zinc-300"}`}
                          >
                            {entry.score}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {timeLeft !== null && timeLeft > 0 && !submitted && (
          <div className="hidden xl:block fixed right-10 top-1/2 transform -translate-y-1/2 z-40">
            <div className="relative flex flex-col items-center">
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
                    stroke="#8b5cf6"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * radius}
                    strokeDashoffset={
                      2 * Math.PI * radius * (1 - timeLeft! / timeTotal)
                    }
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    className="transition-[stroke-dashoffset] duration-1000 linear"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className={`${mono} text-[36px] font-[800] text-white tabular-nums`}
                  >
                    {`${Math.floor(timeLeft / 60)}:${(timeLeft % 60)
                      .toString()
                      .padStart(2, "0")}`}
                  </span>
                  <span
                    className={`${mono} text-zinc-500 text-[10px] font-bold uppercase mt-1`}
                    style={{ letterSpacing: "0.12em" }}
                  >
                    Remaining
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center px-4">
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
