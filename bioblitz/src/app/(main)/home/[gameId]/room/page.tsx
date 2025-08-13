"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { addDoc, onSnapshot, collection, doc, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { firestore, auth } from "@/lib/firebase";
import { User } from "firebase/auth";

// Types used in the component
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

// --- EDITED: Updated result type to include the correct answers ---
type GameResult = {
  score: number;
  correctCount: number;
  totalQuestions: number;
  correctAnswers: { [key: number]: string };
};

export default function GameRoomPage() {
  const { gameId } = useParams();
  const router = useRouter();

  // --- State Hooks ---
  const [user, setUser] = useState<User | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<{ [index: number]: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [gameTitle, setGameTitle] = useState("");
  const [timeTotal, setTimeTotal] = useState(0);
  const [showTimeUpAlert, setShowTimeUpAlert] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("result");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<GameResult | null>(null);

  // --- Ref Hook ---
  const isMounted = useRef(true);

  // --- Effect Hooks ---

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
          alert("Game not found!");
          router.push("/home");
          return;
        }

        const data = gameDocSnap.data();
        if (isMounted.current) {
            setGameTitle(data.title || "Untitled Game");
            setTimeLeft(data.timeLimit);
            setTimeTotal(data.timeLimit);
        }

        const functions = getFunctions();
        const getPublicQuestions = httpsCallable(functions, 'getPublicQuestions');
        const result = await getPublicQuestions({ gameId: gameId });
        
        const loadedQuestions = (result.data as { questions: Question[] }).questions;

        if (isMounted.current) {
            setQuestions(loadedQuestions);
        }

      } catch (error) {
        console.error("Error loading game data:", error);
        alert(`Could not load the game. Please try again later.`);
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
      const submissionRef = await addDoc(collection(firestore, "gameSubmissions"), {
        gameId: gameId,
        userId: user.uid,
        userAnswers: userAnswers,
        timeTaken: timeTaken,
        submittedAt: new Date(),
        status: "pending_grading",
      });
      
      if (isMounted.current) {
        setSubmissionId(submissionRef.id);
      }
    } catch (error) {
      console.error("Error submitting game:", error);
      alert("There was an error submitting your game. Please try again.");
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

    const unsub = onSnapshot(doc(firestore, "gameSubmissions", submissionId), (doc) => {
      const data = doc.data();
      if (data?.score !== undefined) {
        if (isMounted.current) {
          // --- EDITED: Set the full result object including correct answers ---
          setFinalResult({
            score: data.score,
            correctCount: data.correctCount,
            totalQuestions: data.totalQuestions,
            correctAnswers: data.correctAnswers,
          });

          

        }
      }
    });

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
    return `${minutes} min${minutes !== 1 ? "s" : ""} ${seconds} sec${seconds !== 1 ? "s" : ""}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        Loading Game...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {showTimeUpAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-slate-800/90 text-white px-6 py-3 rounded-xl shadow-lg z-50 flex items-center justify-between space-x-4 w-[90%] max-w-xl">
          <span className="text-lg font-semibold">
            Time’s up! Your game has been submitted.
          </span>
          <button
            onClick={() => setShowTimeUpAlert(false)}
            className="text-white text-2xl leading-none hover:text-zinc-200"
          >
            &times;
          </button>
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-14 bg-gray-900 text-white p-4"></nav>
        <div className="min-h-screen bg-black text-white p-6 max-w-full">
          <div className="max-w-2xl ml-4">
            <div className="flex justify-between items-center mb-6">
              <h1 className="ml-2 text-center text-4xl font-bold text-white drop-shadow-md">
                {gameTitle}
              </h1>
            </div>

            {submitted && (
              <div className="mb-4 flex space-x-4">
                <button
                  onClick={() => setActiveTab("result")}
                  className={`px-4 py-1 rounded-full font-bold text-lg transition duration-300 shadow-md hover:shadow-lg ${
                    activeTab === "result"
                      ? "bg-cyan-600/70 text-white"
                      : "bg-cyan-600/30 text-white hover:bg-cyan-900/40"
                  }`}
                >
                  Results
                </button>
                <button
                  onClick={() => setActiveTab("leaderboard")}
                  className={`px-4 py-1 rounded-full font-bold text-lg transition duration-300 shadow-md hover:shadow-lg ${
                    activeTab === "leaderboard"
                      ? "bg-cyan-600/70 text-white"
                      : "bg-cyan-600/30 text-white hover:bg-cyan-900/40"
                  }`}
                >
                  Leaderboard
                </button>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="px-4 py-1 rounded-full bg-cyan-600/30 text-white font-bold text-lg hover:bg-cyan-900/40 transition duration-300 shadow-md hover:shadow-lg"
                >
                  Back to Home
                </button>
              </div>
            )}

            <div className="space-y-4 p-6 bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-4xl mx-auto">
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
                        className="bg-zinc-900 rounded-4xl p-4 shadow-md"
                      >
                        <h2 className="text-xl font-semibold mb-4">
                          Question {idx + 1} of {questions.length}
                        </h2>
                        <p className="mb-6 text-lg">{question.content}</p>
                        {question.imgURL && (
                          <img
                            src={question.imgURL}
                            alt={`Image for question ${idx + 1}`}
                            className="my-4 rounded-md max-w-xl h-auto"
                          />
                        )}

                        <div className="flex flex-col space-y-4">
                          {choices.map(({ key, text }) => {
                            const isSelected = userAnswers[idx] === key;
                            const bgClass = isSelected
                              ? "bg-cyan-600 hover:scale-105 "
                              : "bg-zinc-800 hover:bg-zinc-700 hover:scale-105";

                            return (
                              <button
                                key={key}
                                onClick={() => handleAnswer(idx, key)}
                                className={`px-4 py-3 rounded-xl text-left transition-all transform duration-200 ${bgClass} hover:scale-105`}
                              >
                                <span className="font-bold mr-2">
                                  {key.toUpperCase()}.
                                </span>
                                {text}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <div className="mt-8 text-center flex justify-center gap-6">
                    <button
                      onClick={() => handleSubmit(false)}
                      className="px-6 py-3 bg-cyan-600 rounded-xl hover:bg-cyan-900 text-white font-semibold"
                    >
                      Submit Game
                    </button>
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      className="px-6 py-3 bg-slate-700 rounded-xl hover:bg-slate-900 text-white font-semibold"
                    >
                      Quit Game
                    </button>
                  </div>
                </>
              )}

              {submitted && activeTab === "result" && (
                <>
                  {!finalResult ? (
                    <div className="text-center p-8">
                      <p className="text-xl font-semibold animate-pulse">Grading your answers...</p>
                    </div>
                  ) : (
                    <>
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
                            className="bg-zinc-900 rounded-4xl p-4 shadow-md"
                          >
                            <h3 className="text-xl font-semibold mb-4">
                              Question {idx + 1} of {questions.length}
                            </h3>
                            <p className="mb-6 text-lg">{question.content}</p>
                            {question.imgURL && (
                              <img
                                src={question.imgURL}
                                alt={`Image for question ${idx + 1}`}
                                className="my-4 rounded-md max-w-xl h-auto"
                              />
                            )}
                            <div className="flex flex-col space-y-4">
                              {choices.map(({ key, text }) => {
                                const isUserAnswer = userAnswer === key;
                                const isCorrect = correctAnswer === key;

                                // --- EDITED: Dynamic background class for highlighting ---
                                let bgClass = "bg-zinc-800"; // Default
                                if (isCorrect) {
                                  bgClass = "bg-emerald-600/40 ring-2 ring-emerald-500"; // Correct answer is always green
                                } else if (isUserAnswer) {
                                  bgClass = "bg-rose-600/40 ring-2 ring-rose-500"; // User's wrong answer is red
                                }

                                return (
                                  <div
                                    key={key}
                                    className={`px-4 py-3 rounded-xl text-left transition-colors duration-300 ${bgClass}`}
                                  >
                                    <span className="font-bold mr-2">
                                      {key.toUpperCase()}.
                                    </span>
                                    {text}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      <p className="mt-6 text-center text-xl font-bold">
                        Your Accuracy: {finalResult.correctCount} / {finalResult.totalQuestions}
                      </p>
                      <p className="mt-6 text-center text-xl font-bold">
                        Time Taken: {formatTime(timeTotal - (timeLeft ?? 0))}
                      </p>
                      <h1 className="mt-6 text-center text-3xl font-bold">
                        Your Score: {finalResult.score}
                      </h1>
                    </>
                  )}
                </>
              )}

              {submitted && activeTab === "leaderboard" && (
                <div className=" w-full  mx-auto">
                  <h2 className="text-3xl font-bold mb-6">Leaderboard</h2>
                  <div>No data yet</div>
                </div>
              )}
            </div>

            {timeLeft !== null && timeLeft > 0 && !submitted && (
              <div className="fixed top-35 right-50 flex flex-col items-center space-y-1">
                <span className="text-white font-semibold text-xl select-none">
                  Time Remaining:
                </span>
                <div className="fixed top-45 right-45 w-45 h-45 rounded-full bg-gradient-to-r from-cyan-600/30 to-cyan-600/30 shadow-lg border border-cyan-300 flex flex-col items-center justify-center text-white">
                  <div className="font-sans text-xl tracking-wider">
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {showConfirmModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
              <div className="bg-slate-800/90 rounded-2xl p-6 w-70 max-w-md shadow-2xl text-center">
                <h2 className="text-2xl font-bold mb-4 text-white">
                  Continue to Home?
                </h2>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => router.push("/home")}
                    className="px-4 py-1 bg-cyan-600 text-white font-bold rounded-sm hover:bg-cyan-900 transition"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-1 bg-slate-700 text-white font-bold rounded-sm hover:bg-slate-900 transition"
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
