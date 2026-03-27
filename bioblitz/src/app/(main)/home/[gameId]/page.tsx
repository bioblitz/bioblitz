"use client";

import { useParams, useRouter } from "next/navigation";
import ChallengeButton from "@/components/features/challenges/ChallengeButton";
import Link from "next/link";
import { allGames } from "@/lib/gameRoomsAll";
import { gameRoom } from "@/types/index";
import DefaultAvatar from "@/components/ui/DefaultAvatar";
import {
  Loader2,
  History,
  HelpCircle,
  Trophy,
  Calendar,
  Clock,
  Play,
  Medal,
  Crown,
  Users,
  CheckCircle2,
  ArrowUpRight,
  ChevronRight,
  Timer,
  AlertTriangle,
  X,
  ShieldAlert,
  LayoutGrid,
  Info,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { getTopicColors, getTopicShortLabel } from "@/lib/utils";

interface GameSubmission {
  id: string;
  userId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: Timestamp;
  timeTaken: number;
  ranked?: boolean;
  username?: string;
  handle?: string;
  photoURL?: string;
}

interface LeaderboardEntry {
  submissionId: string;
  userId: string;
  username: string;
  handle?: string;
  photoURL?: string;
  correctCount: number;
  totalQuestions: number;
  questionResults?: boolean[];
  questionTimings?: number[];
  timeTaken: number;
  tabSwitchCount?: number;
  timeOffTab?: number;
}

export default function GameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params?.gameId as string;

  const [user, setUser] = useState<User | null>(null);
  const [inspectEntry, setInspectEntry] = useState<LeaderboardEntry | null>(null);
  const [erasing, setErasing] = useState(false);
  const [eloPenalty, setEloPenalty] = useState(100);
  const [eraseAttempt, setEraseAttempt] = useState(true);
  const [game, setGame] = useState<gameRoom | undefined>(undefined);

  const [loadingGame, setLoadingGame] = useState(true);
  const [loadingAttempts, setLoadingAttempts] = useState(true);

  const [previousAttempts, setPreviousAttempts] = useState<GameSubmission[]>(
    [],
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [authResolved, setAuthResolved] = useState(false);
  const [showStartConfirmation, setShowStartConfirmation] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const [activeSession, setActiveSession] = useState<{
    timeLeft: number;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthResolved(true);

      if (currentUser) {
        currentUser.getIdTokenResult(true).then((result) => {
          const claims: any = result.claims || {};
          const roles = Array.isArray(claims.roles)
            ? claims.roles.map((r: any) => String(r).toLowerCase())
            : [];
          setIsAdmin(claims.admin === true || roles.includes("admin"));
          setIsStaff(roles.includes("staff"));
        });
      } else {
        setLoadingAttempts(false);
        setPreviousAttempts([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

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
    if (!user || !gameId || !game) return;

    const checkSession = () => {
      const key = `startTime-${user.uid}-${gameId}`;
      const savedStart = localStorage.getItem(key);

      if (savedStart) {
        const startTime = parseInt(savedStart);
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTime) / 1000);
        const remaining = parseInt(game.timeLimit) * 60 - elapsedSeconds;

        if (remaining > 0) {
          setActiveSession({ timeLeft: remaining });
        } else {
          setActiveSession(null);
        }
      } else {
        setActiveSession(null);
      }
    };

    checkSession();

    const interval = setInterval(checkSession, 1000);
    return () => clearInterval(interval);
  }, [user, gameId, game]);

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
          limit(15),
        );

        const snapshot = await getDocs(q);
        const rawAttempts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as GameSubmission[];

        const uniqueAttempts = Array.from(
          new Map(
            rawAttempts.map((s) => [s.userId + s.submittedAt, s]),
          ).values(),
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
          orderBy("submittedAt", "desc"),
          limit(20),
        );

        const snapshot = await getDocs(q);
        const rawSubmissions = snapshot.docs
          .filter((doc) => doc.data().ranked)
          .map((doc) => ({ ...(doc.data() as GameSubmission), id: doc.id }));

        const uniqueSubmissions = Array.from(
          new Map(rawSubmissions.map((s) => [s.userId, s])).values(),
        );

        const leaderboardData = await Promise.all(
          uniqueSubmissions.map(async (submission) => {
            if (submission.username) {
              return {
                submissionId: submission.id,
                userId: submission.userId,
                username: submission.username,
                handle: submission.handle,
                photoURL: submission.photoURL,
                correctCount: submission.correctCount ?? 0,
                totalQuestions: submission.totalQuestions ?? 0,
                questionResults: (submission as any).questionResults,
                questionTimings: (submission as any).questionTimings,
                timeTaken: submission.timeTaken,
                tabSwitchCount: (submission as any).tabSwitchCount,
                timeOffTab: (submission as any).timeOffTab,
              };
            }

            let displayName = "Unknown User";
            let handle = "";
            let photoURL = "";

            try {
              const userDocRef = doc(firestore, "users", submission.userId);
              const userSnap = await getDoc(userDocRef);

              if (!userSnap.exists()) return null;

              const userData = userSnap.data();
              displayName = userData.displayName || "Unknown User";
              handle = userData.username || "";
              photoURL = userData.photoURL || "";
            } catch (e) {
              console.error("Failed to fetch user profile", e);
            }

            return {
              submissionId: submission.id,
              userId: submission.userId,
              username: displayName,
              handle: handle,
              photoURL: photoURL,
              correctCount: submission.correctCount ?? 0,
              totalQuestions: submission.totalQuestions ?? 0,
              questionResults: (submission as any).questionResults,
              questionTimings: (submission as any).questionTimings,
              timeTaken: submission.timeTaken,
              tabSwitchCount: (submission as any).tabSwitchCount,
              timeOffTab: (submission as any).timeOffTab,
            };
          }),
        );

        setLeaderboard(
          (leaderboardData.filter((entry) => entry !== null) as LeaderboardEntry[])
            .sort((a, b) => (b.correctCount - a.correctCount) || (a.timeTaken - b.timeTaken)),
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

  const handleDeleteContest = async () => {
    if (!game || !user) return;
    if (
      !confirm(
        `Are you sure you want to delete "${game.title}"? This cannot be undone.`,
      )
    )
      return;

    setDeleting(true);
    try {
      const token = await user.getIdToken();
      const isOwner = game.creator === user.uid;
      let res: Response;
      if (isOwner) {
        res = await fetch(`/api/contests/${gameId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token }),
        });
      } else {
        res = await fetch("/api/admin/contests", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ gameId }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push("/home");
    } catch (err: any) {
      alert(err?.message || "Failed to delete contest.");
      setDeleting(false);
    }
  };

  const formatTimePlayed = (seconds: number) => {
    if (!seconds) return "--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const formatQuestionTime = (ms: number) => {
    if (!ms || ms < 1000) return "<1s";
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatCountdown = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp.seconds * 1000).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const handleEraseSubmission = async (entry: LeaderboardEntry) => {
    if (!user) return;
    if (!eraseAttempt && eloPenalty === 0) return;
    setErasing(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/submission/erase", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          submissionId: entry.submissionId,
          userId: entry.userId,
          eloPenalty,
          eraseAttempt,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data?.error || "Failed.");
        return;
      }
      if (eraseAttempt) {
        setLeaderboard((prev) => prev.filter((e) => e.submissionId !== entry.submissionId));
      }
      setInspectEntry(null);
    } catch {
      alert("Failed.");
    } finally {
      setErasing(false);
    }
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
      <div className="flex flex-col items-center justify-center h-screen bg-neutral-900 gap-4">
        <div className="w-10 h-10 border-[3px] border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
        <span className="text-neutral-400 text-sm font-medium">Loading...</span>
      </div>
    );
  }

  if (!game) return <div className="text-white p-10">Blitz not found</div>;

  const timeLimitMinutes = Math.max(
    1,
    parseInt(String(game.timeLimit || "0"), 10) || 0,
  );

  const registrantAvatars = leaderboard.slice(0, 3);
  const registrantAvatarSkeletons = Array.from({ length: 3 });

  return (
    <div className="flex flex-col min-h-screen bg-neutral-900 text-white font-sans pl-14">
      <motion.div
        variants={slideUp}
        className="w-full pt-24 pr-4 pl-2 md:pr-8 md:pl-4 max-w-7xl mx-auto"
      >
        <div className="mb-6">
          <div className="relative h-48 md:h-56 rounded overflow-hidden">
            {game.bannerUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${game.bannerUrl})` }}
              />
            ) : game.creatorPfp ? (
              <>
                <img
                  src={game.creatorPfp}
                  className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
                  alt=""
                  aria-hidden
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-neutral-900/60" />
                <div className="relative h-full flex items-center justify-center">
                  <img
                    src={game.creatorPfp}
                    alt="Creator"
                    className="w-20 h-20 rounded-full object-cover border-2 border-zinc-700"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black" />
            )}
          </div>
        </div>
      </motion.div>

      <div className="flex flex-1 pr-4 pl-2 md:pr-8 md:pl-4 pb-16 gap-6 max-w-7xl mx-auto w-full">
        <motion.main
          className="flex-[1.4] flex flex-col pr-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={slideUp} className="rounded-3xl p-8">
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  {game.title}
                </h1>
                {(isAdmin || isStaff || game.creator === user?.uid) && (
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setShowMenu((v) => !v)}
                      className="p-2 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {showMenu && (
                      <div className="absolute left-0 top-full mt-1 w-44 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden">
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            router.push(`/contests/create/${gameId}`);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors text-left"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit Blitz
                        </button>
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            handleDeleteContest();
                          }}
                          disabled={deleting}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left disabled:opacity-50"
                        >
                          {deleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Delete Blitz
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 mt-3 text-md text-neutral-400">
                <div className="flex items-center gap-2">
                 <span>Hosted by: {" "}</span>
                  {game.creatorUsername ? (
                    <Link href={`/profile/${game.creatorUsername}`} className="flex items-center gap-2 text-zinc-200 hover:underline transition-colors">
                      {game.creatorPfp ? (
                        <img
                          src={game.creatorPfp}
                          alt={game.creatorUsername}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-neutral-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-6 h-6 flex-shrink-0">
                          <DefaultAvatar name={game.creatorUsername || ""} />
                        </div>
                      )}
                      <span>{game.creatorUsername}</span>

                    </Link>
                  ) : (
                    <span className="text-zinc-200">Unknown</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span
                  className={`${getTopicColors(game.topic).badge} text-white text-[11px] font-bold tracking-wide px-3 py-1.5 rounded-full`}
                >
                  {getTopicShortLabel(game.topic || "General")}
                </span>

                <GameRating
                  gameId={gameId}
                  hasPlayed={hasPlayed}
                  averageRating={game.rating}
                  ratingCount={game.ratingCount}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div>
                <div className="text-xl font-bold text-white">
                  {game.number_of_questions}
                </div>
                <div className="text-[11px] font-bold tracking-wide text-neutral-500">
                  Questions
                </div>
              </div>
              <div>
                <div className="text-xl font-bold text-white flex items-center gap-2">
                  {timeLimitMinutes}
                </div>
                <div className="text-[11px] font-bold tracking-wide text-neutral-500">
                  Minutes
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {activeSession && (
                <button
                  onClick={proceedToGame}
                  className="w-full relative group overflow-hidden rounded-xl p-5 bg-amber-500/10 border border-amber-500/50 hover:bg-amber-500/20 transition-all duration-300 transform active:scale-[0.98] mb-1"
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex flex-col items-start">
                      <span className="text-lg font-bold text-amber-500 leading-none">
                        Attempt in Progress
                      </span>
                      <span className="text-xs font-medium text-amber-200/70 mt-1">
                        Click to Resume
                      </span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-amber-500 tabular-nums">
                      {formatCountdown(activeSession.timeLeft)}
                    </div>
                  </div>
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleJoinGame}
                  disabled={
                    loadingAttempts || !authResolved || activeSession !== null
                  }
                  className={`w-full py-2.5 blurred-border relative group overflow-hidden rounded-xl p-5 transition-all duration-300 transform active:scale-[0.98] ${
                    loadingAttempts
                      ? "bg-zinc-500 cursor-wait opacity-70"
                      : activeSession !== null
                        ? "bg-zinc-500 opacity-50 cursor-not-allowed"
                        : isFirstAttempt
                          ? "border-neutral-100 border hover:bg-neutral-800"
                          : "bg-white text-black hover:bg-zinc-200"
                  }`}
                >
                  <div className="relative z-10 flex items-center justify-center gap-3">
                    {!authResolved ? (
                      <span className="text-zinc-500 font-bold">
                        Checking sign-in...
                      </span>
                    ) : !user ? (
                      <span className="text-lg font-bold">Sign in to Play</span>
                    ) : activeSession ? (
                      <span className="text-zinc-500 font-bold">
                        Finish your current attempt first
                      </span>
                    ) : isFirstAttempt ? (
                      <div className="flex flex-col items-start">
                        <span className="text-lg justify-center font-bold leading-none">
                          Start Now
                        </span>
                        <span className="text-xs justify-center font-medium opacity-80">
                          Counts towards Elo
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-start">
                        <span className="text-lg font-bold leading-none">
                          Start Now
                        </span>
                        <span className="text-xs justify-center font-medium opacity-60">
                          Replay for fun (No Elo)
                        </span>
                      </div>
                    )}
                  </div>
                </button>
                {user && isFirstAttempt && (
                  <ChallengeButton
                    blitzId={gameId}
                    blitzTitle={game.title}
                    onPlay={handleJoinGame}
                  />
                )}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="text-sm text-neutral-300 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {game.firstAttemptCount ?? 0} registrant
                  {(game.firstAttemptCount ?? 0) === 1 ? "" : "s"}
                </div>
                <div className="flex items-center -space-x-2">
                  {loadingLeaderboard
                    ? registrantAvatarSkeletons.map((_, index) => (
                        <div
                          key={`loading-${index}`}
                          className="w-7 h-7 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-500"
                        />
                      ))
                    : registrantAvatars.map((entry) => (
                        <div
                          key={entry.userId}
                          className="w-7 h-7 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-500"
                        >
                          {entry.photoURL ? (
                            <img
                              src={entry.photoURL}
                              alt={entry.username}
                              className="w-full h-full rounded-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            entry.username?.[0]?.toUpperCase()
                          )}
                        </div>
                      ))}
                  {[0, 1].map((index) => (
                    <div
                      key={`unknown-${index}`}
                      className="w-7 h-7 rounded-full border border-dashed border-zinc-700 bg-zinc-900/60 flex items-center justify-center text-[10px] font-bold text-zinc-500"
                    >
                      ?
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <h1 className="py-4 text-lg text-neutral-300">
              Description:
              {game.description && (
                <p className="text-lg text-neutral-300 leading-relaxed mt-2 max-w-3xl">
                  {game.description.replace(/^"(.*)"$/, "$1")}
                </p>
              )}
            </h1>
          </motion.div>

          <motion.div variants={slideUp} className="mt-6 flex-1 mb-8 pl-6">
            <div className="flex items-center gap-2 mb-4 px-2">
              <h3 className="text-xl font-bold text-white">Your History</h3>
            </div>

            {loadingAttempts ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 text-zinc-700 animate-spin" />
              </div>
            ) : previousAttempts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-zinc-500">
                  You haven't played this Blitz yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {previousAttempts.map((attempt) => (
                  <Link
                    href={`/home/${gameId}/review/${attempt.id}`}
                    key={attempt.id}
                    className={`group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                      attempt.ranked
                        ? "bg-zinc-900 border-neutral-500/20 hover:border-neutral-500/50 hover:bg-zinc-900/80"
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-4 z-10">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          attempt.ranked
                            ? "bg-neutral-900/30 text-neutral-400"
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
                            <span className="text-[10px] bg-neutral-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">
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

                    <div className="flex items-center gap-4 z-10">
                      <div className="text-right">
                        <div className="text-zinc-400 text-sm font-mono flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" />{" "}
                          {formatTimePlayed(attempt.timeTaken)}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        </motion.main>

        <motion.aside
          variants={slideUp}
          className="hidden lg:flex flex-[0.8] flex-col p-6 h-fit"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Leaderboard
            </h2>
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
            <div className="pr-1 flex-1 space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={index}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    authResolved && user && entry.userId === user.uid
                      ? "bg-neutral-500/10 border-neutral-500/30"
                      : "bg-zinc-950/50 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  {/* Main row */}
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-5 flex justify-center">
                        {getRankIcon(index)}
                      </div>

                      {entry.photoURL ? (
                        <img
                          src={entry.photoURL}
                          alt={entry.username}
                          className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-900 object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-neutral-500/20 border border-neutral-500/30 flex items-center justify-center text-xs font-bold text-neutral-300">
                          {entry.username[0]?.toUpperCase()}
                        </div>
                      )}

                      <div>
                        <div
                          className={`text-sm font-bold ${
                            authResolved && user && entry.userId === user.uid
                              ? "text-neutral-300"
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
                        <div className="text-[10px] text-zinc-100 font-mono">
                          {formatTimePlayed(entry.timeTaken)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-sm tabular-nums">
                        {entry.correctCount}/{entry.totalQuestions}
                      </span>
                      <button
                        onClick={() =>
                          setExpandedEntries((prev) => {
                            const next = new Set(prev);
                            next.has(entry.submissionId) ? next.delete(entry.submissionId) : next.add(entry.submissionId);
                            return next;
                          })
                        }
                        className={`p-1.5 rounded-lg transition-colors ${
                          expandedEntries.has(entry.submissionId)
                            ? "text-yellow-300 bg-yellow-300/10"
                            : "text-zinc-100 hover:text-white hover:bg-zinc-800"
                        }`}
                        title="View question breakdown"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => { setInspectEntry(entry); setEloPenalty(100); setEraseAttempt(true); }}
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Inspect attempt"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable breakdown panel */}
                  {expandedEntries.has(entry.submissionId) && (
                    <div className="px-4 pb-4 pt-1 border-t border-zinc-800/60">
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {entry.questionResults ? (
                          entry.questionResults.map((correct, qi) => (
                            <div key={qi} className="relative group">
                              <div
                                className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold ${
                                  correct
                                    ? "bg-green-300/15 border border-green-400/30 text-green-300"
                                    : "bg-red-300/15 border border-red-400/30 text-red-300"
                                }`}
                              >
                                {qi + 1}
                              </div>
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap bg-zinc-900 border border-zinc-700 text-zinc-100 text-[9px] font-mono px-1.5 py-0.5 rounded pointer-events-none z-10">
                                {entry.questionTimings?.[qi] != null ? formatQuestionTime(entry.questionTimings[qi]) : "N/A"}
                              </div>
                            </div>
                          ))
                        ) : (
                          <span className="text-zinc-500 text-[11px]">no breakdown data</span>
                        )}
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40">
                        <div className="flex items-center gap-1 text-zinc-100">
                          <Info className="w-3 h-3" />
                          <span className="text-[10px]">attempt stats</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono">
                            <span className="text-zinc-100">tab switches</span>
                            <span className={`font-semibold ${entry.tabSwitchCount == null ? "text-zinc-500" : entry.tabSwitchCount > 3 ? "text-amber-400" : "text-zinc-100"}`}>
                              {entry.tabSwitchCount == null ? "N/A" : entry.tabSwitchCount}
                            </span>
                          </div>
                          <div className="w-px h-3 bg-zinc-700" />
                          <div className="flex items-center gap-1.5 text-[10px] font-mono">
                            <span className="text-zinc-100">time off tab</span>
                            <span className={`font-semibold ${entry.timeOffTab == null ? "text-zinc-500" : entry.timeOffTab > 10 ? "text-amber-400" : "text-zinc-100"}`}>
                              {entry.timeOffTab == null
                                ? "N/A"
                                : entry.timeOffTab >= 60
                                  ? `${Math.floor(entry.timeOffTab / 60)}m ${entry.timeOffTab % 60}s`
                                  : `${entry.timeOffTab}s`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.aside>
      </div>

      {inspectEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-bold text-white">Inspect Attempt</h2>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              <span className="text-zinc-200 font-semibold">{inspectEntry.username}</span>
              {" "}— {inspectEntry.correctCount}/{inspectEntry.totalQuestions} in {formatTimePlayed(inspectEntry.timeTaken)}
            </p>
            <div className="space-y-3 mb-5">
              <div className="flex justify-between items-center bg-zinc-900 rounded-xl px-4 py-3">
                <span className="text-sm text-zinc-400">Tab switches</span>
                <span className={`font-mono font-bold text-sm ${(inspectEntry.tabSwitchCount ?? 0) > 2 ? "text-red-400" : "text-zinc-200"}`}>
                  {inspectEntry.tabSwitchCount ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center bg-zinc-900 rounded-xl px-4 py-3">
                <span className="text-sm text-zinc-400">Time off tab</span>
                <span className={`font-mono font-bold text-sm ${(inspectEntry.timeOffTab ?? 0) > 10 ? "text-red-400" : "text-zinc-200"}`}>
                  {inspectEntry.timeOffTab ?? 0}s
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-5 border-t border-zinc-800 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Elo deduction</span>
                <input
                  type="number"
                  min={0}
                  value={eloPenalty}
                  onChange={(e) => setEloPenalty(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white text-right font-mono focus:outline-none focus:border-zinc-500"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={eraseAttempt}
                  onChange={(e) => setEraseAttempt(e.target.checked)}
                  className="w-4 h-4 rounded accent-red-500 cursor-pointer"
                />
                <span className="text-sm text-zinc-300">Erase attempt</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setInspectEntry(null)}
                className="flex-1 py-2.5 rounded-xl text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 transition-colors text-sm font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => handleEraseSubmission(inspectEntry)}
                disabled={erasing || (!eraseAttempt && eloPenalty === 0)}
                className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {erasing ? "Applying..." : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showStartConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/80 backdrop-blur-sm transition-all">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-neutral-500/10 blur-[80px] pointer-events-none" />

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
                  className="flex-1 py-3.5 rounded-xl font-bold bg-neutral-600 text-white hover:bg-neutral-500 shadow-lg shadow-neutral-900/20 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]"
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
