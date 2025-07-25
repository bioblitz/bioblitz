"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

type Question = {
  a: string;
  b: string;
  c: string;
  content: string;
  correct: string;
  d?: string;
  e?: string;
  imgURL?: string;
};

type Tab = "result" | "leaderboard" | "home";

export default function GameRoomPage() {
  const { gameId } = useParams();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<{ [index: number]: string }>(
    {}
  );
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [gameTitle, setGameTitle] = useState("");
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [showTimeUpAlert, setShowTimeUpAlert] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    const loadQuestions = async () => {
      setLoading(true);
      try {
        const gameDocRef = doc(firestore, "sets", gameId);
        const gameDocSnap = await getDoc(gameDocRef);
        if (!gameDocSnap.exists()) {
          alert("Game not found!");
          router.push("/home");
          return;
        }

        const data = gameDocSnap.data();
        setGameTitle(data.title || "Untitled Game");
        setTimeLeft(data.timeLimit);

        const questionsColRef = collection(
          firestore,
          "sets",
          gameId,
          "questions"
        );

        const questionsSnap = await getDocs(questionsColRef);
        const loadedQuestions: Question[] = questionsSnap.docs.map(
          (doc) => doc.data() as Question
        );
        setQuestions(loadedQuestions);
      } catch (error) {
        console.error("Error loading questions:", error);
      }
      setLoading(false);
    };

    loadQuestions();
  }, [gameId, router]);

  useEffect(() => {
    if (timeLeft === null || submitted) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, submitted]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft <= 0 && !submitted) {
      setAutoSubmitted(true);
      setSubmitted(true);
      setActiveTab("result");
      setShowTimeUpAlert(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [timeLeft, submitted]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes} min${minutes !== 1 ? "s" : ""} ${seconds} sec${
      seconds !== 1 ? "s" : ""
    }`;
  };

  const submitBtnRef = useRef<HTMLButtonElement>(null);

  const handleAnswer = (questionIndex: number, choice: string) => {
    if (submitted) return;

    setUserAnswers((prev) => ({
      ...prev,
      [questionIndex]: choice,
    }));
  };

  const correctCount = Object.entries(userAnswers).filter(
    ([indexStr, answer]) => {
      const index = parseInt(indexStr);
      return questions[index]?.correct === answer;
    }
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        Loading questions...
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
      <nav className="h-12 bg-gray-900 text-white flex items-center justify-center px-6 shadow">
        Navbar goes here:
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-14 bg-gray-900 text-white p-4"></nav>
        <div className="min-h-screen bg-black text-white p-6 max-w-full">
          <div className="max-w-2xl ml-4">
            <div className="flex justify-between items-center mb-6">
              <h1 className="ml-2 text-center text-4xl font-bold text-white drop-shadow-md">
                Game: {gameTitle}
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
                      ref={submitBtnRef}
                      onClick={() => {
                        if (
                          !autoSubmitted &&
                          Object.keys(userAnswers).length < questions.length
                        ) {
                          alert(
                            "Please answer all questions before submitting."
                          );
                          return;
                        }
                        setSubmitted(true);
                        setActiveTab("result");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
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
                  {questions.map((question, idx) => {
                    const choices = ["a", "b", "c", "d", "e"]
                      .filter((key) => question[key as keyof Question])
                      .map((key) => ({
                        key,
                        text: question[key as keyof Question] as string,
                      }));

                    const userAnswer = userAnswers[idx];
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
                            const isCorrect = question.correct === key;

                            const bgClass = isCorrect
                              ? "bg-emerald-500/20"
                              : isUserAnswer
                              ? "bg-rose-600/20"
                              : "bg-zinc-800";

                            return (
                              <div
                                key={key}
                                className={`px-4 py-3 rounded-xl text-left ${bgClass}`}
                              >
                                <span className="font-bold mr-2">
                                  {key.toUpperCase()}.
                                </span>
                                {text}
                                {isUserAnswer && !isCorrect && (
                                  <span className="ml-2 text-rose-400 font-semibold"></span>
                                )}
                                {isCorrect && (
                                  <span className="ml-2 text-emerald-400 font-semibold"></span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <p className="mt-6 text-center text-xl font-bold">
                    Your Score: {correctCount} / {questions.length}
                  </p>
                </>
              )}

              {submitted && activeTab === "leaderboard" && (
                <div className=" w-full  mx-auto">
                  {" "}
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
