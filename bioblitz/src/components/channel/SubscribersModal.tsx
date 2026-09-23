"use client";

import { useEffect, useState } from "react";
import { X, User, Users, ArrowUpRight, Loader2 } from "lucide-react";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  getFirestore,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { UserProfile } from "@/lib/user";
import Link from "next/link";

interface SubscribersModalProps {
  channelId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SubscribersModal({
  channelId,
  isOpen,
  onClose,
}: SubscribersModalProps) {
  const [subscribers, setSubscribers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore(app);

  useEffect(() => {
    if (!isOpen || !channelId) return;

    async function fetchSubscribers() {
      setLoading(true);
      try {
        const q = query(
          collection(db, "users"),
          where("subscriptions", "array-contains", channelId),
          limit(50),
        );

        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(
          (doc) =>
            ({
              uid: doc.id,
              ...doc.data(),
            }) as UserProfile,
        );

        setSubscribers(users);
      } catch (error) {
        console.error("Error fetching subscribers:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscribers();
  }, [channelId, isOpen, db]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with Blur */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm animate-in fade-in duration-200"
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800/50 flex justify-between items-center bg-neutral-900/30 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-500/10 flex items-center justify-center border border-neutral-500/20">
              <Users className="w-5 h-5 text-neutral-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg leading-tight">
                Subscribers
              </h3>
              <p className="text-xs text-neutral-500">
                People following this channel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List Body with Purple Scrollbar */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 [scrollbar-width:thin] [scrollbar-color:#8b5cf6_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-neutral-500/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 border-neutral-500 animate-spin text-neutral-500" />
              <p className="text-xs text-neutral-500 font-medium">
                Loading fans...
              </p>
            </div>
          ) : subscribers.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 bg-neutral-900/30 rounded-2xl border border-neutral-800/50 border-dashed m-2">
              <p>No subscribers yet.</p>
            </div>
          ) : (
            <>
              {subscribers.map((sub) => (
                <Link
                  key={sub.uid}
                  href={`/profile/${sub.username || sub.uid}`} // Fallback if username missing
                  onClick={onClose}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800/50 transition-all group"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {sub.photoURL ? (
                      <div className="relative w-10 h-10">
                        <img
                          src={sub.photoURL}
                          alt={sub.username || "User"}
                          className="w-10 h-10 rounded-full object-cover border border-neutral-800 group-hover:border-neutral-500/30 transition-colors"

                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling?.classList.remove("hidden");
                          }}
                        />
                        <div className="hidden absolute inset-0 w-10 h-10 rounded-full bg-neutral-900/20 flex items-center justify-center text-neutral-300 font-bold border border-neutral-500/20">
                          {sub.displayName?.[0]?.toUpperCase() || "?"}
                        </div>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-neutral-900/20 flex items-center justify-center text-neutral-300 font-bold border border-neutral-500/20">
                        {sub.displayName?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>

                  {/* Name Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-neutral-200 font-medium truncate group-hover:text-white transition-colors text-sm">
                      {sub.username || "Unknown"}
                    </p>
                  </div>

                  {/* Icon */}
                  <ArrowUpRight className="w-4 h-4 text-neutral-700 group-hover:text-neutral-400 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && subscribers.length > 0 && (
          <div className="p-3 border-t border-neutral-800/50 bg-neutral-900/30 text-center rounded-b-3xl">
            <p className="text-[10px] text-neutral-500 font-medium tracking-wider">
              {subscribers.length} Total Subscribers
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
