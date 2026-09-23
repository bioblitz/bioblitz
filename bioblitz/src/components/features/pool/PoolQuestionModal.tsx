"use client";

import { useMemo, useState } from "react";
import { EditableQuestion, PoolQuestion } from "@/types";
import QuestionEditorForm from "@/components/forms/QuestionEditorForm";
import {
  QUESTION_DIFFICULTIES,
  QUESTION_TOPICS,
  validateEditableQuestion,
} from "@/lib/questionShape";
import { X } from "lucide-react";

interface PoolQuestionModalProps {
  question: PoolQuestion | null;
  getToken: () => Promise<string | null>;
  onClose: () => void;
  onSaved: () => void;
}

const emptyQuestion = (): EditableQuestion => ({
  id: Date.now().toString(),
  content: "",
  imageUrl: "",
  choices: [
    { id: "1", text: "" },
    { id: "2", text: "" },
  ],
  correctAnswerIds: [],
  isMultiSelect: false,
  solution: "",
});

export default function PoolQuestionModal({
  question,
  getToken,
  onClose,
  onSaved,
}: PoolQuestionModalProps) {
  const isEdit = !!question;
  const [draft, setDraft] = useState<EditableQuestion>(
    () => question ?? emptyQuestion(),
  );
  const [topic, setTopic] = useState(question?.topic || QUESTION_TOPICS[0]);
  const [difficulty, setDifficulty] = useState<string>(
    question?.difficulty || "Medium",
  );
  const [tagsText, setTagsText] = useState((question?.tags || []).join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tags = useMemo(
    () =>
      tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tagsText],
  );

  const handleSave = async () => {
    const errors = validateEditableQuestion(draft);
    if (errors.length > 0) {
      setError(errors.join(" "));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("You are signed out. Sign in again.");

      const payload = {
        content: draft.content,
        imageUrl: draft.imageUrl || "",
        choices: draft.choices,
        correctAnswerIds: draft.correctAnswerIds,
        isMultiSelect: draft.isMultiSelect === true,
        solution: draft.solution || "",
        topic,
        difficulty,
        tags,
      };

      const res = await fetch(
        isEdit ? `/api/staff/question-pool/${question!.id}` : "/api/staff/question-pool",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(
            isEdit ? { question: payload } : { questions: [{ ...payload, source: "manual" }] },
          ),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save question.");
      onSaved();
    } catch (err: any) {
      setError(err?.message || "Failed to save question.");
    } finally {
      setSaving(false);
    }
  };

  const selectClass =
    "w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-neutral-600 focus:outline-none";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-6 py-4">
          <span className="text-sm font-bold text-white">
            {isEdit ? "Edit pool question" : "New pool question"}
          </span>
          <button
            onClick={onClose}
            className="text-neutral-500 transition-colors hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-3 px-6 pt-5 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Category</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className={selectClass}
              >
                {QUESTION_TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className={selectClass}
              >
                {QUESTION_DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                Tags <span className="text-neutral-600">(comma separated)</span>
              </label>
              <input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="photosynthesis, C4"
                className={selectClass}
              />
            </div>
          </div>

          <QuestionEditorForm
            question={draft}
            onQuestionChange={setDraft}
            contestId="pool"
          />
        </div>

        <div className="shrink-0 border-t border-neutral-800 px-6 py-4">
          {error && (
            <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-neutral-700 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-neutral-600 disabled:opacity-40"
            >
              {saving && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {isEdit ? "Save changes" : "Add to pool"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
