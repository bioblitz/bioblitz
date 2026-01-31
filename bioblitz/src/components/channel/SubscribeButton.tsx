"use client";

import { useState, useEffect } from "react";
// 👇 Changed imports: Added 'Check', removed 'BellOff'
import { Bell, Check, Loader2 } from "lucide-react";
import { getAuth } from "firebase/auth";
import {
  doc,
  increment,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  getFirestore,
  writeBatch,
} from "firebase/firestore";
import { app } from "@/lib/firebase";

interface SubscribeButtonProps {
  topicId: string;
  topicName?: string;
}

export default function SubscribeButton({
  topicId,
  topicName,
}: SubscribeButtonProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const auth = getAuth(app);
  const db = getFirestore(app);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
      const data = doc.data();
      if (data?.subscriptions?.includes(topicId)) {
        setIsSubscribed(true);
      } else {
        setIsSubscribed(false);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user, topicId, db]);

  const toggleSubscription = async () => {
    if (!user) return alert("Please sign in to subscribe.");

    setLoading(true);
    const batch = writeBatch(db);

    const myRef = doc(db, "users", user.uid);
    const channelRef = doc(db, "users", topicId);

    try {
      if (isSubscribed) {
        batch.update(myRef, {
          subscriptions: arrayRemove(topicId),
        });
        batch.update(channelRef, {
          subscriberCount: increment(-1),
        });
      } else {
        batch.update(myRef, {
          subscriptions: arrayUnion(topicId),
        });
        batch.update(channelRef, {
          subscriberCount: increment(1),
        });
      }

      await batch.commit();
    } catch (error) {
      console.error("Error updating subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <button
      onClick={toggleSubscription}
      disabled={loading}
      // 👇 Added 'group' class to handle hover effects on child elements if needed
      className={`
        group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border
        ${
          isSubscribed
            ? "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
            : "bg-violet-600 border-transparent text-white hover:bg-violet-500 shadow-lg shadow-violet-500/20"
        }
      `}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isSubscribed ? (
        <>
          {/* 👇 Using Check icon for a positive status */}
          <Check className="w-4 h-4 group-hover:hidden" />
          {/* 👇 Optional: Show an X on hover so they know clicking will remove it */}
          <span className="hidden group-hover:inline-block w-4 h-4 text-center leading-none font-bold">
            ✕
          </span>
          <span>Subscribed</span>
        </>
      ) : (
        <>
          <Bell className="w-4 h-4" />
          Subscribe
        </>
      )}
    </button>
  );
}
