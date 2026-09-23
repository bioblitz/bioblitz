"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Trash2,
  X,
  ExternalLink,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";
import {
  dismissReport,
  deleteReportedMessage,
  type MessageReport,
} from "@/lib/moderation";

interface ReportCardProps {
  report: MessageReport;
  staffUid: string;
}

interface UserSummary {
  displayName: string;
  username?: string;
  photoURL?: string;
}

const REASON_LABELS: Record<MessageReport["reason"], string> = {
  harassment: "Harassment",
  spam: "Spam",
  inappropriate: "Inappropriate",
  other: "Other",
};

const REASON_COLORS: Record<MessageReport["reason"], string> = {
  harassment: "bg-red-500/10 text-red-400 border-red-500/30",
  spam: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  inappropriate: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  other: "bg-neutral-500/10 text-neutral-400 border-neutral-500/30",
};

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  return new Date(ms).toLocaleDateString();
}

export default function ReportCard({ report, staffUid }: ReportCardProps) {
  const [sender, setSender] = useState<UserSummary | null>(null);
  const [reporter, setReporter] = useState<UserSummary | null>(null);
  const [actionInProgress, setActionInProgress] = useState<
    "dismiss" | "delete" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirestore(app);
    Promise.all([
      getDoc(doc(db, "users", report.senderUid)),
      getDoc(doc(db, "users", report.reportedByUid)),
    ]).then(([senderSnap, reporterSnap]) => {
      if (senderSnap.exists()) {
        const d = senderSnap.data();
        setSender({
          displayName: d.displayName || "User",
          username: d.username,
          photoURL: d.photoURL,
        });
      }
      if (reporterSnap.exists()) {
        const d = reporterSnap.data();
        setReporter({
          displayName: d.displayName || "User",
          username: d.username,
          photoURL: d.photoURL,
        });
      }
    });
  }, [report.senderUid, report.reportedByUid]);

  const handleDismiss = async () => {
    setActionInProgress("dismiss");
    setError(null);
    try {
      await dismissReport(report.id, staffUid);
    } catch (err) {
      console.error("Dismiss failed:", err);
      setError("Something went wrong.");
      setActionInProgress(null);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Delete this message? It will show as 'Message deleted' to both users.",
      )
    )
      return;
    setActionInProgress("delete");
    setError(null);
    try {
      await deleteReportedMessage({
        reportId: report.id,
        conversationId: report.conversationId,
        messageId: report.messageId,
        staffUid,
      });
    } catch (err) {
      console.error("Delete failed:", err);
      setError("Something went wrong.");
      setActionInProgress(null);
    }
  };

  const isResolved = report.status === "resolved";

  return (
    <div
      className={`relative bg-neutral-950 border rounded-xl p-4 md:p-5 ${
        isResolved ? "border-neutral-800/50 opacity-60" : "border-neutral-800"
      }`}
    >
      {/* Top row: reason badge + timestamp */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <span
          className={`text-[10px] font-bold tracking-wider px-2 py-1 rounded-full border ${REASON_COLORS[report.reason]}`}
        >
          {REASON_LABELS[report.reason]}
        </span>
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
          <Clock className="w-3 h-3" />
          {formatRelative(report.createdAt)}
        </div>
      </div>

      {/* The reported message */}
      <div className="mb-4">
        <p className="text-[10px] text-neutral-500 tracking-wider mb-1.5">
          Reported message
        </p>
        <div className="bg-neutral-900 border border-neutral-800/50 rounded-lg px-3.5 py-2.5">
          <p className="text-sm text-neutral-200 whitespace-pre-wrap break-words">
            {report.messageText}
          </p>
        </div>
      </div>

      {/* People */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <UserPill label="Sent by" user={sender} uid={report.senderUid} />
        <UserPill
          label="Reported by"
          user={reporter}
          uid={report.reportedByUid}
        />
      </div>

      {/* Details */}
      {report.details && (
        <div className="mb-4">
          <p className="text-[10px] text-neutral-500 tracking-wider mb-1">
            Reporter notes
          </p>
          <p className="text-sm text-neutral-400 italic">
            &quot;{report.details}&quot;
          </p>
        </div>
      )}

      {/* Resolution info (if resolved) */}
      {isResolved && (
        <div className="mb-3 px-3 py-2 bg-neutral-900/50 border border-neutral-800/50 rounded-lg flex items-center gap-2 text-xs text-neutral-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          {report.resolution === "deleted_message"
            ? "Message deleted"
            : "Dismissed"}
          {report.resolvedAt && (
            <span className="text-neutral-600">
              · {formatRelative(report.resolvedAt)}
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      {!isResolved && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleDismiss}
            disabled={!!actionInProgress}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors disabled:opacity-50"
          >
            {actionInProgress === "dismiss" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <X className="w-3.5 h-3.5" />
            )}
            Dismiss
          </button>
          <button
            onClick={handleDelete}
            disabled={!!actionInProgress}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-bold transition-colors disabled:opacity-50 border border-red-500/30"
          >
            {actionInProgress === "delete" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Delete message
          </button>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------
// Small helpers
// --------------------------------------------------------------------

function UserPill({
  label,
  user,
  uid,
}: {
  label: string;
  user: UserSummary | null;
  uid: string;
}) {
  const profileHref = user?.username ? `/profile/${user.username}` : null;

  const inner = (
    <div className="flex items-center gap-2 min-w-0">
      {user?.photoURL ? (
        <img
          src={user.photoURL}
          alt={user.displayName}
          className="w-7 h-7 rounded-full object-cover border border-neutral-800 shrink-0"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-400 shrink-0">
          {(user?.displayName || "?")[0].toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-neutral-500 tracking-wider leading-none mb-0.5">
          {label}
        </p>
        <p className="text-xs font-medium text-neutral-200 truncate">
          {user?.username || user?.displayName || uid.slice(0, 8)}
        </p>
      </div>
      {profileHref && (
        <ExternalLink className="w-3 h-3 text-neutral-600 shrink-0" />
      )}
    </div>
  );

  return profileHref ? (
    <Link
      href={profileHref}
      className="block bg-neutral-900 border border-neutral-800/50 hover:border-neutral-700 rounded-lg px-3 py-2 transition-colors"
    >
      {inner}
    </Link>
  ) : (
    <div className="bg-neutral-900 border border-neutral-800/50 rounded-lg px-3 py-2">
      {inner}
    </div>
  );
}
