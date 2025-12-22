"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  addDoc,
  onSnapshot,
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  arrayUnion,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { firestore, auth } from "@/lib/firebase";
import { User } from "firebase/auth";
import { Loader2, AlertCircle } from "lucide-react";

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

export default function GameRoomPage() {
  const { gameId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read the 'ranked' query param passed from the previous page
  // Defaults to false if missing (Practice mode)
  const isRanked = searchParams.get("ranked") === "true";

  const [user, setUser] = useState<User | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<{ [index: number]: string }>(
    {}
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
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (isMounted.current) {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!gameId) return;

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

          // Only recover session if user hasn't submitted yet
          const key = `startTime-${gameId}`;
          const savedStart = localStorage.getItem(key);

          if (savedStart) {
            const elapsed = Math.floor(
              (Date.now() - parseInt(savedStart)) / 1000
            );
            const remaining = Math.max(0, data.timeLimit - elapsed);
            setTimeLeft(remaining);
          } else {
            const startTime = Date.now();
            localStorage.setItem(key, startTime.toString());
            setTimeLeft(data.timeLimit);
          }
        }

        const functions = getFunctions();
        const getPublicQuestions = httpsCallable(
          functions,
          "getPublicQuestions"
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
  }, [gameId, router]);

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

    try {
      let submissionRef;

      if (isRanked) {
        const rankedId = `${user.uid}_${gameId}`;
        const rankedRef = doc(firestore, "gameSubmissions", rankedId);

        await setDoc(rankedRef, {
          gameId: gameId,
          userId: user.uid,
          userAnswers: userAnswers,
          timeTaken: timeTaken,
          submittedAt: serverTimestamp(),
          status: "pending_grading",
          ranked: true,
        });

        submissionRef = rankedRef;
      } else {
        submissionRef = await addDoc(collection(firestore, "gameSubmissions"), {
          gameId: gameId,
          userId: user.uid,
          userAnswers: userAnswers,
          timeTaken: timeTaken,
          submittedAt: serverTimestamp(),
          status: "pending_grading",
          ranked: false,
        });
      }

      if (isMounted.current) {
        setSubmissionId(submissionRef.id);
      }
      localStorage.removeItem(`startTime-${gameId}`);
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
        }
      }
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

  const [leaderboard, setLeaderboard] = useState<
    { userId: string; score: number; timeTaken: number }[]
  >([]);
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
          limit(50)
        );

        const snapshot = await getDocs(q);

        const firstByUser: { [userId: string]: any } = {};
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (!firstByUser[data.userId]) {
            firstByUser[data.userId] = data;
          }
        });

        const data = Object.values(firstByUser) as {
          userId: string;
          score: number;
          timeTaken: number;
        }[];
        setLeaderboard(data);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    fetchLeaderboard();
  }, [submitted, activeTab, gameId]);

  const [usersMap, setUsersMap] = useState<{ [uid: string]: string }>({});

  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(firestore, "users"));
      const map: { [uid: string]: string } = {};
      snapshot.docs.forEach((doc) => {
        map[doc.id] = doc.data().displayName || "Unknown";
      });
      setUsersMap(map);
    };
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-white">
        <div className="flex flex-col items-center space-y-4 animate-in fade-in duration-500">
          <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
          <p className="text-zinc-500 font-medium tracking-wide animate-pulse">
            Loading Blitz...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans pt-24">
      {showTimeUpAlert && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-violet-900/90 border border-violet-500/50 text-white px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center justify-between space-x-4 w-[90%] max-w-xl animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-violet-300 w-6 h-6" />
            <span className="text-lg font-semibold">
              Time’s up! Submitting results...
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

      {/* Main Layout */}
      <div className="flex-1 flex justify-center py-8 px-4">
        <div className="w-full max-w-4xl relative">
          {/* Header */}
          <div className="mb-8 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-4">
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                {gameTitle}
              </h1>
              {isRanked && !submitted && (
                <span className="bg-violet-600 text-white text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wider mb-2">
                  Ranked
                </span>
              )}
              {!isRanked && !submitted && (
                <span className="bg-zinc-700 text-zinc-300 text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wider mb-2">
                  Practice
                </span>
              )}
            </div>
            <div className="h-1 w-20 bg-violet-600 rounded-full mx-auto md:mx-0"></div>
          </div>

          {submitted && (
            <div className="mb-8 flex flex-wrap gap-4 justify-center md:justify-start">
              <button
                onClick={() => setActiveTab("result")}
                className={`px-6 py-2 rounded-full font-bold text-lg transition-all duration-300 shadow-md ${
                  activeTab === "result"
                    ? "bg-violet-600 text-white shadow-violet-500/20"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                Results
              </button>
              <button
                onClick={() => setActiveTab("leaderboard")}
                className={`px-6 py-2 rounded-full font-bold text-lg transition-all duration-300 shadow-md ${
                  activeTab === "leaderboard"
                    ? "bg-violet-600 text-white shadow-violet-500/20"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                Leaderboard
              </button>

              <button
                onClick={() => router.push("/home")}
                className="px-6 py-2 rounded-full bg-zinc-800 text-white font-bold text-lg hover:bg-white hover:text-black transition duration-300 shadow-md"
              >
                Back to Home
              </button>
            </div>
          )}

          <div className="space-y-8 pb-20">
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
                      className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <span className="bg-violet-500/10 text-violet-400 text-sm font-bold px-3 py-1 rounded-full border border-violet-500/20">
                          Question {idx + 1}
                        </span>
                      </div>

                      <p className="mb-6 text-xl leading-relaxed text-zinc-100 font-medium">
                        {question.content}
                      </p>

                      {question.imgURL && (
                        <div className="mb-6 rounded-xl overflow-hidden border border-zinc-700 bg-black">
                          <img
                            src={question.imgURL}
                            alt={`Question ${idx + 1}`}
                            className="w-full max-h-[400px] object-contain"
                          />
                        </div>
                      )}

                      <div className="flex flex-col space-y-3">
                        {choices.map(({ key, text }) => {
                          const isSelected = userAnswers[idx] === key;
                          const bgClass = isSelected
                            ? "bg-violet-600 text-white border-violet-600"
                            : "bg-zinc-800/50 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white hover:border-violet-500";

                          return (
                            <button
                              key={key}
                              onClick={() => handleAnswer(idx, key)}
                              className={`group flex items-center w-full px-5 py-4 rounded-xl text-left border-2 transition-all duration-200 ${bgClass}`}
                            >
                              <span
                                className={`flex items-center justify-center w-8 h-8 rounded-lg mr-4 font-bold text-sm uppercase transition-colors ${
                                  isSelected
                                    ? "bg-white/20 text-white"
                                    : "bg-black/20 text-zinc-400 group-hover:text-white"
                                }`}
                              >
                                {key}
                              </span>
                              <span className="text-lg">{text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className="mt-12 flex flex-col md:flex-row justify-center gap-6">
                  <button
                    onClick={() => handleSubmit(false)}
                    className="w-full md:w-auto px-10 py-4 bg-violet-600 text-white text-lg font-bold rounded-xl hover:bg-violet-500 hover:scale-105 transition-all shadow-lg shadow-violet-500/20"
                  >
                    Submit Blitz
                  </button>
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="w-full md:w-auto px-10 py-4 bg-zinc-800 text-white text-lg font-bold rounded-xl hover:bg-zinc-700 transition-all"
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
                    <p className="text-xl font-semibold text-zinc-400 animate-pulse">
                      Calculating score...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl text-center">
                        <h2 className="text-zinc-400 font-medium mb-1">
                          Accuracy
                        </h2>
                        <p className="text-3xl font-bold text-white">
                          <span className="text-violet-500">
                            {finalResult.correctCount}
                          </span>
                          <span className="text-zinc-600 text-xl">
                            {" "}
                            / {finalResult.totalQuestions}
                          </span>
                        </p>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl text-center">
                        <h2 className="text-zinc-400 font-medium mb-1">
                          Time Played
                        </h2>
                        <p className="text-3xl font-bold text-white">
                          {formatTime(timeTotal - (timeLeft ?? 0))}
                        </p>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl text-center">
                        <h2 className="text-zinc-400 font-medium mb-1">
                          Score
                        </h2>
                        <p className="text-3xl font-bold text-violet-500">
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
                          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-md"
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <span className="bg-zinc-800 text-zinc-400 text-sm font-bold px-3 py-1 rounded-full">
                              Question {idx + 1}
                            </span>
                          </div>

                          <p className="mb-6 text-xl text-zinc-100">
                            {question.content}
                          </p>

                          {question.imgURL && (
                            <img
                              src={question.imgURL}
                              alt={`Question ${idx + 1}`}
                              className="mb-6 rounded-lg max-h-[300px] w-auto border border-zinc-700"
                            />
                          )}

                          <div className="flex flex-col space-y-3">
                            {choices.map(({ key, text }) => {
                              const isUserAnswer = userAnswer === key;
                              const isCorrect = correctAnswer === key;

                              let bgClass =
                                "bg-zinc-800/50 border-zinc-700 text-zinc-400";

                              if (isCorrect) {
                                bgClass =
                                  "bg-emerald-500/10 border-emerald-500 text-emerald-400";
                              } else if (isUserAnswer) {
                                bgClass =
                                  "bg-red-500/10 border-red-500 text-red-400";
                              }

                              return (
                                <div
                                  key={key}
                                  className={`flex items-center px-5 py-4 rounded-xl border-2 ${bgClass}`}
                                >
                                  <span className="font-bold mr-4 uppercase w-6">
                                    {key}
                                  </span>
                                  <span className="font-medium">{text}</span>
                                  {isCorrect && (
                                    <span className="ml-auto text-emerald-500 font-bold text-sm">
                                      CORRECT
                                    </span>
                                  )}
                                  {isUserAnswer && !isCorrect && (
                                    <span className="ml-auto text-red-500 font-bold text-sm">
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
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center">
                <h2 className="text-2xl font-bold mb-6">Leaderboard</h2>

                {loadingLeaderboard ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-2" />
                    <span className="text-zinc-400">
                      Loading leaderboard...
                    </span>
                  </div>
                ) : leaderboard.length === 0 ? (
                  <p className="text-zinc-500">No submissions yet.</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {leaderboard.map((entry, idx) => {
                      const isCurrentUser = entry.userId === user?.uid;
                      return (
                        <div
                          key={entry.userId}
                          className={`flex justify-between px-4 py-2 rounded-lg border ${
                            isCurrentUser
                              ? "bg-violet-600/20 border-violet-500 text-white font-bold"
                              : "bg-zinc-800/50 border-zinc-700 text-zinc-300"
                          }`}
                        >
                          <span>
                            {idx + 1}. {usersMap[entry.userId] || entry.userId}
                          </span>
                          <span>{entry.score}</span>
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
                    stroke="#27272a"
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
                  <span className="text-4xl font-bold text-white tabular-nums">
                    {`${Math.floor(timeLeft / 60)}:${(timeLeft % 60)
                      .toString()
                      .padStart(2, "0")}`}
                  </span>
                  <span className="text-zinc-500 text-sm font-medium uppercase tracking-wider mt-1">
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md shadow-2xl text-center transform scale-100 transition-all">
            <h2 className="text-2xl font-bold mb-2 text-white">
              Quit the Blitz?
            </h2>
            <p className="text-zinc-400 mb-8">
              Your progress will be lost and you will return to the home screen.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  localStorage.removeItem(`startTime-${gameId}`);
                  router.push("/home");
                }}
                className="flex-1 px-6 py-3 bg-red-600/10 text-red-500 border border-red-600/50 font-bold rounded-xl hover:bg-red-600 hover:text-white transition"
              >
                Quit
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-6 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition"
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
