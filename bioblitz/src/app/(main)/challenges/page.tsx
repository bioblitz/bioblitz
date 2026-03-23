"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  getFirestore,
} from "firebase/firestore";
import { app, auth } from "@/lib/firebase";
import { getUserChallenges, Challenge } from "@/lib/challenges";
import {
  Swords,
  Trophy,
  Crown,
  Medal,
  Flame,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Zap,
  History,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

interface FriendElo {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
  bElo: number;
  streak: number;
}

const RANK_COLORS = [
  {
    bar: "#f59e0b",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  {
    bar: "#a855f7",
    text: "text-black-400",
    glow: "shadow-black-500/40",
    bg: "bg-black-500/10",
    border: "border-black-500/30",
  }, // purple
  {
    bar: "#ec4899",
    text: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/30",
  },
  {
    bar: "#22c55e",
    text: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
  },
  {
    bar: "#3b82f6",
    text: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  {
    bar: "#f97316",
    text: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
  },
  {
    bar: "#06b6d4",
    text: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
  },
  {
    bar: "#ef4444",
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
];

function FriendRanking({
  friends,
  currentUid,
}: {
  friends: FriendElo[];
  currentUid: string;
}) {
  const sorted = [...friends].sort((a, b) => b.bElo - a.bElo);
  const maxElo = sorted[0]?.bElo || 1;
  const myRank = sorted.findIndex((f) => f.uid === currentUid);

  return (
    <div className="flex flex-col gap-2">
      {myRank >= 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-neutral-500/30 bg-neutral-500/[0.05] px-4 py-3 flex items-center justify-between mx-3 mt-3"
        >
          <div>
            <p
              className={`${mono} text-[10px] font-[800] uppercase text-neutral-400/60`}
              style={{ letterSpacing: "0.12em" }}
            >
              Your rank
            </p>
            <p
              className={`${mono} text-[32px] font-[800] text-white tabular-nums leading-none`}
            >
              #{myRank + 1}
            </p>
          </div>
          <div className="text-right">
            <p
              className={`${mono} text-[20px] font-[800] text-neutral-400 tabular-nums`}
            >
              {sorted[myRank]?.bElo}
            </p>
            <p className={`${mono} text-[10px] text-zinc-600`}>Elo</p>
          </div>
        </motion.div>
      )}

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center mx-3 mb-3">
          <p className="text-zinc-600 text-xs leading-relaxed">
            Add friends from your profile to see rankings.
          </p>
        </div>
      ) : (
        <div className="px-3 pb-3 pt-1 space-y-1">
          {sorted.map((friend, i) => {
            const isMe = friend.uid === currentUid;
            const c = RANK_COLORS[i % RANK_COLORS.length];
            const barWidth = Math.max(
              15,
              Math.round((friend.bElo / maxElo) * 100),
            );

            return (
              <motion.div
                key={friend.uid}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3, ease: "easeOut" }}
              >
                <Link href={`/profile/${friend.username}`}>
                  <div
                    className={`relative group rounded-xl overflow-hidden cursor-pointer transition-all ${
                      isMe ? "bg-neutral-500/[0.04]" : "hover:bg-neutral-600/60"
                    }`}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 opacity-[0.07] transition-all duration-500 rounded-xl"
                      style={{ width: `${barWidth}%`, backgroundColor: c.bar }}
                    />

                    <div className="relative flex items-center gap-2.5 px-3 py-2.5">
                      <div className="w-5 flex justify-center flex-shrink-0">
                        {i === 0 ? (
                          <Crown className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                        ) : i === 1 ? (
                          <Medal className="w-3.5 h-3.5 text-zinc-300" />
                        ) : i === 2 ? (
                          <Medal className="w-3.5 h-3.5 text-orange-500" />
                        ) : (
                          <span
                            className={`${mono} text-zinc-600 text-[11px] font-bold`}
                          >
                            {i + 1}
                          </span>
                        )}
                      </div>

                      <div className="relative flex-shrink-0">
                        {friend.photoURL ? (
                          <img
                            src={friend.photoURL}
                            alt={friend.displayName}
                            className="w-8 h-8 rounded-full object-cover"
                            style={{ border: `2px solid ${c.bar}40` }}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div
                            className={`${mono} w-8 h-8 rounded-full flex items-center justify-center text-xs font-[800]`}
                            style={{
                              backgroundColor: `${c.bar}20`,
                              color: c.bar,
                              border: `2px solid ${c.bar}40`,
                            }}
                          >
                            {friend.displayName[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-bold truncate group-hover:text-white transition-colors ${isMe ? "text-neutral-400" : "text-zinc-200"}`}
                        >
                          {isMe ? "You" : friend.displayName}
                        </p>
                        {friend.streak > 0 && (
                          <p className="text-[10px] text-zinc-600 flex items-center gap-0.5 mt-0.5">
                            <Flame className="w-2.5 h-2.5 text-orange-500 fill-orange-500" />
                            {friend.streak}d
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div
                          className="w-[6px] h-[6px] rounded-full"
                          style={{ backgroundColor: c.bar }}
                        />
                        <span
                          className={`${mono} text-[13px] font-[800] tabular-nums`}
                          style={{ color: c.bar }}
                        >
                          {friend.bElo}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChallengeCard({
  challenge,
  currentUid,
  index,
  urgent,
}: {
  challenge: Challenge;
  currentUid: string;
  index: number;
  urgent?: boolean;
}) {
  const isChallenger = challenge.challengerId === currentUid;
  const opponent = isChallenger
    ? {
        name: challenge.challengedUsername,
        photo: challenge.challengedPhotoURL,
      }
    : {
        name: challenge.challengerUsername,
        photo: challenge.challengerPhotoURL,
      };

  const myScore = isChallenger
    ? challenge.challengerScore
    : challenge.challengedScore;
  const theirScore = isChallenger
    ? challenge.challengedScore
    : challenge.challengerScore;

  const isPending = challenge.status === "pending";
  const isCompleted = challenge.status === "completed";
  const iWon = isCompleted && challenge.winnerId === currentUid;
  const iLost = isCompleted && challenge.winnerId !== currentUid;

  const expiresMs = challenge.expiresAt?.toMillis?.() ?? 0;
  const hoursLeft = Math.max(
    0,
    Math.round((expiresMs - Date.now()) / (1000 * 60 * 60)),
  );
  const needsMyPlay = isPending && myScore === null;
  const isExpiringSoon = hoursLeft <= 6 && needsMyPlay;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.25, ease: "easeOut" }}
    >
      <Link href={`/home/${challenge.blitzId}`}>
        <div
          className={`group relative rounded-2xl border transition-all cursor-pointer overflow-hidden ${
            urgent && needsMyPlay
              ? "border-neutral-500/50"
              : isCompleted && iWon
                ? "border-neutral-500/25 bg-[rgba(9,9,11,0.7)] hover:border-neutral-500/40"
                : "border-zinc-800 bg-[rgba(9,9,11,0.6)] hover:border-zinc-700"
          }`}
        >
          {urgent && needsMyPlay && (
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background:
                  "linear-gradient(105deg, transparent 40%, rgba(139,92,246,0.08) 50%, transparent 60%)",
              }}
            />
          )}

          <div
            className={`absolute left-0 top-0 bottom-0 w-[3px] ${
              urgent && needsMyPlay
                ? "bg-black"
                : iWon
                  ? "bg-emerald-500"
                  : "bg-zinc-700"
            }`}
          />

          <div className="flex items-center gap-3.5 p-4 pl-5">
            <div className="relative flex-shrink-0">
              {opponent.photo ? (
                <img
                  src={opponent.photo}
                  alt={opponent.name}
                  className={`w-11 h-11 rounded-full object-cover transition-all ${
                    urgent && needsMyPlay
                      ? "ring-2 ring-neutral-500/50 ring-offset-1"
                      : "border border-zinc-700"
                  }`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className={`${mono} w-11 h-11 rounded-full flex items-center justify-center text-sm font-[800] transition-all ${
                    urgent && needsMyPlay
                      ? "bg-neutral-400/40 text-neutral-300 ring-2 ring-neutral-500/50 ring-offset-1 ring-offset-[#09090b]"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}
                >
                  {opponent.name[0]?.toUpperCase()}
                </div>
              )}
              {needsMyPlay && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-neutral-500 border-2 border-[#09090b]" />
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className={`text-[14px] font-bold truncate leading-tight transition-colors ${
                  urgent && needsMyPlay ? "text-white" : "text-zinc-200"
                }`}
              >
                {challenge.blitzTitle}
              </p>
              <p className="text-zinc-500 text-[12px] mt-0.5">
                vs{" "}
                <span className="text-zinc-400 font-semibold">
                  @{opponent.name}
                </span>
              </p>

              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {needsMyPlay && (
                  <span
                    className={`${mono} inline-flex items-center gap-1 text-[10px] font-[800] uppercase px-2 py-1 rounded-lg ${
                      isExpiringSoon
                        ? "text-red-300 bg-red-500/12 border border-red-500/30"
                        : "text-neutral-200 bg-neutral-500/15 border border-neutral-500/30"
                    }`}
                    style={{ letterSpacing: "0.06em" }}
                  >
                    <Zap className="w-2.5 h-2.5" />
                    {!isChallenger && theirScore !== null
                      ? `Beat ${theirScore} pts`
                      : isExpiringSoon
                        ? `${hoursLeft}h left — hurry!`
                        : `Your turn · ${hoursLeft}h`}
                  </span>
                )}
                {isPending && myScore !== null && theirScore === null && (
                  <span
                    className={`${mono} inline-flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-500 bg-zinc-800 border border-zinc-700/60 px-2 py-0.5 rounded-lg`}
                    style={{ letterSpacing: "0.06em" }}
                  >
                    <Clock className="w-2.5 h-2.5" /> {hoursLeft}h left
                  </span>
                )}
                {iWon && (
                  <span
                    className={`${mono} inline-flex items-center gap-1 text-[10px] font-[800] uppercase text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-lg`}
                    style={{ letterSpacing: "0.06em" }}
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" /> Won
                  </span>
                )}
                {iLost && (
                  <span
                    className={`${mono} inline-flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-600 bg-zinc-800/80 border border-zinc-700/50 px-2 py-0.5 rounded-lg`}
                    style={{ letterSpacing: "0.06em" }}
                  >
                    <XCircle className="w-2.5 h-2.5" /> Lost
                  </span>
                )}
              </div>
            </div>

            {/* Score or arrow */}
            {isCompleted && myScore !== null && theirScore !== null ? (
              <div className="flex-shrink-0 text-right">
                <div
                  className={`${mono} text-[24px] font-[800] tabular-nums leading-none ${iWon ? "text-emerald-400" : "text-zinc-600"}`}
                >
                  {myScore}
                </div>
                <div
                  className={`${mono} text-[11px] text-zinc-600 tabular-nums mt-0.5`}
                >
                  vs {theirScore}
                </div>
              </div>
            ) : needsMyPlay ? (
              <div
                className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                  urgent
                    ? "bg-neutral-600 group-hover:bg-neutral-500."
                    : "bg-zinc-800 group-hover:bg-zinc-700"
                }`}
              >
                <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
              </div>
            ) : null}
          </div>

          {urgent && needsMyPlay && (
            <div className="absolute bottom-0 left-0 right-0 h-px" />
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export default function ChallengesPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<FriendElo[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }
      setUid(user.uid);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!uid) return;
    const load = async () => {
      setLoading(true);
      await Promise.all([loadFriends(uid), loadChallenges(uid)]);
      setLoading(false);
    };
    load();
  }, [uid]);

  const loadFriends = async (userId: string) => {
    const friendsSnap = await getDocs(
      query(
        collection(db, "users", userId, "friends"),
        where("status", "==", "friends"),
      ),
    );
    const friendUids = friendsSnap.docs
      .map((d) => (d.data() as any).uid)
      .filter(Boolean);
    const allUids = [userId, ...friendUids];
    const profiles = await Promise.all(
      allUids.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, "users", uid));
          if (!snap.exists()) return null;
          const d = snap.data() as any;
          return {
            uid,
            displayName: d.displayName || "Unknown",
            username: d.username || uid,
            photoURL: d.photoURL || "",
            bElo: d.bElo || 0,
            streak: d.streak || 0,
          };
        } catch {
          return null;
        }
      }),
    );
    setFriends(profiles.filter(Boolean) as FriendElo[]);
  };

  const loadChallenges = async (userId: string) => {
    const all = await getUserChallenges(userId);
    setChallenges(all);
  };

  const pending = useMemo(
    () => challenges.filter((c) => c.status === "pending"),
    [challenges],
  );
  const history = useMemo(
    () =>
      challenges.filter(
        (c) => c.status === "completed" || c.status === "expired",
      ),
    [challenges],
  );
  const needsMyPlay = useMemo(
    () =>
      pending.filter((c) => {
        const myScore =
          c.challengerId === uid ? c.challengerScore : c.challengedScore;
        return myScore === null;
      }),
    [pending, uid],
  );
  const waiting = useMemo(
    () =>
      pending.filter((c) => {
        const myScore =
          c.challengerId === uid ? c.challengerScore : c.challengedScore;
        return myScore !== null;
      }),
    [pending, uid],
  );

  const wins = history.filter((c) => c.winnerId === uid).length;
  const losses = history.filter(
    (c) => c.status === "completed" && c.winnerId !== uid,
  ).length;

  if (loading) {
    return (
      <div
        className={`${dmSans.className} min-h-screen bg-black flex items-center justify-center`}
      >
        <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`${dmSans.className} min-h-screen bg-black text-white`}>
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-10"
        >
          <div className="relative inline-flex items-center justify-center w-[72px] h-[72px] rounded-2xl bg-neutral-500/12 border border-neutral-500/25 mb-4">
            <Swords className="w-10 h-10 text-neutral-400" />
            <div className="absolute inset-[-20px] bg-[radial-gradient(circle,rgba(139,92,246,0.12)_0%,transparent_70%)] rounded-full pointer-events-none" />
          </div>
          <h1
            className="text-[36px] font-[900] text-white"
            style={{ letterSpacing: "-0.02em" }}
          >
            Compete
          </h1>

          {needsMyPlay.length > 0 && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full bg-neutral-500/12 border border-neutral-500/30 text-neutral-300 text-[13px] font-bold"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-500" />
              </span>
              {needsMyPlay.length} challenge
              {needsMyPlay.length !== 1 ? "s" : ""} waiting for you
            </motion.div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-7 items-start">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-0.5 p-[3px] bg-[rgba(9,9,11,0.8)] border border-zinc-800 rounded-xl">
              <button
                onClick={() => setActiveTab("active")}
                className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-bold transition-all ${
                  activeTab === "active"
                    ? needsMyPlay.length > 0
                      ? "bg-neutral-600 text-white"
                      : "bg-zinc-800 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                Active
                {needsMyPlay.length > 0 && (
                  <span
                    className={`${mono} w-5 h-5 rounded-full bg-white text-[10px] font-[800] flex items-center justify-center leading-none`}
                  >
                    {needsMyPlay.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-bold transition-all ${
                  activeTab === "history"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                History
                {history.length > 0 && (
                  <span
                    className={`${mono} text-zinc-600 text-[11px] font-medium`}
                  >
                    {wins}W {losses}L
                  </span>
                )}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "active" && (
                <motion.div
                  key="active"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  {needsMyPlay.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-500" />
                        </span>
                        <p
                          className={`${mono} text-[10px] font-[800] text-neutral-400 uppercase`}
                          style={{ letterSpacing: "0.12em" }}
                        >
                          Your turn
                        </p>
                      </div>
                      {needsMyPlay.map(
                        (c, i) =>
                          uid && (
                            <ChallengeCard
                              key={c.id}
                              challenge={c}
                              currentUid={uid}
                              index={i}
                              urgent
                            />
                          ),
                      )}
                    </div>
                  )}

                  {waiting.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-zinc-700" />
                        <p
                          className={`${mono} text-[10px] font-bold text-zinc-600 uppercase`}
                          style={{ letterSpacing: "0.12em" }}
                        >
                          Waiting on them
                        </p>
                      </div>
                      {waiting.map(
                        (c, i) =>
                          uid && (
                            <ChallengeCard
                              key={c.id}
                              challenge={c}
                              currentUid={uid}
                              index={i}
                            />
                          ),
                      )}
                    </div>
                  )}

                  {pending.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-zinc-800 p-14 text-center">
                      <Swords className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
                      <p className="text-zinc-500 text-sm font-semibold">
                        No active challenges
                      </p>
                      <p className="text-zinc-700 text-xs mt-2 max-w-xs mx-auto leading-relaxed">
                        Open any Blitz and hit "Challenge a Friend" to start
                        competing.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "history" && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-2.5"
                >
                  {history.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-800 p-14 text-center">
                      <History className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
                      <p className="text-zinc-500 text-sm">
                        No completed challenges yet.
                      </p>
                    </div>
                  ) : (
                    <>
                      {wins + losses > 0 && (
                        <div className="flex items-center gap-5 px-5 py-3.5 rounded-xl border border-zinc-800 bg-[rgba(9,9,11,0.6)] mb-4">
                          <div>
                            <span
                              className={`${mono} text-[24px] font-[800] text-emerald-400 tabular-nums`}
                            >
                              {wins}
                            </span>
                            <span
                              className={`${mono} text-[11px] text-zinc-600 uppercase ml-1.5`}
                              style={{ letterSpacing: "0.08em" }}
                            >
                              W
                            </span>
                          </div>
                          <div className="w-px h-6 bg-zinc-800" />
                          <div>
                            <span
                              className={`${mono} text-[24px] font-[800] text-zinc-500 tabular-nums`}
                            >
                              {losses}
                            </span>
                            <span
                              className={`${mono} text-[11px] text-zinc-600 uppercase ml-1.5`}
                              style={{ letterSpacing: "0.08em" }}
                            >
                              L
                            </span>
                          </div>
                          <div className="w-px h-6 bg-zinc-800" />
                          <span className="text-[13px] font-bold text-zinc-400">
                            {Math.round((wins / (wins + losses)) * 100)}% win
                            rate
                          </span>
                        </div>
                      )}
                      {history.map(
                        (c, i) =>
                          uid && (
                            <ChallengeCard
                              key={c.id}
                              challenge={c}
                              currentUid={uid}
                              index={i}
                            />
                          ),
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right column: Friends */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className="lg:sticky lg:top-24 space-y-3"
          >
            <div className="flex items-center gap-2.5 px-1">
              <Trophy className="w-7 h-7 text-amber-500" />
              <p className="text-[18px] font-[800] text-white">
                Friends Ranking
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-[rgba(9,9,11,0.8)] overflow-hidden">
              {uid && <FriendRanking friends={friends} currentUid={uid} />}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
