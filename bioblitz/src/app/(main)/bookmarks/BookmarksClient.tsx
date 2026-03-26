"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  Loader2,
  ArrowLeft,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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

interface BookmarkDoc {
  id: string;
  gameId: string;
  questionIndex: number;
  gameTitle: string;
  correctAnswer: string;
  userAnswer: string;
  note: string;
  bookmarkedAt: any;
}

interface QuestionData {
  content: string;
  a: string;
  b: string;
  c: string;
  d?: string;
  e?: string;
  imgURL?: string;
}

interface ResolvedBookmark {
  bookmark: BookmarkDoc;
  question: QuestionData | null;
  answers: { key: string; text: string }[];
}

export default function BookmarksClient() {
  const router = useRouter();
  const auth = getAuth(app);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<ResolvedBookmark[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/auth");
        return;
      }
      setUser(u);
    });
    return () => unsub();
  }, [auth, router]);

  useEffect(() => {
    if (!user) return;
    loadBookmarks(user.uid);
  }, [user]);

  const loadBookmarks = async (uid: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "users", uid, "bookmarkedQuestions"),
        orderBy("bookmarkedAt", "desc"),
      );
      const snap = await getDocs(q);

      const docs: BookmarkDoc[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<BookmarkDoc, "id">),
      }));

      // Group by gameId to batch-fetch questions
      const gameIds = [...new Set(docs.map((d) => d.gameId))];
      const functions = getFunctions();
      const getPublicQuestions = httpsCallable(functions, "getPublicQuestions");

      const questionsMap = new Map<string, QuestionData[]>();
      const titlesMap = new Map<string, string>();

      await Promise.all(
        gameIds.map(async (gameId) => {
          try {
            const result = await getPublicQuestions({ gameId });
            const questions = (result.data as { questions: QuestionData[] })
              .questions;
            questionsMap.set(gameId, questions);

            // Fetch game title as fallback for old bookmarks
            const gameSnap = await getDoc(doc(db, "sets", gameId));
            if (gameSnap.exists()) {
              titlesMap.set(gameId, gameSnap.data().title || "");
            }
          } catch (err) {
            console.error(`Failed to fetch questions for ${gameId}:`, err);
          }
        }),
      );

      // Resolve each bookmark
      const resolved: ResolvedBookmark[] = docs.map((bm) => {
        const questions = questionsMap.get(bm.gameId);
        const question = questions?.[bm.questionIndex] || null;

        const answers = question
          ? (["a", "b", "c", "d", "e"] as const)
              .filter((key) => question[key])
              .map((key) => ({ key, text: question[key] as string }))
          : [];

        return {
          bookmark: {
            ...bm,
            gameTitle:
              bm.gameTitle || titlesMap.get(bm.gameId) || "Unknown Blitz",
          },
          question,
          answers,
        };
      });

      setBookmarks(resolved);
      // Start with all expanded
      setExpandedIds(new Set(resolved.map((r) => r.bookmark.id)));
    } catch (err) {
      console.error("Error loading bookmarks:", err);
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = useCallback(
    async (bookmarkId: string) => {
      if (!user) return;
      setRemovingIds((prev) => new Set(prev).add(bookmarkId));

      try {
        await deleteDoc(
          doc(db, "users", user.uid, "bookmarkedQuestions", bookmarkId),
        );
        setBookmarks((prev) =>
          prev.filter((b) => b.bookmark.id !== bookmarkId),
        );
      } catch (err) {
        console.error("Error removing bookmark:", err);
      } finally {
        setRemovingIds((prev) => {
          const next = new Set(prev);
          next.delete(bookmarkId);
          return next;
        });
      }
    },
    [user],
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div
        className={`${dmSans.className} min-h-screen bg-neutral-900 flex items-center justify-center`}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          <p className="text-zinc-500 text-sm font-medium animate-pulse">
            Loading bookmarks...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${dmSans.className} min-h-screen bg-neutral-900 text-white`}>
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundSize: "28px 28px",
        }}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href="/progress"
            className="inline-flex items-center text-zinc-500 hover:text-white mb-4 transition-colors font-medium text-[13px]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Progress
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/15 border border-amber-500/30 p-2.5 rounded-xl">
              <Bookmark className="w-6 h-6 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <h1
                className="text-[28px] font-[900] text-white"
                style={{ letterSpacing: "-0.02em" }}
              >
                Bookmarked Questions
              </h1>
              <p className="text-zinc-500 text-[13px]">
                {bookmarks.length} question{bookmarks.length !== 1 ? "s" : ""}{" "}
                saved
              </p>
            </div>
          </div>
        </motion.div>

        {bookmarks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-14 text-center">
            <Bookmark className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500 text-sm font-semibold">
              No bookmarked questions yet
            </p>
            <p className="text-zinc-700 text-xs mt-2 max-w-xs mx-auto leading-relaxed">
              After completing a blitz, tap the bookmark icon on any question to
              save it here for review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {bookmarks.map((item, i) => {
                const { bookmark, question, answers } = item;
                const isExpanded = expandedIds.has(bookmark.id);
                const isRemoving = removingIds.has(bookmark.id);

                return (
                  <motion.div
                    key={bookmark.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                    className="bg-[rgba(9,9,11,0.8)] border border-zinc-800 rounded-2xl overflow-hidden"
                  >
                    <div
                      className="flex items-center gap-3 p-5 cursor-pointer hover:bg-zinc-900/40 transition-colors"
                      onClick={() => toggleExpand(bookmark.id)}
                    >
                      <Bookmark className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-zinc-200 truncate">
                          {bookmark.gameTitle || "Unknown Blitz"}
                          <span
                            className={`${mono} text-zinc-600 text-[12px] ml-2`}
                          >
                            Q{bookmark.questionIndex + 1}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBookmark(bookmark.id);
                        }}
                        disabled={isRemoving}
                        className="p-1.5 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                        title="Remove bookmark"
                      >
                        <Trash2
                          className={`w-3.5 h-3.5 ${isRemoving ? "animate-spin" : ""}`}
                        />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                      )}
                    </div>

                    <AnimatePresence>
                      {isExpanded && question && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-0 border-t border-zinc-800/60">
                            <p className="text-[16px] text-zinc-200 leading-relaxed mt-4 mb-5">
                              {question.content}
                            </p>

                            {question.imgURL && (
                              <img
                                src={question.imgURL}
                                alt={`Question ${bookmark.questionIndex + 1}`}
                                className="mb-5 rounded-xl max-h-[280px] w-auto border border-zinc-800"
                              />
                            )}

                            <div className="flex flex-col space-y-2">
                              {answers.map(({ key, text }) => {
                                const isCorrect =
                                  bookmark.correctAnswer === key;
                                const isUserAnswer =
                                  bookmark.userAnswer === key;

                                let bgClass =
                                  "bg-[rgba(24,24,27,0.5)] border-zinc-700/40 text-zinc-500";
                                if (isCorrect) {
                                  bgClass =
                                    "bg-emerald-500/10 border-emerald-500/50 text-emerald-300";
                                } else if (isUserAnswer) {
                                  bgClass =
                                    "bg-red-500/10 border-red-500/50 text-red-300";
                                }

                                return (
                                  <div
                                    key={key}
                                    className={`flex items-center px-4 py-3 rounded-xl border transition-all ${bgClass}`}
                                  >
                                    <span
                                      className={`${mono} font-[800] mr-3 uppercase w-5 text-[11px]`}
                                    >
                                      {key}
                                    </span>
                                    <span className="text-[14px]">{text}</span>
                                    {isCorrect && (
                                      <span
                                        className={`${mono} ml-auto text-emerald-400 font-[800] text-[10px] uppercase`}
                                        style={{ letterSpacing: "0.06em" }}
                                      >
                                        CORRECT
                                      </span>
                                    )}
                                    {isUserAnswer && !isCorrect && (
                                      <span
                                        className={`${mono} ml-auto text-red-400 font-[800] text-[10px] uppercase`}
                                        style={{ letterSpacing: "0.06em" }}
                                      >
                                        YOUR ANSWER
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="mt-4 mb-2">
                              <p
                                className={`${mono} text-[10px] text-zinc-600 font-bold uppercase mb-2`}
                                style={{ letterSpacing: "0.1em" }}
                              >
                                Your Note
                              </p>
                              <textarea
                                defaultValue={bookmark.note || ""}
                                placeholder="Jot down any notes or thoughts about this question for future review."
                                onBlur={async (e) => {
                                  const newNote = e.target.value.trim();
                                  if (newNote === (bookmark.note || "")) return;
                                  try {
                                    if (!user) return;
                                    await updateDoc(
                                      doc(
                                        db,
                                        "users",
                                        user.uid,
                                        "bookmarkedQuestions",
                                        bookmark.id,
                                      ),
                                      { note: newNote },
                                    );
                                    setBookmarks((prev) =>
                                      prev.map((b) =>
                                        b.bookmark.id === bookmark.id
                                          ? {
                                              ...b,
                                              bookmark: {
                                                ...b.bookmark,
                                                note: newNote,
                                              },
                                            }
                                          : b,
                                      ),
                                    );
                                  } catch (err) {
                                    console.error("Error saving note:", err);
                                  }
                                }}
                                className="w-full bg-[rgba(24,24,27,0.5)] border border-zinc-700/40 rounded-xl px-4 py-3 text-[13px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-neutral-500/50 resize-none min-h-[60px] transition-colors"
                                rows={2}
                              />
                            </div>

                            <Link
                              href={`/home/${bookmark.gameId}`}
                              className={`${mono} inline-flex items-center gap-1.5 mt-4 text-[11px] font-bold text-neutral-400 hover:text-neutral-300 transition-colors`}
                            >
                              View full blitz →
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {isExpanded && !question && (
                      <div className="px-5 pb-5 pt-0 border-t border-zinc-800/60">
                        <p className="text-zinc-600 text-[13px] mt-4">
                          Question data could not be loaded.
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        <div className="text-center pt-10 border-t border-zinc-900 mt-10">
          <Link
            href="/progress"
            className="text-zinc-500 hover:text-white text-sm transition-colors"
          >
            Back to Progress
          </Link>
        </div>
      </main>
    </div>
  );
}
