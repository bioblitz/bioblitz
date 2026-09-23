"use client";

import { Check, Lightbulb, Lock, X } from "lucide-react";
import { LiveQuestionView } from "@/lib/liveClient";

export type QuestionMode = "reading" | "answering" | "revealed";

/**
 * The question card, styled to match the solo blitz room.
 *
 * During `reading` the stem is up but the choices stay hidden, so everyone
 * gets the same few seconds to take the question in before the clock starts.
 * During `revealed` every choice is painted: green for the correct one, red
 * for a wrong pick the viewer made, with the question's written explanation
 * underneath when the set has one.
 */
export default function LiveQuestionPanel({
  question,
  index,
  total,
  mode,
  selected,
  correct,
  solution,
  locked = false,
  interactive = false,
  onPick,
}: {
  question: LiveQuestionView;
  index: number;
  total: number;
  mode: QuestionMode;
  selected?: string | string[];
  correct?: string | string[];
  /** Only ever passed once the answer is public — it gives it away. */
  solution?: string;
  locked?: boolean;
  interactive?: boolean;
  onPick?: (key: string) => void;
}) {
  const selectedKeys = Array.isArray(selected)
    ? selected
    : selected
      ? [selected]
      : [];
  const correctKeys = Array.isArray(correct) ? correct : correct ? [correct] : [];
  const revealed = mode === "revealed";

  return (
    <div className="bg-[rgba(9,9,11,0.8)] border border-neutral-800 rounded-2xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <span className="text-neutral-400 text-sm">
          Question {index + 1}
          <span className="text-neutral-600"> / {total}</span>
        </span>
        {question.multipleCorrect && (
          <span className="text-[11px] text-amber-400/80 font-medium">
            Select all that apply
          </span>
        )}
      </div>

      <div
        className="mb-6 text-[18px] md:text-[22px] leading-relaxed text-neutral-100 font-medium overflow-hidden [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
        dangerouslySetInnerHTML={{ __html: question.content }}
      />

      {question.imgURL && (
        <div className="mb-6 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900">
          <img
            src={question.imgURL}
            alt={`Question ${index + 1}`}
            className="w-full max-h-[340px] object-contain"
          />
        </div>
      )}

      {mode === "reading" ? (
        <div className="flex flex-col space-y-2.5">
          {question.choices.map(({ key }) => (
            <div
              key={key}
              className="flex items-center w-full px-5 py-4 rounded-xl border border-neutral-800 bg-[rgba(24,24,27,0.4)]"
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-lg mr-4 bg-neutral-900/40 text-neutral-700 text-[12px] uppercase">
                {key}
              </span>
              <span className="h-3 flex-1 max-w-[70%] rounded-full bg-neutral-800/80 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col space-y-2.5">
          {question.choices.map(({ key, text }) => {
            const isSelected = selectedKeys.includes(key);
            const isCorrect = correctKeys.includes(key);

            let styles =
              "bg-[rgba(24,24,27,0.6)] text-neutral-300 border-neutral-700/60";
            if (revealed) {
              if (isCorrect) {
                styles = "bg-emerald-500/10 border-emerald-500/50 text-emerald-300";
              } else if (isSelected) {
                styles = "bg-red-500/10 border-red-500/50 text-red-300";
              } else {
                styles = "bg-[rgba(24,24,27,0.4)] border-neutral-800 text-neutral-500";
              }
            } else if (isSelected) {
              styles =
                "bg-neutral-600 text-white border-neutral-500 shadow-lg shadow-neutral-900/30";
            }

            const clickable = interactive && mode === "answering" && !locked;

            return (
              <button
                key={key}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onPick?.(key)}
                className={`group flex items-center w-full px-5 py-4 rounded-xl text-left border transition-all duration-200 ${styles} ${
                  clickable
                    ? "hover:border-neutral-500/60 cursor-pointer active:scale-[0.995]"
                    : "cursor-default"
                }`}
              >
                <span
                  className={`flex items-center justify-center w-8 h-8 rounded-lg mr-4 text-[12px] uppercase transition-colors ${
                    revealed && isCorrect
                      ? "bg-emerald-500/20 text-emerald-300"
                      : revealed && isSelected
                        ? "bg-red-500/20 text-red-300"
                        : isSelected
                          ? "bg-white/20 text-white"
                          : "bg-neutral-900/40 text-neutral-500"
                  }`}
                >
                  {key}
                </span>
                <span
                  className="text-[16px] flex-1"
                  dangerouslySetInnerHTML={{ __html: text }}
                />
                {revealed && isCorrect && (
                  <Check className="w-4 h-4 text-emerald-400 ml-3 shrink-0" />
                )}
                {revealed && isSelected && !isCorrect && (
                  <X className="w-4 h-4 text-red-400 ml-3 shrink-0" />
                )}
                {!revealed && locked && isSelected && (
                  <Lock className="w-3.5 h-3.5 text-white/70 ml-3 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {revealed && solution && (
        <div className="mt-6 rounded-xl border border-neutral-800 bg-[rgba(24,24,27,0.5)] p-5">
          <div className="flex items-center gap-2 mb-2.5">
            <Lightbulb className="w-4 h-4 text-amber-400/80 shrink-0" />
            <h3 className="text-[13px] font-bold text-neutral-300">
              Explanation
            </h3>
          </div>
          {/* Authored in a plain textarea, unlike the rich-text question
              stem — so it is rendered as text, the way the solo review and
              the question pool render it. */}
          <p className="text-[15px] leading-relaxed text-neutral-400 whitespace-pre-wrap">
            {solution}
          </p>
        </div>
      )}
    </div>
  );
}
