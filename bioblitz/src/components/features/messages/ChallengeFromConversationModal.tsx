"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Check, Search } from "lucide-react";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { createChallenge } from "@/lib/challenges";

interface ChallengeFromConversationModalProps {
  senderId: string;
  recipientId: string;
  challengeType: "official" | "unofficial";
  onClose: () => void;
}

interface GameOption {
  id: string;
  title: string;
  topic?: string;
}

interface UserProfile {
  uid: string;
  username: string;
  photoURL: string;
  playedGameIds: string[];
}

async function fetchUserProfile(uid: string): Promise<UserProfile> {
  const db = getFirestore(app);
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) throw new Error("User not found");
  const data = snap.data();
  return {
    uid,
    username: data.username || data.displayName || "Unknown",
    photoURL: data.photoURL || "",
    playedGameIds: Array.isArray(data.playedGameIds) ? data.playedGameIds : [],
  };
}

export default function ChallengeFromConversationModal({
  senderId,
  recipientId,
  challengeType,
  onClose,
}: ChallengeFromConversationModalProps) {
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<GameOption[]>([]);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [senderProfile, setSenderProfile] = useState<UserProfile | null>(null);
  const [recipientProfile, setRecipientProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const db = getFirestore(app);
        const [sender, recipient] = await Promise.all([
          fetchUserProfile(senderId),
          fetchUserProfile(recipientId),
        ]);
        setSenderProfile(sender);
        setRecipientProfile(recipient);

        const senderPlayed = new Set(sender.playedGameIds);
        const recipientPlayed = new Set(recipient.playedGameIds);

        let gameOptions: GameOption[] = [];

        if (challengeType === "official") {
          // Official: blitzes neither user has played yet — fetch recent games and filter
          const setsSnap = await getDocs(
            query(collection(db, "sets"), orderBy("creation", "desc"), limit(60)),
          );
          gameOptions = setsSnap.docs
            .filter((d) => {
              const data = d.data();
              return !data.hidden && !senderPlayed.has(d.id) && !recipientPlayed.has(d.id);
            })
            .slice(0, 30)
            .map((d) => ({
              id: d.id,
              title: d.data().title || "Untitled Blitz",
              topic: d.data().topic,
            }));
        } else {
          // Unofficial: blitzes both users have already played
          const bothPlayed = sender.playedGameIds.filter((id) =>
            recipientPlayed.has(id),
          );
          const details = await Promise.all(
            bothPlayed.slice(0, 30).map(async (id) => {
              const snap = await getDoc(doc(db, "sets", id));
              if (!snap.exists()) return null;
              const d = snap.data();
              return { id, title: d.title || "Untitled Blitz", topic: d.topic } as GameOption;
            }),
          );
          gameOptions = details.filter(Boolean) as GameOption[];
        }

        setGames(gameOptions);
      } catch (err) {
        console.error("Failed to load challenge games:", err);
        setError("Couldn't load games. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [senderId, recipientId, challengeType]);

  const filtered = games.filter(
    (g) =>
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      (g.topic || "").toLowerCase().includes(search.toLowerCase()),
  );

  const handleChallenge = async (game: GameOption) => {
    if (!senderProfile || !recipientProfile) return;
    setSending(game.id);
    try {
      await createChallenge({
        blitzId: game.id,
        blitzTitle: game.title,
        challenger: {
          uid: senderProfile.uid,
          username: senderProfile.username,
          photoURL: senderProfile.photoURL,
        },
        challenged: {
          uid: recipientProfile.uid,
          username: recipientProfile.username,
          photoURL: recipientProfile.photoURL,
        },
      });
      setSent(game.id);
    } catch (err) {
      console.error("Failed to create challenge:", err);
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/80 backdrop-blur-sm">
      <div
        ref={ref}
        className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800">
          <div>
            <p className="text-white font-bold text-sm">
              {challengeType === "official" ? "Official Challenge" : "Unofficial Challenge"}
            </p>
            <p className="text-neutral-500 text-xs mt-0.5">
              {challengeType === "official"
                ? "Blitzes neither of you have played yet"
                : "Blitzes you've both already played"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-800 rounded-full text-neutral-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search blitzes..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
            />
          </div>
        </div>

        <div className="px-3 pb-4 max-h-64 overflow-y-auto space-y-1 [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-neutral-600 animate-spin" />
            </div>
          ) : error ? (
            <p className="text-center text-red-400 text-sm py-8">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-neutral-600 text-sm py-8">
              {games.length === 0
                ? challengeType === "official"
                  ? "No unplayed blitzes found."
                  : "No blitzes you've both played yet."
                : "No matching blitzes."}
            </p>
          ) : (
            filtered.map((game) => {
              const isSent = sent === game.id;
              const isSending = sending === game.id;
              return (
                <div
                  key={game.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-900 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{game.title}</p>
                    {game.topic && (
                      <p className="text-neutral-500 text-xs truncate">{game.topic}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleChallenge(game)}
                    disabled={isSending || !!sent}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isSent
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default"
                        : sent
                          ? "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700"
                          : "bg-neutral-700 hover:bg-neutral-600 text-white border border-neutral-600"
                    }`}
                  >
                    {isSending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isSent ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Sent
                      </>
                    ) : (
                      "Challenge"
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {sent && (
          <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/50">
            <p className="text-xs text-neutral-400">
              Challenge sent! Both attempts will be logged once each of you plays.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
