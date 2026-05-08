"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { getRatingTier } from "@/lib/rating";
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

function FriendRanking({
  friends,
  currentUid,
}: {
  friends: FriendElo[];
  currentUid: string;
}) {
  const sorted = [...friends].sort((a, b) => b.bElo - a.bElo);

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-800 p-8 text-center mx-3 mb-3">
        <p className="text-neutral-600 text-xs leading-relaxed">
          Add friends from your profile to see rankings.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 flex flex-col space-y-2">
      {sorted.map((friend, i) => {
        const isMe = friend.uid === currentUid;
        return (
          <Link href={`/profile/${friend.username}`} key={friend.uid}>
            <div
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                isMe
                  ? "bg-neutral-500/[0.08] border border-neutral-500/30 text-white font-semibold"
                  : "bg-[rgba(24,24,27,0.6)] text-neutral-300 border border-transparent hover:border-neutral-800"
              }`}
            >
              <div className="w-6 flex justify-center">
                <span className="text-neutral-500 font-mono text-s w-6 text-center">
                  #{i + 1}
                </span>
              </div>

              {friend.photoURL ? (
                <img
                  src={friend.photoURL}
                  alt={friend.displayName}
                  className="w-9 h-9 rounded-full border border-neutral-800 bg-neutral-900 object-cover"

                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-neutral-500/20 border border-neutral-500/30 flex items-center justify-center text-xs font-bold text-neutral-300">
                  {friend.displayName[0]?.toUpperCase()}
                </div>
              )}

              <div className="truncate flex-1 text-left text-[13px] font-bold">
                <span className={getRatingTier(friend.bElo).textClass}>
                  {isMe ? "You" : (friend.username || friend.displayName)}
                </span>
              </div>

              <div className="text-right">
                <span
                  className={`font-normal text-[16px] tabular-nums ${isMe ? "text-neutral-400" : "text-neutral-300"}`}
                >
                  {friend.bElo}
                </span>
                <p className="text-[11px] text-neutral-500">Elo</p>
              </div>
            </div>
          </Link>
        );
      })}
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
                : "border-neutral-800 bg-[rgba(9,9,11,0.6)] hover:border-neutral-700"
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
                ? "bg-neutral-900"
                : iWon
                  ? "bg-emerald-500"
                  : "bg-neutral-700"
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
                      : "border border-neutral-700"
                  }`}

                />
              ) : (
                <div
                  className={`${mono} w-11 h-11 rounded-full flex items-center justify-center text-sm font-normal transition-all ${
                    urgent && needsMyPlay
                      ? "bg-neutral-400/40 text-neutral-300 ring-2 ring-neutral-500/50 ring-offset-1 ring-offset-[#09090b]"
                      : "bg-neutral-800 text-neutral-400 border border-neutral-700"
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
                  urgent && needsMyPlay ? "text-white" : "text-neutral-200"
                }`}
              >
                {challenge.blitzTitle}
              </p>
              <p className="text-neutral-500 text-[12px] mt-0.5">
                vs{" "}
                <span className="text-neutral-400 font-semibold">
                  @{opponent.name}
                </span>
              </p>

              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {needsMyPlay && (
                  <span
                    className={`${mono} inline-flex items-center gap-1 text-[10px] font-normal uppercase px-2 py-1 rounded-lg ${
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
                    className={`${mono} inline-flex items-center gap-1 text-[10px] font-bold uppercase text-neutral-500 bg-neutral-800 border border-neutral-700/60 px-2 py-0.5 rounded-lg`}
                    style={{ letterSpacing: "0.06em" }}
                  >
                    <Clock className="w-2.5 h-2.5" /> {hoursLeft}h left
                  </span>
                )}
                {iWon && (
                  <span
                    className={`${mono} inline-flex items-center gap-1 text-[10px] font-normal uppercase text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-lg`}
                    style={{ letterSpacing: "0.06em" }}
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" /> Won
                  </span>
                )}
                {iLost && (
                  <span
                    className={`${mono} inline-flex items-center gap-1 text-[10px] font-bold uppercase text-neutral-600 bg-neutral-800/80 border border-neutral-700/50 px-2 py-0.5 rounded-lg`}
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
                  className={`${mono} text-[24px] font-normal tabular-nums leading-none ${iWon ? "text-emerald-400" : "text-neutral-600"}`}
                >
                  {myScore}
                </div>
                <div
                  className={`${mono} text-[11px] text-neutral-600 tabular-nums mt-0.5`}
                >
                  vs {theirScore}
                </div>
              </div>
            ) : needsMyPlay ? (
              <div
                className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                  urgent
                    ? "bg-neutral-600 group-hover:bg-neutral-500."
                    : "bg-neutral-800 group-hover:bg-neutral-700"
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

    const valid = await Promise.all(
      all.map(async (c) => {
        try {
          const blitzSnap = await getDoc(doc(db, "sets", c.blitzId));
          return blitzSnap.exists() ? c : null;
        } catch {
          return null;
        }
      }),
    );

    setChallenges(valid.filter(Boolean) as Challenge[]);
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
        className={`${dmSans.className} min-h-screen bg-neutral-900 flex items-center justify-center`}
      >
        <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`${dmSans.className} min-h-screen bg-neutral-900 text-white`}
    >
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <main className="max-w-6xl mx-auto pl-16 pr-4 sm:pr-6 lg:pr-8 pt-24 pb-16 relative z-10">
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
            <div className="inline-flex items-center gap-0.5 p-[3px] bg-[rgba(9,9,11,0.8)] border border-neutral-800 rounded-xl">
              <button
                onClick={() => setActiveTab("active")}
                className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-bold transition-all ${
                  activeTab === "active"
                    ? needsMyPlay.length > 0
                      ? "bg-neutral-600 text-white"
                      : "bg-neutral-800 text-white"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                Active
                {needsMyPlay.length > 0 && (
                  <span
                    className={`${mono} w-5 h-5 rounded-full bg-white text-[10px] font-normal flex items-center justify-center leading-none`}
                  >
                    {needsMyPlay.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-bold transition-all ${
                  activeTab === "history"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                History
                {history.length > 0 && (
                  <span
                    className={`${mono} text-neutral-600 text-[11px] font-medium`}
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
                          className={`${mono} text-[10px] font-normal text-neutral-400 uppercase`}
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
                        <div className="w-2 h-2 rounded-full bg-neutral-700" />
                        <p
                          className={`${mono} text-[10px] font-bold text-neutral-600 uppercase`}
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
                    <div className="rounded-2xl border border-dashed border-neutral-800 p-14 text-center">
                      <Swords className="w-10 h-10 text-neutral-800 mx-auto mb-4" />
                      <p className="text-neutral-500 text-sm font-semibold">
                        No active challenges
                      </p>
                      <p className="text-neutral-700 text-xs mt-2 max-w-xs mx-auto leading-relaxed">
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
                  transition={{ duration: 0.15 }}
                  className="space-y-2.5"
                >
                  {history.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-neutral-800 p-14 text-center">
                      <History className="w-10 h-10 text-neutral-800 mx-auto mb-4" />
                      <p className="text-neutral-500 text-sm">
                        No completed challenges yet.
                      </p>
                    </div>
                  ) : (
                    <>
                      {wins + losses > 0 && (
                        <div className="flex items-center gap-5 px-5 py-3.5 rounded-xl border border-neutral-800 bg-[rgba(9,9,11,0.6)] mb-4">
                          <div>
                            <span
                              className={`${mono} text-[24px] font-normal text-emerald-400 tabular-nums`}
                            >
                              {wins}
                            </span>
                            <span
                              className={`${mono} text-[11px] text-neutral-600 uppercase ml-1.5`}
                              style={{ letterSpacing: "0.08em" }}
                            >
                              W
                            </span>
                          </div>
                          <div className="w-px h-6 bg-neutral-800" />
                          <div>
                            <span
                              className={`${mono} text-[24px] font-normal text-neutral-500 tabular-nums`}
                            >
                              {losses}
                            </span>
                            <span
                              className={`${mono} text-[11px] text-neutral-600 uppercase ml-1.5`}
                              style={{ letterSpacing: "0.08em" }}
                            >
                              L
                            </span>
                          </div>
                          <div className="w-px h-6 bg-neutral-800" />
                          <span className="text-[13px] font-bold text-neutral-400">
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
              <p className="text-[18px] font-normal text-white">
                Friends Ranking
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-[rgba(9,9,11,0.8)] overflow-hidden">
              {uid && <FriendRanking friends={friends} currentUid={uid} />}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
