"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { Flag, CheckCircle, RotateCcw } from "lucide-react";
import Link from "next/link";

const db = getFirestore(app);

type ReportStatus = "all" | "pending" | "resolved";

interface Report {
  id: string;
  gameId: string;
  questionIndex: number;
  gameTitle: string;
  reason: string;
  reportedBy: string;
  reporterEmail: string;
  reporterName: string;
  status: "pending" | "resolved";
  createdAt: { seconds: number } | null;
}

export default function ReportedQuestionsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<ReportStatus>("pending");
  const [fetching, setFetching] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/auth");
      return;
    }
    const roles = Array.isArray(user.roles)
      ? user.roles.map((r: unknown) => String(r).toLowerCase())
      : [];
    const isStaff = roles.includes("admin") || roles.includes("staff");
    setAuthorized(isStaff);
  }, [loading, router, user]);

  useEffect(() => {
    if (!authorized) return;
    fetchReports();
  }, [authorized, filter]);

  const fetchReports = async () => {
    setFetching(true);
    try {
      const col = collection(db, "questionReports");
      const q =
        filter === "all"
          ? query(col, orderBy("createdAt", "desc"))
          : query(
              col,
              where("status", "==", filter),
              orderBy("createdAt", "desc"),
            );
      const snap = await getDocs(q);
      setReports(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Report, "id">),
        })),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const setStatus = async (id: string, status: "pending" | "resolved") => {
    setResolving(id);
    try {
      await updateDoc(doc(db, "questionReports", id), { status });
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setResolving(null);
    }
  };

  const formatTime = (ts: Report["createdAt"]) => {
    if (!ts) return "—";
    const d = new Date(ts.seconds * 1000);
    return d.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100">
        <div className="max-w-4xl mx-auto px-4 py-20">Loading...</div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100">
        <div className="max-w-4xl mx-auto px-4 py-20">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-neutral-400">
            You do not have permission to view this page.
          </p>
          <Link
            href="/home"
            className="mt-6 inline-block text-sm text-neutral-400 hover:text-neutral-300"
          >
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  const FILTERS: ReportStatus[] = ["all", "pending", "resolved"];

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="flex items-center gap-3 mb-2">
          <Flag className="w-5 h-5 text-neutral-400" />
          <h1 className="text-2xl font-bold">Reported Questions</h1>
        </div>
        <p className="text-neutral-500 text-sm mb-8">
          Questions flagged by users. Mark as resolved once reviewed.
        </p>

        <div className="flex gap-2 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filter === f
                  ? "bg-neutral-700 text-neutral-100"
                  : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {fetching ? (
          <p className="text-neutral-500 text-sm">Loading reports...</p>
        ) : reports.length === 0 ? (
          <p className="text-neutral-500 text-sm">
            No {filter === "all" ? "" : filter} reports found.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((r) => (
              <div
                key={r.id}
                className={`rounded-xl border px-5 py-4 flex flex-col gap-2 transition-all ${
                  r.status === "resolved"
                    ? "border-neutral-800 bg-neutral-900/40"
                    : "border-neutral-700/60 bg-neutral-800/30"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-200">
                        {r.gameTitle || r.gameId}
                      </p>
                      <span className="text-neutral-600 text-xs">·</span>
                      <span className="text-neutral-500 text-xs">
                        Question #{r.questionIndex + 1}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      {r.reporterName || r.reporterEmail || r.reportedBy} ·{" "}
                      {formatTime(r.createdAt)}
                    </p>
                  </div>

                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                      r.status === "resolved"
                        ? "bg-neutral-800 text-neutral-500"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>

                <p
                  className={`text-sm rounded-lg px-3 py-2 ${
                    r.status === "resolved"
                      ? "text-neutral-600 bg-neutral-900/60"
                      : "text-neutral-300 bg-neutral-900/50"
                  }`}
                >
                  {r.reason}
                </p>

                <div className="flex items-center gap-3 mt-0.5">
                  <Link
                    href={`/home/${r.gameId}`}
                    target="_blank"
                    className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
                  >
                    View game ↗
                  </Link>

                  <div className="ml-auto">
                    {r.status === "pending" ? (
                      <button
                        onClick={() => setStatus(r.id, "resolved")}
                        disabled={resolving === r.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-semibold hover:bg-neutral-700 hover:text-neutral-100 transition-all disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {resolving === r.id ? "Saving..." : "Mark resolved"}
                      </button>
                    ) : (
                      <button
                        onClick={() => setStatus(r.id, "pending")}
                        disabled={resolving === r.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-600 text-xs font-semibold hover:bg-neutral-800 hover:text-neutral-400 transition-all disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {resolving === r.id ? "Saving..." : "Unresolve"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
