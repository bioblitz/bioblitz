"use client";

import { useState } from "react";
import Link from "next/link";
import { PoolQuestion } from "@/types";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Link2,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  Medium: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  Hard: "text-rose-300 bg-rose-500/10 border-rose-500/30",
};

export function difficultyBadgeClass(difficulty: string): string {
  return DIFFICULTY_STYLES[difficulty] || DIFFICULTY_STYLES.Medium;
}

interface PoolQuestionCardProps {
  question: PoolQuestion;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (question: PoolQuestion) => void;
  onDelete: (question: PoolQuestion) => void;
}

export default function PoolQuestionCard({
  question,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
}: PoolQuestionCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-2xl border bg-neutral-950/60 transition-colors ${
        selected
          ? "border-yellow-400/60 bg-yellow-400/[0.03]"
          : "border-neutral-800 hover:border-neutral-700"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          onClick={() => onToggleSelect(question.id)}
          aria-label={selected ? "Deselect question" : "Select question"}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
            selected
              ? "border-yellow-400 bg-yellow-400 text-neutral-900"
              : "border-neutral-700 text-transparent hover:border-neutral-500"
          }`}
        >
          <Check className="h-3.5 w-3.5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[11px] font-medium text-neutral-300">
              {question.topic}
            </span>
            <span
              className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${difficultyBadgeClass(
                question.difficulty,
              )}`}
            >
              {question.difficulty}
            </span>
            {question.source === "ai" && (
              <span className="flex items-center gap-1 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[11px] font-medium text-neutral-400">
                <Sparkles className="h-3 w-3" />
                AI
              </span>
            )}
            {question.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-neutral-800 bg-neutral-900/60 px-2 py-0.5 text-[11px] text-neutral-500"
              >
                {tag}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 block w-full text-left"
          >
            <div
              className={`prose-invert text-sm text-neutral-200 [&_p]:m-0 ${
                expanded ? "" : "line-clamp-2"
              }`}
              dangerouslySetInnerHTML={{ __html: question.content }}
            />
          </button>

          {expanded && (
            <div className="mt-3 space-y-3">
              {question.imageUrl && (
                <img
                  src={question.imageUrl}
                  alt=""
                  className="max-h-64 rounded-lg border border-neutral-800"
                />
              )}
              <div className="space-y-1.5">
                {question.choices.map((choice, idx) => {
                  const correct = question.correctAnswerIds.includes(choice.id);
                  return (
                    <div
                      key={choice.id}
                      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                        correct
                          ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "bg-neutral-900/60 text-neutral-400"
                      }`}
                    >
                      <span className="w-4 shrink-0 text-xs uppercase text-neutral-500">
                        {String.fromCharCode(97 + idx)}
                      </span>
                      <span>{choice.text}</span>
                    </div>
                  );
                })}
              </div>
              {question.solution && (
                <p className="text-xs italic text-neutral-500">
                  {question.solution}
                </p>
              )}
            </div>
          )}

          {/* Usage: how many sets this question is in, and links to each */}
          <div className="mt-3 border-t border-neutral-800/60 pt-2 text-xs">
            {question.usageCount === 0 ? (
              <span className="text-neutral-600">Not used in any set yet</span>
            ) : (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="flex items-center gap-1 text-neutral-400">
                  <Link2 className="h-3 w-3" />
                  Used in {question.usageCount} set
                  {question.usageCount === 1 ? "" : "s"}:
                </span>
                {question.usedIn.map((set, idx) => (
                  <span key={set.id} className="text-neutral-500">
                    <Link
                      href={`/contests/${set.id}`}
                      target="_blank"
                      className="text-yellow-300/90 underline-offset-2 hover:text-yellow-200 hover:underline"
                    >
                      {set.title}
                    </Link>
                    {set.status !== "completed" && (
                      <span className="ml-1 text-[10px] text-neutral-600">
                        (draft)
                      </span>
                    )}
                    {set.status === "completed" && set.hidden && (
                      <span className="ml-1 text-[10px] text-neutral-600">
                        (hidden)
                      </span>
                    )}
                    {idx < question.usedIn.length - 1 && (
                      <span className="text-neutral-700">,</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
            aria-label={expanded ? "Collapse question" : "Expand question"}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onEdit(question)}
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
            aria-label="Edit question"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(question)}
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
            aria-label="Delete question"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
