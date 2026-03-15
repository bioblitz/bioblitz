"use client";

import {
  Calendar,
  CheckCircle2,
  XCircle,
  ListChecks,
  MousePointerClick,
  Trophy,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { DailyPuzzle } from "@/lib/potd";
import { getTopicColors } from "@/lib/utils";

interface PotdQuestionCardProps {
  puzzle: DailyPuzzle;
  isCompleted: boolean;
  selectedOptions: string[];
  isSubmitted: boolean;
  isCorrect: boolean;
  submitting: boolean;
  onOptionClick: (key: string) => void;
  onSubmit: () => void;
}

export default function PotdQuestionCard({
  puzzle,
  isCompleted,
  selectedOptions,
  isSubmitted,
  isCorrect,
  submitting,
  onOptionClick,
  onSubmit,
}: PotdQuestionCardProps) {
  const theme = getTopicColors(puzzle.topic);

  return (
    <section className="relative">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl group text-center">
        <div className="relative z-10 p-8 md:p-10 flex flex-col items-center">
          <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
            <span className="text-sm font-medium text-zinc-500 flex items-center gap-2 border border-zinc-800 px-3 py-1 rounded-full">
              <Calendar className="w-4 h-4" />
              {new Date(puzzle.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span
              className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${theme.bg}`}
            >
              {puzzle.topic}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 border border-zinc-800 px-2 py-1 rounded-md">
              {puzzle.multiSelect ? (
                <ListChecks className="w-3 h-3" />
              ) : (
                <MousePointerClick className="w-3 h-3" />
              )}
              {puzzle.multiSelect ? "Multi-Select" : "Single Select"}
            </span>

            {isCompleted && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-md uppercase tracking-wider">
                <CheckCircle2 className="w-3 h-3" />
                Completed
              </span>
            )}
          </div>

          <div className="space-y-4 mb-8 max-w-3xl mx-auto">
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
              const isCorrectKey = puzzle.correctAnswer.includes(option.key);
              const showResults = isSubmitted;

              let borderClass = "border-zinc-800 hover:border-zinc-700";
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
                borderClass = "border-orange-500/50";
                bgClass = "bg-orange-500/10";
                textClass = "text-orange-100";
              }

              return (
                <button
                  key={option.key}
                  disabled={showResults || submitting}
                  onClick={() => onOptionClick(option.key)}
                  className={`
                    relative flex items-center justify-center w-full p-4 rounded-xl border transition-all duration-200
                    ${bgClass} ${borderClass}
                    ${
                      isSelected && !showResults
                        ? "shadow-[0_0_20px_rgba(249,115,22,0.1)]"
                        : ""
                    }
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

                  <span className={`text-base text-center font-medium ${textClass}`}>
                    {option.text}
                  </span>

                  <div className="absolute right-4 animate-in zoom-in duration-200">
                    {!showResults && isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-orange-500" />
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
                    <h3 className="text-xl font-bold text-green-400">Correct!</h3>
                  </>
                ) : (
                  <>
                    <div className="bg-red-500/20 p-3 rounded-full">
                      <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-red-400">Incorrect.</h3>
                  </>
                )}
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left">
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
                onClick={onSubmit}
                className={`
                  px-12 py-3 rounded-xl font-bold text-base transition-all w-full md:w-auto flex items-center justify-center gap-2
                  ${
                    selectedOptions.length > 0 && !submitting
                      ? "bg-white text-black hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
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
  );
}
