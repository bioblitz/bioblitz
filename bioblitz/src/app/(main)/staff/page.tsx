"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  limit,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import {
  Flag,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Wrench,
  Zap,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const mono = jetbrainsMono.className;

const db = getFirestore(app);

interface QuestionData {
  content: string;
  a: string;
  b: string;
  c: string;
  d?: string;
  e?: string;
  imgURL?: string;
}

interface ReportWithQuestion {
  id: string;
  gameId: string;
  gameTitle: string;
  questionIndex: number;
  reason: string;
  reporterName: string;
  reporterEmail: string;
  reportedBy: string;
  status: string;
  createdAt: any;
  question: QuestionData | null;
  correctAnswer: string;
  answers: { key: string; text: string }[];
}

export default function StaffPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [reports, setReports] = useState<ReportWithQuestion[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/auth");
      return;
    }

    const roles = Array.isArray(user.roles)
      ? user.roles.map((role: unknown) => String(role).toLowerCase())
      : [];
    const isAdmin = roles.includes("admin");
    const isStaff = isAdmin || roles.includes("staff");

    setAuthorized(isStaff);
    if (isStaff) loadReports();
  }, [loading, router, user]);

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const q = query(
        collection(db, "questionReports"),
        where("status", "==", "pending"),
      );
      const snap = await getDocs(q);
      const rawReports = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as any[];

      const gameIds = [...new Set(rawReports.map((r) => r.gameId))];
      const functions = getFunctions();
      const getPublicQuestions = httpsCallable(functions, "getPublicQuestions");
      const questionsMap = new Map<string, QuestionData[]>();
      const correctAnswersMap = new Map<string, Record<number, string>>();
      const titlesMap = new Map<string, string>();

      await Promise.all(
        gameIds.map(async (gameId) => {
          try {
            // Fetch question text via cloud function
            const result = await getPublicQuestions({ gameId });
            const questions = (result.data as { questions: QuestionData[] })
              .questions;
            questionsMap.set(gameId, questions);

            // Fetch title from set doc
            const setSnap = await getDoc(doc(db, "sets", gameId));
            if (setSnap.exists()) {
              titlesMap.set(gameId, setSnap.data().title || "");
            }

            // Fetch correct answers from any graded submission for this game
            const subQ = query(
              collection(db, "gameSubmissions"),
              where("gameId", "==", gameId),
              where("status", "==", "graded"),
              limit(1),
            );
            const subSnap = await getDocs(subQ);
            if (!subSnap.empty) {
              const subData = subSnap.docs[0].data();
              if (subData.correctAnswers) {
                correctAnswersMap.set(gameId, subData.correctAnswers);
              }
            }
          } catch (err) {
            console.error(`Failed to fetch data for ${gameId}:`, err);
          }
        }),
      );

      const resolved: ReportWithQuestion[] = rawReports.map((r) => {
        const questions = questionsMap.get(r.gameId);
        const question = questions?.[r.questionIndex] || null;
        const gameCorrects = correctAnswersMap.get(r.gameId);
        const correctAnswer = gameCorrects?.[r.questionIndex ?? 0] || "";
        const answers = question
          ? (["a", "b", "c", "d", "e"] as const)
              .filter((key) => question[key])
              .map((key) => ({ key, text: question[key] as string }))
          : [];

        return {
          id: r.id,
          gameId: r.gameId,
          gameTitle: r.gameTitle || titlesMap.get(r.gameId) || "Unknown Blitz",
          questionIndex: r.questionIndex ?? 0,
          reason: r.reason || "",
          reporterName: r.reporterName || "",
          reporterEmail: r.reporterEmail || "",
          reportedBy: r.reportedBy || "",
          status: r.status,
          createdAt: r.createdAt,
          question,
          correctAnswer,
          answers,
        };
      });

      resolved.sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const db_ = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return db_ - da;
      });

      setReports(resolved);
      setReportsLoaded(true);
    } catch (err) {
      console.error("Error loading reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const resolveReport = async (reportId: string) => {
    try {
      await updateDoc(doc(db, "questionReports", reportId), {
        status: "resolved",
      });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      if (expandedId === reportId) setExpandedId(null);
    } catch (err) {
      console.error("Error resolving report:", err);
    }
  };

  if (loading) {
    return (
      <div
        className={`${dmSans.className} min-h-screen bg-black flex items-center justify-center`}
      >
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div
        className={`${dmSans.className} min-h-screen bg-black text-zinc-100`}
      >
        <div className="max-w-5xl mx-auto px-4 py-20">
          <h1 className="text-3xl font-[900] mb-4">Access Denied</h1>
          <p className="text-zinc-400">
            You do not have permission to view this page.
          </p>
          <div className="mt-6">
            <Link
              href="/home"
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              Return to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${dmSans.className} min-h-screen bg-black text-zinc-100`}>
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-25 pt-24 pb-16 relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-violet-500/15 border border-violet-500/30 p-2.5 rounded-xl">
            <Shield className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1
              className="text-[28px] font-[900] text-white"
              style={{ letterSpacing: "-0.02em" }}
            >
              Staff
            </h1>
            <p className="text-zinc-500 text-[13px]">
              Content management and moderation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="lg:pl-6">
            <div className="max-w-[450px] space-y-3">
              <div className="flex items-center gap-2.5 mb-4">
                <Wrench className="w-5 h-5 text-zinc-400" />
                <h2 className="text-[20px] font-bold text-white">Actions</h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push("/contests/create?postAs=mitosisphere")
                }
                className="w-full px-4 py-3 rounded-xl bg-[rgba(9,9,11,0.8)] border border-zinc-800 text-left hover:border-violet-500/40 hover:bg-zinc-900/60 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-violet-500/15 p-1.5 rounded-lg">
                    <Zap className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-zinc-200 group-hover:text-white transition-colors">
                      Create Blitz
                    </p>
                    <p className="text-[11px] text-zinc-600">
                      Post as mitosisphere
                    </p>
                  </div>
                </div>
              </button>

              <Link href="/potd/staff" className="block">
                <div className="w-full px-4 py-3 rounded-xl bg-[rgba(9,9,11,0.8)] border border-zinc-800 hover:border-orange-500/40 hover:bg-zinc-900/60 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-500/15 p-1.5 rounded-lg">
                      <Flag className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-zinc-200 group-hover:text-white transition-colors">
                        POTD Queue
                      </p>
                      <p className="text-[11px] text-zinc-600">
                        Manage daily problems
                      </p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/admin" className="block">
                <div className="w-full px-4 py-3 rounded-xl bg-[rgba(9,9,11,0.8)] border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="bg-zinc-800 p-1.5 rounded-lg">
                      <Shield className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-zinc-200 group-hover:text-white transition-colors">
                        Admin Panel
                      </p>
                      <p className="text-[11px] text-zinc-600">
                        Users & permissions
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Flag className="w-5 h-5 text-red-400" />
                <h2 className="text-[17px] font-bold text-white">
                  Reported Questions
                </h2>
                {reports.length > 0 && (
                  <span
                    className={`${mono} text-[10px] font-[800] bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-md`}
                  >
                    {reports.length}
                  </span>
                )}
              </div>
              {reportsLoaded && (
                <button
                  onClick={loadReports}
                  className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Refresh
                </button>
              )}
            </div>

            {loadingReports ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
                  <span className="text-zinc-600 text-[13px]">
                    Loading reports...
                  </span>
                </div>
              </div>
            ) : reports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-14 text-center">
                <CheckCircle2 className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
                <p className="text-zinc-600 text-sm">
                  No pending reports. All clear.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {reports.map((report) => {
                    const isExpanded = expandedId === report.id;

                    return (
                      <motion.div
                        key={report.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-2xl border border-zinc-800 bg-[rgba(9,9,11,0.8)] overflow-hidden"
                      >
                        <div
                          className="flex items-start gap-4 p-4 cursor-pointer hover:bg-zinc-900/40 transition-colors"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : report.id)
                          }
                        >
                          <div className="bg-red-500/10 border border-red-500/25 p-1.5 rounded-lg mt-0.5 flex-shrink-0">
                            <Flag className="w-3.5 h-3.5 text-red-400" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[14px] font-bold text-zinc-200 truncate">
                                {report.gameTitle}
                              </span>
                              <span
                                className={`${mono} text-[11px] text-zinc-600`}
                              >
                                Q{report.questionIndex + 1}
                              </span>
                            </div>
                            <p className="text-[13px] text-zinc-400 leading-relaxed line-clamp-2">
                              &ldquo;{report.reason}&rdquo;
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-600">
                              <span>
                                {report.reporterName ||
                                  report.reporterEmail ||
                                  "Unknown"}
                              </span>
                              <span>·</span>
                              <span>
                                {report.createdAt?.toDate
                                  ? report.createdAt
                                      .toDate()
                                      .toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      })
                                  : ""}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Link
                              href={`/home/${report.gameId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 rounded-lg text-zinc-700 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                              title="View blitz"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                resolveReport(report.id);
                              }}
                              className="p-2 rounded-lg text-zinc-700 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                              title="Mark as resolved"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-zinc-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-zinc-600" />
                            )}
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-0 border-t border-zinc-800/60">
                                {report.question ? (
                                  <>
                                    <div className="mt-4 mb-4 p-4 rounded-xl bg-[rgba(24,24,27,0.4)] border border-zinc-800/40">
                                      <span
                                        className={`${mono} text-[10px] font-[800] text-zinc-600 uppercase block mb-2`}
                                        style={{ letterSpacing: "0.1em" }}
                                      >
                                        Question {report.questionIndex + 1}
                                      </span>
                                      <p className="text-[14px] text-zinc-200 leading-relaxed">
                                        {report.question.content}
                                      </p>

                                      {report.question.imgURL && (
                                        <img
                                          src={report.question.imgURL}
                                          alt={`Question ${report.questionIndex + 1}`}
                                          className="mt-3 rounded-lg max-h-[200px] w-auto border border-zinc-800"
                                        />
                                      )}
                                    </div>

                                    <div className="flex flex-col space-y-1.5">
                                      {report.answers.map(({ key, text }) => {
                                        const isCorrect =
                                          report.correctAnswer === key;

                                        return (
                                          <div
                                            key={key}
                                            className={`flex items-center px-4 py-2.5 rounded-lg border transition-all ${
                                              isCorrect
                                                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-300"
                                                : "border-zinc-800/40 bg-[rgba(24,24,27,0.3)] text-zinc-400"
                                            }`}
                                          >
                                            <span
                                              className={`${mono} font-[800] mr-3 uppercase w-5 text-[11px] ${
                                                isCorrect
                                                  ? "text-emerald-400"
                                                  : "text-zinc-600"
                                              }`}
                                            >
                                              {key}
                                            </span>
                                            <span className="text-[13px]">
                                              {text}
                                            </span>
                                            {isCorrect && (
                                              <span
                                                className={`${mono} ml-auto text-emerald-400 font-[800] text-[10px] uppercase`}
                                                style={{
                                                  letterSpacing: "0.06em",
                                                }}
                                              >
                                                CORRECT
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>

                                    <div className="mt-4 p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20">
                                      <span
                                        className={`${mono} text-[10px] font-[800] text-red-400/60 uppercase block mb-1`}
                                        style={{ letterSpacing: "0.1em" }}
                                      >
                                        Issue Reported
                                      </span>
                                      <p className="text-[13px] text-red-300/80 leading-relaxed">
                                        {report.reason}
                                      </p>
                                    </div>
                                  </>
                                ) : (
                                  <p className="text-zinc-600 text-[13px] mt-4">
                                    Question data could not be loaded.
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
