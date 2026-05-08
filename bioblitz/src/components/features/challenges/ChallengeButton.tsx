"use client";

import { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";
import { createChallenge, hasOpenChallenge } from "@/lib/challenges";
import { X, Search, Check, Loader2 } from "lucide-react";

interface Friend {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
  bElo: number;
}
interface ChallengeButtonProps {
  blitzId: string;
  blitzTitle: string;
  onPlay?: () => void;
}
export default function ChallengeButton({
  blitzId,
  blitzTitle,
  onPlay,
}: ChallengeButtonProps) {
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [alreadyChallenged, setAlreadyChallenged] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const auth = getAuth(app);
  const db = getFirestore(app);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      setCheckingStatus(false);
      return;
    }
    hasOpenChallenge(user.uid, blitzId).then((has) => {
      setAlreadyChallenged(has);
      setCheckingStatus(false);
    });
  }, [user, blitzId]);

  const loadFriends = async () => {
    if (!user) return;
    setLoadingFriends(true);
    try {
      const friendsSnap = await getDocs(
        query(
          collection(db, "users", user.uid, "friends"),
          where("status", "==", "friends"),
        ),
      );
      const blitzSnap = await getDoc(doc(db, "sets", blitzId));
      const blitzCreatorId = blitzSnap.data()?.creator;
      const profiles = await Promise.all(
        friendsSnap.docs.map(async (d) => {
          const friendUid = (d.data() as any).uid;
          const snap = await getDoc(doc(db, "users", friendUid));
          if (!snap.exists()) return null;
          const data = snap.data() as any;

          const submissionSnap = await getDocs(
            query(
              collection(db, "gameSubmissions"),
              where("userId", "==", friendUid),
              where("gameId", "==", blitzId),
              where("ranked", "==", true),
            ),
          );
          if (!submissionSnap.empty) return null;
          if (friendUid === blitzCreatorId) return null;

          return {
            uid: friendUid,
            displayName: data.displayName || "Unknown",
            username: data.username || "",
            photoURL: data.photoURL || "",
            bElo: data.bElo || 0,
          };
        }),
      );
      setFriends(profiles.filter(Boolean) as Friend[]);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setSearch("");
    setSent(null);
    loadFriends();
  };

  const handleSend = async (friend: Friend) => {
    if (!user) return;
    setSending(friend.uid);
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const userData = userSnap.data() as any;
      await createChallenge({
        blitzId,
        blitzTitle,
        challenger: {
          uid: user.uid,
          username: userData?.username || user.displayName || "Unknown",
          photoURL: userData?.photoURL || user.photoURL || "",
        },
        challenged: {
          uid: friend.uid,
          username: friend.username,
          photoURL: friend.photoURL,
        },
      });
      setSent(friend.uid);
      setAlreadyChallenged(true);
    } finally {
      setSending(null);
    }
  };

  const filtered = friends.filter(
    (f) =>
      f.displayName.toLowerCase().includes(search.toLowerCase()) ||
      f.username.toLowerCase().includes(search.toLowerCase()),
  );

  if (!user) return null;

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={checkingStatus || alreadyChallenged}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
          alreadyChallenged
            ? "border-neutral-800 bg-neutral-900/50 text-neutral-600 cursor-not-allowed"
            : "border-neutral-700 bg-neutral-800/60 text-white hover:bg-neutral-800 hover:border-neutral-600"
        }`}
      >
        {alreadyChallenged ? "Challenge sent" : "Challenge a Friend"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-white font-bold text-sm">
                    Challenge a Friend
                  </p>
                  <p className="text-neutral-500 text-xs truncate max-w-[180px]">
                    {blitzTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-neutral-800 rounded-full text-neutral-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pt-4 pb-2">
              <p className="text-xs text-neutral-500 leading-relaxed">
                You'll play this Blitz and your score will be sent as the
                challenge. Your friend has{" "}
                <span className="text-neutral-300 font-medium">48 hours</span> to
                beat it. Each attempt counts toward your own Elo rating.
              </p>
            </div>

            <div className="px-6 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search friends..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
                />
              </div>
            </div>

            <div className="px-3 pb-4 max-h-64 overflow-y-auto space-y-1">
              {loadingFriends ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-neutral-600 animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-neutral-600 text-sm py-8">
                  {friends.length === 0
                    ? "No friends eligible — they may have already played this Blitz."
                    : "No matching friends."}
                </p>
              ) : (
                filtered.map((friend) => {
                  const isSent = sent === friend.uid;
                  const isSending = sending === friend.uid;
                  return (
                    <div
                      key={friend.uid}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-900 transition-colors"
                    >
                      {friend.photoURL ? (
                        <img
                          src={friend.photoURL}
                          alt={friend.displayName}
                          className="w-9 h-9 rounded-full object-cover border border-neutral-800 flex-shrink-0"

                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-neutral-900/30 flex items-center justify-center text-neutral-300 font-bold text-sm flex-shrink-0">
                          {friend.displayName[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {friend.username || friend.displayName}
                        </p>
                        <p className="text-neutral-500 text-xs">
                          {friend.bElo} Elo
                        </p>
                      </div>
                      <button
                        onClick={() => handleSend(friend)}
                        disabled={isSending || isSent}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isSent
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default"
                            : "bg-neutral-700 hover:bg-neutral-600 text-white border border-neutral-600"
                        }`}
                      >
                        {isSending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isSent ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Sent
                          </>
                        ) : (
                          <>Challenge</>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {sent && (
              <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/50">
                <p className="text-xs text-neutral-400 mb-3">
                  Challenge sent! Now play this Blitz — your score will be
                  locked in as the target.
                </p>
                <button
                  onClick={() => {
                    setOpen(false);
                    onPlay?.();
                  }}
                  className="w-full py-2.5 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-bold transition-colors"
                >
                  Play Now →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
