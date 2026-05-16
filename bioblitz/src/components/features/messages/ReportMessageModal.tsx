"use client";

import { useEffect, useState } from "react";
import { X, Flag, AlertTriangle, Loader2 } from "lucide-react";
import { reportMessage } from "@/lib/messages";

interface ReportMessageModalProps {
  conversationId: string;
  messageId: string;
  messageText: string;
  senderUid: string;
  reportedByUid: string;
  onClose: () => void;
}

type Reason = "harassment" | "spam" | "inappropriate" | "other";

const REASONS: { value: Reason; label: string }[] = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "spam", label: "Spam" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Other" },
];

export default function ReportMessageModal({
  conversationId,
  messageId,
  messageText,
  senderUid,
  reportedByUid,
  onClose,
}: ReportMessageModalProps) {
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, submitting]);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    setError(null);

    try {
      await reportMessage({
        conversationId,
        messageId,
        messageText,
        senderUid,
        reportedByUid,
        reason,
        details: details.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Report failed:", err);
      setError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-md mx-4 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-orange-400" />
            <h2 className="text-base font-bold text-white">
              {submitted ? "Report submitted" : "Report message"}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-neutral-500 hover:text-white transition-colors p-1 -mr-1 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-neutral-300 leading-relaxed mb-5">
              Thanks. Our team will review this report. You can also block this
              user from the conversation menu.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-bold transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="px-5 py-4 space-y-4">
              <p className="text-sm text-neutral-400">
                Why are you reporting this message?
              </p>
              <div className="space-y-2">
                {REASONS.map((r) => (
                  <label
                    key={r.value}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors
                      ${
                        reason === r.value
                          ? "bg-orange-500/10 border-orange-500/30 text-orange-300"
                          : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="accent-orange-500"
                    />
                    <span className="text-sm">{r.label}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs text-neutral-500 mb-1.5">
                  Additional details (optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="What happened?"
                  rows={3}
                  maxLength={500}
                  disabled={submitting}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors placeholder:text-neutral-600 resize-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-2 px-5 py-4 border-t border-neutral-800">
              <button
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason || submitting}
                className="flex-1 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
