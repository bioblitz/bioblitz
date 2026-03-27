"use client";

import React from "react";
import { IQuestionForDisplay } from "@/types";

type ContestQuestionViewProps = {
  question: IQuestionForDisplay;
  questionNumber: number;
  selectedAnswer?: string;
  correctAnswerKey?: string;
};

const CHOICE_KEYS = ["a", "b", "c", "d", "e"] as const;

const ContestQuestionView: React.FC<ContestQuestionViewProps> = ({
  question,
  questionNumber,
  selectedAnswer,
  correctAnswerKey,
}) => {
  const choices = CHOICE_KEYS.filter(
    (k) => question[k as keyof IQuestionForDisplay] !== undefined,
  ).map((k) => ({ key: k, text: question[k as keyof IQuestionForDisplay] as string }));

  return (
    <div className="bg-[rgba(9,9,11,0.8)] border border-zinc-800 rounded-2xl p-6 md:p-8">
      <div className="flex items-center mb-4">
        <span
          className="bg-neutral-500/10 text-neutral-400 text-[11px] font-[800] px-3 py-1 rounded-lg border border-neutral-500/20"
          style={{ letterSpacing: "0.06em" }}
        >
          Question {questionNumber}
        </span>
      </div>

      <div
        className="mb-6 text-[18px] leading-relaxed text-zinc-100 font-medium overflow-hidden [&_p]:mb-2 [&_p:last-child]:mb-0 [&_p]:text-left [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
        dangerouslySetInnerHTML={{ __html: question.content }}
      />

      {question.imgURL && (
        <div className="mb-6 rounded-xl overflow-hidden border border-zinc-800 bg-neutral-900">
          <img
            src={question.imgURL}
            alt={`Question ${questionNumber}`}
            className="w-full max-h-[400px] object-contain"
          />
        </div>
      )}

      <div className="flex flex-col space-y-2.5">
        {choices.map(({ key, text }) => {
          const isCorrect = key === correctAnswerKey;
          const isSelected = key === selectedAnswer && key !== correctAnswerKey;

          let rowClass =
            "flex items-center w-full px-5 py-4 rounded-xl border transition-all duration-200 ";
          let keyBadgeClass =
            "flex items-center justify-center w-8 h-8 rounded-lg mr-4 font-[800] text-[12px] uppercase ";

          if (isCorrect) {
            rowClass += "bg-emerald-500/10 border-emerald-500/50 text-emerald-300";
            keyBadgeClass += "bg-emerald-500/20 text-emerald-400";
          } else if (isSelected) {
            rowClass += "bg-red-500/10 border-red-500/50 text-red-300";
            keyBadgeClass += "bg-red-500/20 text-red-400";
          } else {
            rowClass +=
              "bg-[rgba(24,24,27,0.6)] text-zinc-300 border-zinc-700/60";
            keyBadgeClass += "bg-neutral-900/30 text-zinc-500";
          }

          return (
            <div key={key} className={rowClass}>
              <span className={keyBadgeClass}>{key}</span>
              <span
                className="text-[16px]"
                dangerouslySetInnerHTML={{ __html: text }}
              />
              {isCorrect && (
                <span className="ml-auto text-emerald-400 font-[800] text-[11px] tracking-wider shrink-0">
                  CORRECT
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContestQuestionView;
