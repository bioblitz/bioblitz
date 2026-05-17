"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Search, Users } from "lucide-react";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { makeConversationId } from "@/lib/chatStore";

interface Friend {
  uid: string;
  displayName: string;
  username?: string;
  photoURL?: string;
}

interface NewConversationModalProps {
  currentUserId: string;
  onClose: () => void;
}

export default function NewConversationModal({
  currentUserId,
  onClose,
}: NewConversationModalProps) {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    const loadFriends = async () => {
      try {
        const db = getFirestore(app);
        const friendsSnap = await getDocs(
          collection(db, "users", currentUserId, "friends"),
        );

        const mutualFriends = friendsSnap.docs
          .filter((d) => d.data().status === "friends")
          .map((d) => d.data().uid as string);

        const friendProfiles: Friend[] = await Promise.all(
          mutualFriends.map(async (uid) => {
            const userSnap = await getDoc(doc(db, "users", uid));
            const data = userSnap.data();
            return {
              uid,
              displayName: data?.displayName || "User",
              username: data?.username,
              photoURL: data?.photoURL,
            };
          }),
        );

        friendProfiles.sort((a, b) =>
          (a.username || a.displayName).localeCompare(
            b.username || b.displayName,
          ),
        );

        setFriends(friendProfiles);
      } catch (err) {
        console.error("Failed to load friends:", err);
      } finally {
        setLoading(false);
      }
    };

    loadFriends();
  }, [currentUserId]);

  const filtered = query.trim()
    ? friends.filter((f) =>
        (f.username || f.displayName)
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : friends;

  const startConversation = (friendUid: string) => {
    const conversationId = makeConversationId(currentUserId, friendUid);
    router.push(`/messages/${conversationId}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <h2 className="text-base font-bold text-white">New message</h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors p-1 -mr-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search friends..."
              autoFocus
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors placeholder:text-neutral-600"
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto px-2 pb-3 [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-center text-center py-10 px-4">
              <div className="w-10 h-10 rounded-full bg-neutral-800/60 flex items-center justify-center mb-3">
                <Users className="w-4 h-4 text-neutral-500" />
              </div>
              <p className="text-sm text-neutral-300 font-medium mb-1">
                No friends yet
              </p>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Add friends from their profiles, then come back to message them.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-neutral-500 py-8">
              No friends match &quot;{query}&quot;
            </p>
          ) : (
            filtered.map((f) => (
              <button
                key={f.uid}
                onClick={() => startConversation(f.uid)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-900 transition-colors text-left"
              >
                <div className="relative w-9 h-9 shrink-0">
                  {f.photoURL ? (
                    <img
                      src={f.photoURL}
                      alt={f.displayName}
                      className="w-9 h-9 rounded-full object-cover border border-neutral-800"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = "none";
                        target.nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <div
                    className={`${
                      f.photoURL ? "hidden" : "flex"
                    } w-9 h-9 rounded-full bg-neutral-800 items-center justify-center text-xs font-bold text-neutral-400`}
                  >
                    {(f.displayName || "?")[0].toUpperCase()}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {f.username || f.displayName}
                  </p>
                  {f.username && f.displayName !== f.username && (
                    <p className="text-xs text-neutral-500 truncate">
                      {f.displayName}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
