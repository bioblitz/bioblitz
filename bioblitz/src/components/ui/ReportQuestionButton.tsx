"use client";

import { useState } from "react";
import { Flag, X, Send, Loader2 } from "lucide-react";
import { getAuth } from "firebase/auth";
import { doc, setDoc, getFirestore, serverTimestamp } from "firebase/firestore";
import { app } from "@/lib/firebase";

const db = getFirestore(app);

interface ReportButtonProps {
  gameId: string;
  questionIndex: number;
  gameTitle?: string;
}

export default function ReportButton({
  gameId,
  questionIndex,
  gameTitle,
}: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const auth = getAuth(app);

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user || !reason.trim()) return;

    setSending(true);
    try {
      const reportId = `${gameId}_q${questionIndex}_${user.uid}`;
      await setDoc(doc(db, "questionReports", reportId), {
        gameId,
        questionIndex,
        gameTitle: gameTitle || "",
        reason: reason.trim(),
        reportedBy: user.uid,
        reporterEmail: user.email || "",
        reporterName: user.displayName || "",
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setSent(true);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setReason("");
      }, 1500);
    } catch (err) {
      console.error("Error reporting question:", err);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <span className="p-1.5 rounded-lg text-emerald-400 bg-emerald-500/15">
        <Flag className="w-4 h-4" />
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        className={`p-1.5 rounded-lg transition-all ${
          open
            ? "text-red-400 bg-red-500/15"
            : "text-zinc-700 hover:text-zinc-400 hover:bg-zinc-800"
        }`}
        title="Report an issue with this question"
      >
        <Flag className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 bg-[rgba(9,9,11,0.95)] border border-zinc-800 rounded-xl p-4 shadow-2xl z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-bold text-zinc-200">
              Report Issue
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-600 hover:text-zinc-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the issue with this question."
            className="w-full bg-[rgba(24,24,27,0.5)] border border-zinc-700/40 rounded-lg px-3 py-2 text-[13px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-violet-500/50 resize-none min-h-[60px]"
            rows={2}
            autoFocus
          />
          <button
            onClick={handleSubmit}
            disabled={!reason.trim() || sending}
            className={`mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-bold transition-all ${
              reason.trim() && !sending
                ? "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            }`}
          >
            {sending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {sending ? "Sending..." : "Submit Report"}
          </button>
        </div>
      )}
    </div>
  );
}
