"use client";

import { useRef, useState } from "react";
import {
  QUESTION_DIFFICULTIES,
  QUESTION_TOPICS,
} from "@/lib/questionShape";
import {
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  ImageIcon,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

type DraftQuestion = {
  id: string;
  content: string;
  imageUrl: string;
  choices: { id: string; text: string }[];
  correctAnswerIds: string[];
  isMultiSelect: boolean;
  solution: string;
  topic: string;
  difficulty: string;
};

interface AiIngestModalProps {
  getToken: () => Promise<string | null>;
  onClose: () => void;
  onAdded: (count: number) => void;
}

const ACCEPTED = "application/pdf,image/png,image/jpeg,image/gif,image/webp";

function isSupported(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    ["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type)
  );
}

export default function AiIngestModal({
  getToken,
  onClose,
  onAdded,
}: AiIngestModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [instructions, setInstructions] = useState("");
  const [count, setCount] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftQuestion[] | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: File[]) => {
    const supported = incoming.filter(isSupported);
    if (supported.length !== incoming.length) {
      setError("Only PDFs and images (PNG, JPEG, GIF, WebP) are supported.");
    }
    if (supported.length > 0) {
      setFiles((prev) => [...prev, ...supported].slice(0, 10));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = Array.from(e.clipboardData?.files || []);
    if (pasted.length > 0) {
      e.preventDefault();
      addFiles(pasted);
    }
  };

  const handleGenerate = async () => {
    if (files.length === 0 && !text.trim()) {
      setError("Paste some text or attach an image or PDF first.");
      return;
    }
    setLoading(true);
    setError(null);
    setDrafts(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("You are signed out. Sign in again.");

      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      if (text.trim()) formData.append("text", text.trim());
      if (instructions.trim()) formData.append("instructions", instructions.trim());
      if (count.trim()) formData.append("count", count.trim());

      const res = await fetch("/api/staff/question-pool/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Generation failed.");

      setDrafts(data.questions as DraftQuestion[]);
      setExcluded(new Set());
      setExpandedId(null);
    } catch (err: any) {
      setError(err?.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (id: string, partial: Partial<DraftQuestion>) => {
    setDrafts((prev) =>
      prev ? prev.map((q) => (q.id === id ? { ...q, ...partial } : q)) : prev,
    );
  };

  const toggleExcluded = (id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedDrafts = (drafts || []).filter((q) => !excluded.has(q.id));

  const handleAddToPool = async () => {
    if (selectedDrafts.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("You are signed out. Sign in again.");

      const res = await fetch("/api/staff/question-pool", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questions: selectedDrafts.map((q) => ({
            content: q.content,
            imageUrl: q.imageUrl || "",
            choices: q.choices,
            correctAnswerIds: q.correctAnswerIds,
            isMultiSelect: q.isMultiSelect,
            solution: q.solution,
            topic: q.topic,
            difficulty: q.difficulty,
            source: "ai",
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add questions.");
      onAdded(data.count ?? selectedDrafts.length);
    } catch (err: any) {
      setError(err?.message || "Failed to add questions.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onPaste={handlePaste}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-bold text-white">Add to pool with AI</span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 transition-colors hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div>
            <label className="mb-2 block text-xs font-medium text-neutral-400">
              Images or PDFs
            </label>
            <div
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                addFiles(Array.from(e.dataTransfer.files || []));
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors ${
                dragging
                  ? "border-neutral-500 bg-neutral-800/60"
                  : "border-neutral-700 bg-neutral-900/40 hover:border-neutral-600 hover:bg-neutral-800/40"
              }`}
            >
              <Upload className="h-5 w-5 text-neutral-500" />
              <span className="text-sm text-neutral-400">
                Drop, paste, or click to attach images and PDFs
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(Array.from(e.target.files || []));
                  e.target.value = "";
                }}
              />
            </div>

            {files.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {files.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2"
                  >
                    {file.type === "application/pdf" ? (
                      <FileText className="h-4 w-4 shrink-0 text-neutral-500" />
                    ) : (
                      <ImageIcon className="h-4 w-4 shrink-0 text-neutral-500" />
                    )}
                    <span className="flex-1 truncate text-sm text-neutral-300">
                      {file.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFiles((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      className="text-neutral-500 transition-colors hover:text-white"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-neutral-400">
              Pasted text <span className="text-neutral-600">(optional)</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="Paste passages, notes, or an existing question set here..."
              className={`${inputClass} resize-y`}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
            <div>
              <label className="mb-2 block text-xs font-medium text-neutral-400">
                Instructions <span className="text-neutral-600">(optional)</span>
              </label>
              <input
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. focus on the diagrams, keep questions USABO-level"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-neutral-400">
                How many
              </label>
              <input
                value={count}
                onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))}
                placeholder="auto"
                inputMode="numeric"
                className={inputClass}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {drafts && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">
                  {drafts.length} generated · {selectedDrafts.length} selected
                </span>
              </div>
              <div className="space-y-2">
                {drafts.map((q, i) => {
                  const included = !excluded.has(q.id);
                  return (
                    <div
                      key={q.id}
                      className={`overflow-hidden rounded-xl border bg-neutral-900 ${
                        included ? "border-neutral-800" : "border-neutral-900 opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleExcluded(q.id)}
                          aria-label={included ? "Exclude question" : "Include question"}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                            included
                              ? "border-yellow-400 bg-yellow-400 text-neutral-900"
                              : "border-neutral-700 text-transparent"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <span className="shrink-0 text-xs text-neutral-500">
                          Q{i + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                          className="flex-1 truncate text-left text-sm text-neutral-200"
                        >
                          {q.content}
                        </button>
                        {expandedId === q.id ? (
                          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-neutral-600" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-600" />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 border-t border-neutral-800/60 px-4 py-2">
                        <select
                          value={q.topic}
                          onChange={(e) => updateDraft(q.id, { topic: e.target.value })}
                          className="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-300"
                        >
                          {QUESTION_TOPICS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <select
                          value={q.difficulty}
                          onChange={(e) =>
                            updateDraft(q.id, { difficulty: e.target.value })
                          }
                          className="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-300"
                        >
                          {QUESTION_DIFFICULTIES.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      {expandedId === q.id && (
                        <div className="space-y-1.5 border-t border-neutral-800/60 px-4 py-3">
                          {q.choices.map((c, ci) => (
                            <div
                              key={c.id}
                              className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                                q.correctAnswerIds.includes(c.id)
                                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                  : "bg-neutral-800/50 text-neutral-400"
                              }`}
                            >
                              <span className="w-4 shrink-0 text-xs uppercase text-neutral-500">
                                {String.fromCharCode(97 + ci)}
                              </span>
                              {c.text}
                            </div>
                          ))}
                          {q.solution && (
                            <p className="pt-1 text-xs italic text-neutral-500">
                              {q.solution}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-neutral-800 px-6 py-4">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-neutral-700 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-neutral-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {drafts ? "Regenerate" : "Generate"}
              </>
            )}
          </button>

          {drafts && (
            <button
              type="button"
              onClick={handleAddToPool}
              disabled={saving || selectedDrafts.length === 0}
              className="flex items-center gap-2 rounded-xl border border-yellow-300 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
            >
              {saving && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              Add {selectedDrafts.length} to pool
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
