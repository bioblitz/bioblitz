"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getFunctions, httpsCallable } from "firebase/functions";

// --- Types ---
interface SubmissionData {
  score: number;
  correctCount: number;
  totalQuestions: number;
  timeTaken: number;
  userAnswers: { [key: string]: string };
  correctAnswers: { [key: string]: string };
  gameId: string;
}

interface Question {
  content: string;
  a: string;
  b: string;
  c: string;
  d?: string;
  e?: string;
  imgURL?: string;
}

export default function ReviewPage() {
  const { gameId, submissionId } = useParams();
  const router = useRouter();

  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // fetch the specific submission
        const subRef = doc(firestore, "gameSubmissions", submissionId as string);
        const subSnap = await getDoc(subRef);

        if (!subSnap.exists()) {
          alert("Submission not found");
          router.push(`/home/${gameId}`);
          return;
        }
        const subData = subSnap.data() as SubmissionData;
        setSubmission(subData);

        const functions = getFunctions();
        const getPublicQuestions = httpsCallable(
          functions,
          "getPublicQuestions"
        );
        const result = await getPublicQuestions({ gameId: gameId });
        setQuestions((result.data as { questions: Question[] }).questions);
      } catch (error) {
        console.error("Error loading review:", error);
      } finally {
        setLoading(false);
      }
    };

    if (gameId && submissionId) {
      fetchData();
    }
  }, [gameId, submissionId, router]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes} min${minutes !== 1 ? "s" : ""} ${seconds} sec${
      seconds !== 1 ? "s" : ""
    }`;
  };

  if (loading || !submission) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-white">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
          <p className="text-zinc-500 font-medium tracking-wide animate-pulse">
            Loading Review...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans pt-24 pb-20 select-text">
      <div className="flex-1 flex justify-center py-8 px-4">
        <div className="w-full max-w-4xl relative">
          
          <div className="mb-8">
            <Link
              href={`/home/${gameId}`}
              className="inline-flex items-center text-zinc-400 hover:text-white mb-4 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blitz Info
            </Link>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-bold text-white tracking-tight">
                Attempt Review
              </h1>
            </div>
            <div className="h-1 w-20 bg-violet-600 rounded-full mt-4"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl text-center">
              <h2 className="text-zinc-400 font-medium mb-1">Accuracy</h2>
              <p className="text-3xl font-bold text-white">
                <span className="text-violet-500">
                  {submission.correctCount}
                </span>
                <span className="text-zinc-600 text-xl">
                  {" "}
                  / {submission.totalQuestions}
                </span>
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl text-center">
              <h2 className="text-zinc-400 font-medium mb-1">Time Played</h2>
              <p className="text-3xl font-bold text-white">
                {formatTime(submission.timeTaken)}
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl text-center">
              <h2 className="text-zinc-400 font-medium mb-1">Score</h2>
              <p className="text-3xl font-bold text-violet-500">
                {submission.score}
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {questions.map((question, idx) => {
              const choices = ["a", "b", "c", "d", "e"]
                .filter((key) => question[key as keyof Question])
                .map((key) => ({
                  key,
                  text: question[key as keyof Question] as string,
                }));
              
              const userAnswer = submission.userAnswers[idx];
              const correctAnswer = submission.correctAnswers
                ? submission.correctAnswers[idx]
                : "";

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
          </div>
        </div>
      </div>
    </div>
  );
}