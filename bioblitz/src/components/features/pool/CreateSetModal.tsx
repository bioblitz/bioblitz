"use client";

import { useState } from "react";
import Link from "next/link";
import {
  QUESTION_DIFFICULTIES,
  QUESTION_TOPICS,
} from "@/lib/questionShape";
import { Check, Layers, Shuffle, X } from "lucide-react";

export type PoolFilters = {
  topic: string;
  difficulty: string;
  source: string;
  usage: string;
};

interface CreateSetModalProps {
  selectedIds: string[];
  filters: PoolFilters;
  getToken: () => Promise<string | null>;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateSetModal({
  selectedIds,
  filters,
  getToken,
  onClose,
  onCreated,
}: CreateSetModalProps) {
  const [mode, setMode] = useState<"manual" | "auto">(
    selectedIds.length > 0 ? "manual" : "auto",
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [minutes, setMinutes] = useState("10");
  const [postAs, setPostAs] = useState("");
  const [publish, setPublish] = useState(false);

  const [autoTopic, setAutoTopic] = useState(filters.topic);
  const [autoDifficulty, setAutoDifficulty] = useState(filters.difficulty);
  const [autoSource, setAutoSource] = useState(filters.source);
  const [autoUsage, setAutoUsage] = useState(filters.usage === "used" ? "all" : "unused");
  const [count, setCount] = useState("10");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ setId: string; questionCount: number } | null>(null);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("You are signed out. Sign in again.");

      const res = await fetch("/api/staff/sets/from-pool", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode,
          title: title.trim(),
          description: description.trim(),
          topic,
          timeLimit: Math.max(1, Number(minutes) || 10) * 60,
          publish,
          postAsUsername: postAs.trim(),
          ...(mode === "manual"
            ? { questionIds: selectedIds }
            : {
                count: Number(count) || 10,
                filters: {
                  topic: autoTopic,
                  difficulty: autoDifficulty,
                  source: autoSource,
                  usage: autoUsage,
                },
              }),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create the set.");
      setCreated({ setId: data.setId, questionCount: data.questionCount });
      onCreated();
    } catch (err: any) {
      setError(err?.message || "Failed to create the set.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none";
  const labelClass = "mb-1 block text-xs text-neutral-500";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-6 py-4">
          <span className="text-sm font-bold text-white">Create a set from the pool</span>
          <button
            onClick={onClose}
            className="text-neutral-500 transition-colors hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {created ? (
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <Check className="h-4 w-4" />
              Created a set with {created.questionCount} question
              {created.questionCount === 1 ? "" : "s"}
              {publish ? " and published it." : " as a hidden draft."}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/contests/create/${created.setId}`}
                className="rounded-xl border border-yellow-300 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
              >
                Open in blitz editor
              </Link>
              <Link
                href={`/contests/${created.setId}`}
                className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
              >
                View set page
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-neutral-400 transition-colors hover:text-white"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex shrink-0 gap-2 border-b border-neutral-800 px-6 py-3">
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mode === "manual"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Selected questions ({selectedIds.length})
              </button>
              <button
                type="button"
                onClick={() => setMode("auto")}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mode === "auto"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Shuffle className="h-3.5 w-3.5" />
                Auto-generate
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {mode === "manual" ? (
                <p className="text-sm text-neutral-400">
                  {selectedIds.length === 0
                    ? "No questions selected — pick some in the pool, or switch to auto-generate."
                    : `${selectedIds.length} question${
                        selectedIds.length === 1 ? "" : "s"
                      } will be copied into the new set, in the order you selected them.`}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>Category</label>
                    <select
                      value={autoTopic}
                      onChange={(e) => setAutoTopic(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Any</option>
                      {QUESTION_TOPICS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Difficulty</label>
                    <select
                      value={autoDifficulty}
                      onChange={(e) => setAutoDifficulty(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Any</option>
                      {QUESTION_DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Written by</label>
                    <select
                      value={autoSource}
                      onChange={(e) => setAutoSource(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Anyone</option>
                      <option value="manual">Staff</option>
                      <option value="ai">AI</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Usage</label>
                    <select
                      value={autoUsage}
                      onChange={(e) => setAutoUsage(e.target.value)}
                      className={inputClass}
                    >
                      <option value="unused">Never used</option>
                      <option value="all">Any</option>
                      <option value="used">Already used</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}># of questions</label>
                    <input
                      value={count}
                      onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))}
                      inputMode="numeric"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              <div className="h-px bg-neutral-800" />

              <div>
                <label className={labelClass}>Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Cell Biology Blitz #4"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Description <span className="text-neutral-600">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>Set category</label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Auto (from questions)</option>
                    {QUESTION_TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Time limit (minutes)</label>
                  <input
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Post as <span className="text-neutral-600">(optional)</span>
                  </label>
                  <input
                    value={postAs}
                    onChange={(e) => setPostAs(e.target.value)}
                    placeholder="mitosisphere"
                    className={inputClass}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={publish}
                  onChange={(e) => setPublish(e.target.checked)}
                  className="h-4 w-4 accent-yellow-400"
                />
                Publish immediately (otherwise saved as a hidden draft)
              </label>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-neutral-800 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={
                  saving ||
                  !title.trim() ||
                  (mode === "manual" && selectedIds.length === 0)
                }
                className="flex items-center gap-2 rounded-xl bg-neutral-700 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-neutral-600 disabled:opacity-40"
              >
                {saving && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                Create set
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
