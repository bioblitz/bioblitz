"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { Loader2, ArrowLeft, ChevronDown } from "lucide-react";
import Link from "next/link";
import { getFunctions, httpsCallable } from "firebase/functions";
import { DM_Sans } from "next/font/google";
import BookmarkButton from "@/components/ui/BookmarkButton";
import ReportButton from "@/components/ui/ReportQuestionButton";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

interface SubmissionData {
  correctCount: number;
  totalQuestions: number;
  timeTaken: number;
  userAnswers: { [key: string]: string };
  correctAnswers: { [key: string]: string };
  gameId: string;
  ratingDelta?: number;
  newElo?: number;
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
  const [gameTitle, setGameTitle] = useState("");
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const subRef = doc(firestore, "gameSubmissions", submissionId as string);
        const subSnap = await getDoc(subRef);

        if (!subSnap.exists()) {
          alert("Submission not found");
          router.push(`/home/${gameId}`);
          return;
        }
        const subData = subSnap.data() as SubmissionData;
        setSubmission(subData);

        const gameDocRef = doc(firestore, "sets", gameId as string);
        const gameSnap = await getDoc(gameDocRef);
        if (gameSnap.exists()) {
          setGameTitle(gameSnap.data().title || "");
        }

        const functions = getFunctions();
        const getPublicQuestions = httpsCallable(functions, "getPublicQuestions");
        const result = await getPublicQuestions({ gameId });
        setQuestions((result.data as { questions: Question[] }).questions);
      } catch (error) {
        console.error("Error loading review:", error);
      } finally {
        setLoading(false);
      }
    };

    if (gameId && submissionId) fetchData();
  }, [gameId, submissionId, router]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  const scrollToQuestion = (idx: number) => {
    const el = document.getElementById(`question-${idx}`);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: "smooth" });
  };

  if (loading || !submission) {
    return (
      <div className={`${dmSans.className} flex items-center justify-center h-screen bg-neutral-900 text-white`}>
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 text-neutral-500 animate-spin" />
          <p className="text-zinc-500 font-medium tracking-wide animate-pulse">Loading Review...</p>
        </div>
      </div>
    );
  }

  const accuracyPct =
    submission.totalQuestions > 0
      ? Math.round((submission.correctCount / submission.totalQuestions) * 100)
      : 0;

  return (
    <div className={`${dmSans.className} min-h-screen bg-neutral-900 text-white flex flex-col pt-24 pb-20 select-text`}>
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Fixed review panel — desktop */}
      <div className="fixed right-4 top-24 z-40 hidden lg:block">
        <div className="bg-[rgba(9,9,11,0.97)] border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden w-[168px]">
          <button
            onClick={() => setPanelCollapsed((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-zinc-400 hover:text-white transition-colors border-b border-zinc-800/60"
          >
            <span className={`text-[12px] font-semibold text-zinc-400`}>Review</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${panelCollapsed ? "-rotate-90" : ""}`} />
          </button>
          {!panelCollapsed && (
            <div className="p-3 max-h-[calc(100vh-11rem)] overflow-y-auto">
              <div className="grid grid-cols-4 gap-2.5">
                {questions.map((_, idx) => {
                  const userAnswer = submission.userAnswers[idx];
                  const correctAnswer = submission.correctAnswers?.[idx];
                  const isUnanswered = !userAnswer;
                  const isCorrect = !isUnanswered && userAnswer === correctAnswer;
                  const circleClass = isUnanswered
                    ? "bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-zinc-700"
                    : isCorrect
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30"
                    : "bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/30";
                  return (
                    <button
                      key={idx}
                      onClick={() => scrollToQuestion(idx)}
                      title={`Q${idx + 1}: ${isUnanswered ? "Unanswered" : isCorrect ? "Correct" : "Incorrect"}`}
                      className={`w-9 h-9 rounded-full border text-[11px] font-bold transition-all hover:scale-110 active:scale-95 ${circleClass}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex justify-center py-8 px-4 relative z-10">
        <div className="w-full max-w-4xl relative">

          {/* Header */}
          <div className="mb-8">
            <Link
              href={`/home/${gameId}`}
              className="inline-flex items-center text-zinc-500 hover:text-white mb-4 transition-colors font-medium text-[13px]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blitz Info
            </Link>
            <h1
              className="text-[32px] font-[900] text-white"
              style={{ letterSpacing: "-0.02em" }}
            >
              {gameTitle || "Attempt Review"}
            </h1>
            <div className="h-[3px] w-20 bg-neutral-600 rounded-full mt-4" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <div className="bg-[rgba(9,9,11,0.8)] border border-zinc-800 p-6 rounded-2xl text-center">
              <h2 className="text-zinc-500 font-medium text-[13px] mb-2">Accuracy</h2>
              <p className="text-[24px] font-[900] text-white">
                <span className="text-neutral-400">{submission.correctCount}</span>
                <span className={`text-zinc-600 text-[24px]`}> / {submission.totalQuestions}</span>
              </p>
            </div>
            <div className="bg-[rgba(9,9,11,0.8)] border border-zinc-800 p-6 rounded-2xl text-center">
              <h2 className="text-zinc-500 font-medium text-[13px] mb-2">Time Played</h2>
              <p className={`text-[24px] font-normal text-white`}>{formatTime(submission.timeTaken)}</p>
            </div>
            <div className="relative bg-[rgba(9,9,11,0.8)] border border-neutral-500/30 p-6 rounded-2xl text-center overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-neutral-600/[0.08] to-transparent pointer-events-none" />
              <h2 className="relative text-zinc-500 font-medium text-[13px] mb-2">Rating</h2>
              {submission.ratingDelta != null ? (
                <>
                  <p className={`relative text-[32px] font-normal ${submission.ratingDelta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {submission.ratingDelta >= 0 ? "+" : ""}{submission.ratingDelta}
                  </p>
                  {submission.newElo != null && (
                    <p className={`text-[11px] mt-1 text-zinc-500`}>→ {submission.newElo}</p>
                  )}
                </>
              ) : (
                <p className={`relative text-[18px] font-[700] text-zinc-500`}>Pending</p>
              )}
            </div>
          </div>

          {/* Mobile quick-nav */}
          <div className="flex lg:hidden gap-2.5 flex-wrap mb-6 p-3 bg-[rgba(9,9,11,0.8)] border border-zinc-800 rounded-2xl">
            <span className={`text-[12px] font-semibold text-zinc-400 w-full mb-1.5`}>Review</span>
            {questions.map((_, idx) => {
              const userAnswer = submission.userAnswers[idx];
              const correctAnswer = submission.correctAnswers?.[idx];
              const isUnanswered = !userAnswer;
              const isCorrect = !isUnanswered && userAnswer === correctAnswer;
              const circleClass = isUnanswered
                ? "bg-zinc-800 border-zinc-700 text-zinc-500"
                : isCorrect
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                : "bg-red-500/20 border-red-500/50 text-red-300";
              return (
                <button
                  key={idx}
                  onClick={() => scrollToQuestion(idx)}
                  className={`w-8 h-8 rounded-full border text-[10px] font-bold transition-all hover:scale-110 ${circleClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Questions */}
          <div className="space-y-6">
            {questions.map((question, idx) => {
              const choices = ["a", "b", "c", "d", "e"]
                .filter((key) => question[key as keyof Question])
                .map((key) => ({ key, text: question[key as keyof Question] as string }));

              const userAnswer = submission.userAnswers[idx];
              const correctAnswer = submission.correctAnswers?.[idx] ?? "";
              const isUnanswered = !userAnswer;
              const isCorrect = !isUnanswered && userAnswer === correctAnswer;

              const statusLabel = isUnanswered ? "Unanswered" : isCorrect ? "Correct" : "Incorrect";
              const statusDotClass = isUnanswered ? "bg-zinc-600" : isCorrect ? "bg-emerald-500" : "bg-red-500";
              const statusTextClass = isUnanswered ? "text-zinc-500" : isCorrect ? "text-emerald-400" : "text-red-400";

              return (
                <div
                  key={idx}
                  id={`question-${idx}`}
                  className="bg-[rgba(9,9,11,0.8)] border border-zinc-800 rounded-2xl p-6 md:p-8 scroll-mt-24"
                >
                  {/* Question header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-neutral-400 text-sm">Question {idx + 1}</span>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotClass}`} />
                      <span className={`text-[12px] font-semibold ${statusTextClass}`}>{statusLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
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
                  </div>

                  {/* Question text */}
                  <div
                    className="mb-6 text-[18px] leading-relaxed text-zinc-100 font-medium overflow-hidden [&_p]:mb-2 [&_p:last-child]:mb-0 [&_p]:text-left [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                    dangerouslySetInnerHTML={{ __html: question.content }}
                  />

                  {/* Image */}
                  {question.imgURL && (
                    <div className="mb-6 rounded-xl overflow-hidden border border-zinc-800 bg-neutral-900">
                      <img
                        src={question.imgURL}
                        alt={`Question ${idx + 1}`}
                        className="w-full max-h-[400px] object-contain"
                      />
                    </div>
                  )}

                  {/* Choices */}
                  <div className="flex flex-col space-y-2.5">
                    {choices.map(({ key, text }) => {
                      const isUserAnswer = userAnswer === key;
                      const isChoiceCorrect = correctAnswer === key;

                      const choiceClass = isChoiceCorrect
                        ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-300"
                        : isUserAnswer
                        ? "bg-red-500/10 border-red-500/50 text-red-300"
                        : "bg-[rgba(24,24,27,0.6)] text-zinc-300 border-zinc-700/60";

                      const badgeClass = isChoiceCorrect
                        ? "bg-emerald-500/20 text-emerald-300"
                        : isUserAnswer
                        ? "bg-red-500/20 text-red-300"
                        : "bg-neutral-900/30 text-zinc-500";

                      return (
                        <div
                          key={key}
                          className={`flex items-center w-full px-5 py-4 rounded-xl border ${choiceClass}`}
                        >
                          <span className={`flex items-center justify-center w-8 h-8 rounded-lg mr-4 font-normal text-[12px] uppercase flex-shrink-0 ${badgeClass}`}>
                            {key}
                          </span>
                          <span
                            className="text-[16px]"
                            dangerouslySetInnerHTML={{ __html: text }}
                          />
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
