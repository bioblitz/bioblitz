"use client";

import { useParams, useRouter } from "next/navigation";
import { allGames } from "@/lib/gameRoomsAll";
import { gameRoom } from "@/types/index";
import { Loader2 } from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, firestore } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
  limit,
} from "firebase/firestore";

import {
  GameSubmission,
  LeaderboardEntry,
} from "@/components/features/contests/detail/types";
import ContestBanner from "@/components/features/contests/detail/ContestBanner";
import ContestInfo from "@/components/features/contests/detail/ContestInfo";
import ContestActionButtons from "@/components/features/contests/detail/ContestActionButtons";
import RegistrantsAvatars from "@/components/features/contests/detail/RegistrantsAvatars";
import ContestHistory from "@/components/features/contests/detail/ContestHistory";
import ContestLeaderboard from "@/components/features/contests/detail/ContestLeaderboard";
import InspectAttemptModal from "@/components/features/contests/detail/InspectAttemptModal";
import StartConfirmationModal from "@/components/features/contests/detail/StartConfirmationModal";

export default function GameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params?.gameId as string;

  const [user, setUser] = useState<User | null>(null);
  const [inspectEntry, setInspectEntry] = useState<LeaderboardEntry | null>(
    null,
  );
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

  const [activeSession, setActiveSession] = useState<{
    timeLeft: number;
  } | null>(null);

  const isOwner =
    authResolved && user && game ? game.creator === user.uid : false;

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
          orderBy("submittedAt", "desc"),
          limit(15),
        );

        const snapshot = await getDocs(q);
        const rawAttempts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as GameSubmission[];

        const uniqueAttempts = Array.from(
          new Map(
            rawAttempts.map((s) => [s.userId + s.submittedAt.seconds, s]),
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
            let username =
              submission.handle || submission.username || "Unknown";
            let photoURL = submission.photoURL || "";
            let bElo = submission.bElo || 500;

            try {
              const userDocRef = doc(firestore, "users", submission.userId);
              const userSnap = await getDoc(userDocRef);

              if (userSnap.exists()) {
                const userData = userSnap.data();
                username = userData.username || username;
                photoURL = userData.photoURL || photoURL;
                bElo = userData.bElo || bElo;
              }
            } catch (e) {
              console.error("Failed to fetch user profile", e);
            }

            return {
              submissionId: submission.id,
              userId: submission.userId,
              username,
              handle: username,
              photoURL: photoURL,
              correctCount: submission.correctCount ?? 0,
              totalQuestions: submission.totalQuestions ?? 0,
              questionResults: (submission as any).questionResults,
              questionTimings: (submission as any).questionTimings,
              timeTaken: submission.timeTaken,
              tabSwitchCount: (submission as any).tabSwitchCount,
              timeOffTab: (submission as any).timeOffTab,
              bElo: bElo,
            };
          }),
        );

        setLeaderboard(
          (
            leaderboardData.filter(
              (entry) => entry !== null,
            ) as LeaderboardEntry[]
          ).sort(
            (a, b) =>
              b.correctCount - a.correctCount || a.timeTaken - b.timeTaken,
          ),
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
    router.push(`/home/${gameId}/room?ranked=${isFirstAttempt && !isOwner}`);
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

  const handleEraseSubmission = async (entry: LeaderboardEntry) => {
    if (!user) return;
    if (!eraseAttempt && eloPenalty === 0) return;
    setErasing(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/submission/erase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
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
        setLeaderboard((prev) =>
          prev.filter((e) => e.submissionId !== entry.submissionId),
        );
      }
      setInspectEntry(null);
    } catch {
      alert("Failed.");
    } finally {
      setErasing(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
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

  const registrantAvatars = leaderboard.slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-900 text-white font-sans pl-0 md:pl-14">
      <ContestBanner game={game} />

      <div className="flex flex-col md:flex-row flex-1 pr-3 pl-3 md:pr-8 md:pl-4 pb-16 gap-4 md:gap-6 max-w-7xl mx-auto w-full">
        {" "}
        <motion.main
          className="w-full md:flex-[1.4] flex flex-col pr-0 md:pr-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <ContestInfo
            game={game}
            user={user}
            isAdmin={isAdmin}
            isStaff={isStaff}
            hasPlayed={hasPlayed}
            deleting={deleting}
            showMenu={showMenu}
            setShowMenu={setShowMenu}
            menuRef={menuRef}
            handleDeleteContest={handleDeleteContest}
            router={router}
          />

          <div className="flex flex-col gap-3 px-4 md:px-8">
            <ContestActionButtons
              game={game}
              user={user}
              authResolved={authResolved}
              loadingAttempts={loadingAttempts}
              activeSession={activeSession}
              isFirstAttempt={isFirstAttempt}
              isOwner={isOwner}
              proceedToGame={proceedToGame}
              handleJoinGame={handleJoinGame}
            />
            <RegistrantsAvatars
              game={game}
              loadingLeaderboard={loadingLeaderboard}
              registrantAvatars={registrantAvatars}
            />
          </div>

          <div className="px-4 md:px-8 mt-4">
            <h1 className="py-4 text-lg text-neutral-300">
              Description:
              {game.description && (
                <p className="text-lg text-neutral-300 leading-relaxed mt-2 max-w-3xl">
                  {game.description.replace(/^"(.*)"$/, "$1")}
                </p>
              )}
            </h1>
          </div>

          <ContestHistory
            loadingAttempts={loadingAttempts}
            previousAttempts={previousAttempts}
            gameId={gameId}
          />
        </motion.main>
        <ContestLeaderboard
          loadingLeaderboard={loadingLeaderboard}
          leaderboard={leaderboard}
          authResolved={authResolved}
          user={user}
          isAdmin={isAdmin}
          setInspectEntry={setInspectEntry}
          setEloPenalty={setEloPenalty}
          setEraseAttempt={setEraseAttempt}
        />
      </div>

      {inspectEntry && (
        <InspectAttemptModal
          inspectEntry={inspectEntry}
          setInspectEntry={setInspectEntry}
          eloPenalty={eloPenalty}
          setEloPenalty={setEloPenalty}
          eraseAttempt={eraseAttempt}
          setEraseAttempt={setEraseAttempt}
          erasing={erasing}
          handleEraseSubmission={handleEraseSubmission}
        />
      )}

      {showStartConfirmation && (
        <StartConfirmationModal
          setShowStartConfirmation={setShowStartConfirmation}
          proceedToGame={proceedToGame}
        />
      )}
    </div>
  );
}
