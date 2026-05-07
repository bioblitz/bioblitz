"use client";

import { useState, useRef } from "react";
import { EditableQuestion } from "@/types";
import { Upload, FileText, Sparkles, X, Check, ChevronDown, ChevronUp } from "lucide-react";

interface GenerateFromPdfModalProps {
  onApply: (questions: EditableQuestion[], mode: "replace" | "append") => void;
  onClose: () => void;
}

export default function GenerateFromPdfModal({ onApply, onClose }: GenerateFromPdfModalProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<EditableQuestion[] | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type === "application/pdf") setPdfFile(file);
  };

  const handleGenerate = async () => {
    if (!pdfFile) return;
    setLoading(true);
    setError(null);
    setGenerated(null);

    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);
      formData.append("instructions", instructions);

      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setGenerated(data.questions);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="font-bold text-white text-sm">Generate from PDF</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* PDF upload zone */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">PDF File</label>
            {pdfFile ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl">
                <FileText className="w-5 h-5 text-zinc-400 shrink-0" />
                <span className="text-sm text-zinc-200 truncate flex-1">{pdfFile.name}</span>
                <button
                  onClick={() => { setPdfFile(null); setGenerated(null); setError(null); }}
                  className="text-zinc-500 hover:text-white transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed transition-colors ${
                  dragging ? "border-neutral-500 bg-zinc-800/60" : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-800/40"
                }`}
              >
                <Upload className="w-6 h-6 text-zinc-500" />
                <span className="text-sm text-zinc-400">Drop a PDF here, or click to browse</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setPdfFile(f); }}
                />
              </div>
            )}
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Instructions <span className="text-zinc-600">(optional)</span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Focus on cell biology topics, generate 10 questions, avoid any questions about the introduction section..."
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Generated preview */}
          {generated && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">{generated.length} question{generated.length !== 1 ? "s" : ""} generated</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {generated.map((q, i) => (
                  <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className="text-xs text-zinc-500 shrink-0">Q{i + 1}</span>
                      <span className="text-sm text-zinc-200 truncate flex-1"
                        dangerouslySetInnerHTML={{ __html: q.content }}
                      />
                      {expandedIdx === i
                        ? <ChevronUp className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                        : <ChevronDown className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      }
                    </button>
                    {expandedIdx === i && (
                      <div className="px-4 pb-3 space-y-1.5 border-t border-zinc-800/60 pt-3">
                        {q.choices.map((c, ci) => (
                          <div
                            key={ci}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                              (q.correctAnswerIds ?? []).includes(c.id)
                                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                                : "bg-zinc-800/50 text-zinc-400"
                            }`}
                          >
                            <span className="text-xs uppercase text-zinc-500 w-4 shrink-0">
                              {String.fromCharCode(65 + ci)}
                            </span>
                            {c.text}
                          </div>
                        ))}
                        {q.solution && (
                          <p className="text-xs text-zinc-500 pt-1 italic">{q.solution}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!pdfFile || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-600 hover:bg-neutral-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate
              </>
            )}
          </button>

          {generated && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onApply(generated, "append")}
                className="px-4 py-2.5 text-sm font-bold text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-xl transition-colors"
              >
                Append
              </button>
              <button
                type="button"
                onClick={() => onApply(generated, "replace")}
                className="px-4 py-2.5 text-sm font-bold bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl transition-colors"
              >
                Replace all
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
