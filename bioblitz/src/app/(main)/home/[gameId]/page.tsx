"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { allGames, gameRoom } from "@/lib/gameRoomsAll";
import {
  Loader2,
  History,
  Trophy,
  Calendar,
  Clock,
  Play,
  Medal,
  Crown,
  Star,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, firestore } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  doc,
  getDoc,
  limit,
} from "firebase/firestore";

import GameRating from "@/components/features/reviews/GameRating";

interface GameSubmission {
  id: string;
  userId: string;
  score: number;
  totalQuestions: number;
  submittedAt: Timestamp;
  timeTaken: number;
  ranked?: boolean;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  handle?: string;
  score: number;
  timeTaken: number;
}

export default function GameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params?.gameId as string;

  const [user, setUser] = useState<User | null>(null);
  const [game, setGame] = useState<gameRoom | undefined>(undefined);

  const [loadingGame, setLoadingGame] = useState(true);
  const [loadingAttempts, setLoadingAttempts] = useState(true);

  const [previousAttempts, setPreviousAttempts] = useState<GameSubmission[]>(
    []
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [authResolved, setAuthResolved] = useState(false);
  const [showStartConfirmation, setShowStartConfirmation] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthResolved(true);

      if (!currentUser) {
        setLoadingAttempts(false);
        setPreviousAttempts([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadGameData = async () => {
      if (!gameId) return;

      setLoadingGame(true);
      const fetchedGames = await allGames();
      const currentGame = fetchedGames.find((g) => g.id === gameId);

      setGame(currentGame);
      setLoadingGame(false);
    };

    loadGameData();
  }, [gameId]);

  useEffect(() => {
    const fetchAttempts = async () => {
      if (!user || !gameId) return;

      setLoadingAttempts(true);
      try {
        const q = query(
          collection(firestore, "gameSubmissions"),
          where("userId", "==", user.uid),
          where("gameId", "==", gameId),
          orderBy("score", "desc"),
          limit(15)
        );

        const snapshot = await getDocs(q);
        const rawAttempts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as GameSubmission[];

        const uniqueAttempts = Array.from(
          new Map(
            rawAttempts.map((s) => [s.userId + s.submittedAt, s])
          ).values()
        );

        setPreviousAttempts(uniqueAttempts);
      } catch (err) {
        console.error("Error fetching attempts:", err);
      } finally {
        setLoadingAttempts(false);
      }
    };

    fetchAttempts();
  }, [user, gameId]);
  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!gameId) return;
      setLoadingLeaderboard(true);

      try {
        const q = query(
          collection(firestore, "gameSubmissions"),
          where("gameId", "==", gameId),
          where("status", "==", "graded"),
          orderBy("score", "desc"),
          limit(20)
        );

        const snapshot = await getDocs(q);
        const rawSubmissions = snapshot.docs
          .map((doc) => doc.data() as GameSubmission)
          .filter((submission) => submission.ranked);

        const uniqueSubmissions = Array.from(
          new Map(rawSubmissions.map((s) => [s.userId, s])).values()
        );

        const leaderboardData = await Promise.all(
          uniqueSubmissions.map(async (submission) => {
            let displayName = "Unknown User";
            let handle = "";

            try {
              const userDocRef = doc(firestore, "users", submission.userId);
              const userSnap = await getDoc(userDocRef);

              if (!userSnap.exists()) return null;

              const userData = userSnap.data();
              displayName = userData.displayName || "Unknown User";
              handle = userData.username || "";
            } catch (e) {
              console.error("Failed to fetch user profile", e);
            }

            return {
              userId: submission.userId,
              username: displayName,
              handle: handle,
              score: submission.score,
              timeTaken: submission.timeTaken,
            };
          })
        );

        setLeaderboard(
          leaderboardData.filter(
            (entry) => entry !== null
          ) as LeaderboardEntry[]
        );
      } catch (err) {
        console.error("Error loading leaderboard:", err);
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    fetchLeaderboard();
  }, [gameId]);

  const isFirstAttempt = !loadingAttempts && previousAttempts.length === 0;

  const hasPlayed = !loadingAttempts && previousAttempts.length > 0;

  const handleJoinGame = () => {
    if (!user) {
      router.push("/auth");
      return;
    }
    if (loadingAttempts) return;

    setShowStartConfirmation(true);
  };
  const proceedToGame = () => {
    setShowStartConfirmation(false);
    router.push(`/home/${gameId}/room?ranked=${isFirstAttempt}`);
  };

  const formatTimePlayed = (seconds: number) => {
    if (!seconds) return "--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp.seconds * 1000).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const getRankIcon = (index: number) => {
    if (index === 0)
      return <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500/20" />;
    if (index === 1) return <Medal className="w-4 h-4 text-zinc-300" />;
    if (index === 2) return <Medal className="w-4 h-4 text-orange-500" />;
    return (
      <span className="text-zinc-500 font-mono text-xs w-4 text-center">
        {index + 1}
      </span>
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };
  const slideUp: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 80 },
    },
  };

  if (loadingGame) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!game) return <div className="text-white p-10">Game not found</div>;

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
      <div className="flex flex-1 overflow-hidden pt-24 px-4 md:px-8 pb-4 gap-6 max-w-7xl mx-auto w-full">
        <motion.main
          className="flex-[1.4] flex flex-col overflow-y-auto custom-scrollbar pr-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={slideUp}
            className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 shadow-2xl backdrop-blur-sm"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-2">
                  {game.title}
                </h1>

                <div className="flex gap-3 mt-3">
                  <span className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-bold uppercase tracking-wider">
                    {game.topic || "General"}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 text-xs font-bold uppercase tracking-wider">
                    {game.difficulty}
                  </span>

                  {game.rating && game.rating > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-xs font-bold uppercase tracking-wider">
                      <Star className="w-3.5 h-3.5 fill-yellow-500" />
                      <span>{game.rating}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-zinc-950/50 p-3 rounded-2xl border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase font-bold mb-2">
                  Rate this Blitz
                </div>
                <GameRating gameId={gameId} hasPlayed={hasPlayed} />
              </div>
            </div>

            {game.description && (
              <p className="text-zinc-400 text-lg leading-relaxed mb-8 max-w-3xl">
                {game.description.replace(/^"(.*)"$/, "$1")}
              </p>
            )}

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50 text-center">
                <div className="text-zinc-500 text-xs uppercase font-bold mb-1">
                  Questions
                </div>
                <div className="text-2xl font-bold text-white">
                  {game.number_of_questions}
                </div>
              </div>
              <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50 text-center">
                <div className="text-zinc-500 text-xs uppercase font-bold mb-1">
                  Time Limit
                </div>
                <div className="text-2xl font-bold text-white">
                  {game.timeLimit}
                </div>
              </div>
              <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50 text-center">
                <div className="text-zinc-500 text-xs uppercase font-bold mb-1">
                  Attempts
                </div>
                <div className="text-2xl font-bold text-white">
                  {loadingAttempts ? "-" : previousAttempts.length}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleJoinGame}
                disabled={loadingAttempts || !authResolved}
                className={`w-full relative group overflow-hidden rounded-xl p-5 transition-all duration-300 transform active:scale-[0.98] ${
                  loadingAttempts
                    ? "bg-zinc-800 cursor-wait opacity-70"
                    : isFirstAttempt
                    ? "bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-900/20"
                    : "bg-white text-black hover:bg-zinc-200"
                }`}
              >
                <div className="relative z-10 flex items-center justify-center gap-3">
                  {!authResolved ? (
                    <span className="text-zinc-500 font-bold">
                      Checking sign-in...
                    </span>
                  ) : !user ? (
                    <>
                      <Play className="w-6 h-6" />
                      <span className="text-lg font-bold">Sign in to Play</span>
                    </>
                  ) : isFirstAttempt ? (
                    <>
                      <Trophy className="w-6 h-6" />
                      <div className="flex flex-col items-start">
                        <span className="text-lg font-bold leading-none">
                          Start Ranked Attempt
                        </span>
                        <span className="text-xs font-medium opacity-80">
                          Counts towards Elo
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Play className="w-6 h-6 fill-current" />
                      <div className="flex flex-col items-start">
                        <span className="text-lg font-bold leading-none">
                          Practice Mode
                        </span>
                        <span className="text-xs font-medium opacity-60">
                          Replay for fun (No Elo)
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </button>
            </div>
          </motion.div>

          <motion.div variants={slideUp} className="mt-6 flex-1 mb-8">
            <div className="flex items-center gap-2 mb-4 px-2">
              <History className="text-violet-500 w-5 h-5" />
              <h3 className="text-xl font-bold text-white">Your History</h3>
            </div>

            {loadingAttempts ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 text-zinc-700 animate-spin" />
              </div>
            ) : previousAttempts.length === 0 ? (
              <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-2xl p-8 text-center">
                <p className="text-zinc-500">
                  You haven't played this Blitz yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {previousAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className={`group flex items-center justify-between p-4 rounded-xl border transition-all ${
                      attempt.ranked
                        ? "bg-zinc-900 border-violet-500/20 hover:border-violet-500/40"
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          attempt.ranked
                            ? "bg-violet-900/30 text-violet-400"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {attempt.score}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">
                            {attempt.score} pts
                          </span>
                          {attempt.ranked && (
                            <span className="text-[10px] bg-violet-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">
                              Ranked
                            </span>
                          )}
                        </div>
                        <div className="text-zinc-500 text-xs flex gap-2 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{" "}
                            {formatDate(attempt.submittedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-zinc-400 text-sm font-mono flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />{" "}
                        {formatTimePlayed(attempt.timeTaken)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.main>

        <motion.aside
          variants={slideUp}
          className="hidden lg:flex flex-[0.8] flex-col bg-zinc-900 border border-zinc-800 rounded-3xl p-6 overflow-hidden h-fit max-h-full sticky top-0"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="text-yellow-500 w-5 h-5" />
              Top Performers
            </h2>
            <span className="text-xs text-zinc-500 font-bold bg-zinc-800 px-2 py-1 rounded">
              Ranked
            </span>
          </div>

          {loadingLeaderboard ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-sm">
              No ranked plays yet.
            </div>
          ) : (
            <div className="overflow-y-auto custom-scrollbar pr-1 flex-1 space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    authResolved && user && entry.userId === user.uid
                      ? "bg-violet-500/10 border-violet-500/30 ring-1 ring-violet-500/20"
                      : "bg-zinc-950/50 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-5 flex justify-center">
                      {getRankIcon(index)}
                    </div>
                    <div>
                      <div
                        className={`text-sm font-bold ${
                          authResolved && user && entry.userId === user.uid
                            ? "text-violet-300"
                            : "text-zinc-200"
                        }`}
                      >
                        {entry.handle ? (
                          <Link
                            href={`/profile/${entry.handle}`}
                            className="hover:underline hover:text-white transition-colors"
                          >
                            {authResolved && user && entry.userId === user.uid
                              ? "You"
                              : entry.username}
                          </Link>
                        ) : (
                          <span>
                            {authResolved && user && entry.userId === user.uid
                              ? "You"
                              : entry.username}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {formatTimePlayed(entry.timeTaken)}
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-white">{entry.score}</div>
                </div>
              ))}
            </div>
          )}
        </motion.aside>
      </div>

      {showStartConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 blur-[80px] pointer-events-none" />

            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-yellow-500/20">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-3">
                Ready to Begin?
              </h2>

              <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                The{" "}
                <span className="text-white font-bold">
                  timer will start immediately
                </span>{" "}
                once you confirm.
                <br />
                <br />
                <span className="inline-flex items-center gap-2 text-yellow-500/90 font-medium bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/10">
                  <AlertTriangle className="w-3 h-3" />
                  The timer keeps running even if you exit!
                </span>
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowStartConfirmation(false)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-zinc-400 hover:bg-zinc-900 hover:text-white border border-transparent hover:border-zinc-800 transition-all"
                >
                  Cancel
                </button>

                <button
                  onClick={proceedToGame}
                  className="flex-1 py-3.5 rounded-xl font-bold bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-900/20 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]"
                >
                  Begin Blitz <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
