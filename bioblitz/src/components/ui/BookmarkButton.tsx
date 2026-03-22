"use client";

import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { getAuth } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getFirestore,
  serverTimestamp,
} from "firebase/firestore";
import { app } from "@/lib/firebase";

const db = getFirestore(app);

interface BookmarkButtonProps {
  gameId: string;
  questionIndex: number;
  gameTitle?: string;
  correctAnswer?: string;
  userAnswer?: string;
}

export default function BookmarkButton({
  gameId,
  questionIndex,
  gameTitle,
  correctAnswer,
  userAnswer,
}: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(app);

  const bookmarkId = `${gameId}_q${questionIndex}`;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      const checkBookmark = async () => {
        try {
          const ref = doc(
            db,
            "users",
            user.uid,
            "bookmarkedQuestions",
            bookmarkId,
          );
          const snap = await getDoc(ref);
          setBookmarked(snap.exists());
        } catch (err) {
          console.error("Error checking bookmark:", err);
        } finally {
          setLoading(false);
        }
      };

      checkBookmark();
    });

    return () => unsubscribe();
  }, [bookmarkId]);

  const toggleBookmark = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(db, "users", user.uid, "bookmarkedQuestions", bookmarkId);

    try {
      if (bookmarked) {
        await deleteDoc(ref);
        setBookmarked(false);
      } else {
        await setDoc(ref, {
          gameId,
          questionIndex,
          gameTitle: gameTitle || "",
          correctAnswer: correctAnswer || "",
          userAnswer: userAnswer || "",
          bookmarkedAt: serverTimestamp(),
        });
        setBookmarked(true);
      }
    } catch (err) {
      console.error("Error toggling bookmark:", err);
    }
  };

  if (loading) return null;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleBookmark();
      }}
      className={`p-1.5 rounded-lg transition-all ${
        bookmarked
          ? "text-amber-400 bg-amber-500/15 hover:bg-amber-500/25"
          : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800"
      }`}
      title={bookmarked ? "Remove bookmark" : "Bookmark this question"}
    >
      <Bookmark
        className={`w-4 h-4 transition-all ${bookmarked ? "fill-amber-400" : ""}`}
      />
    </button>
  );
}
