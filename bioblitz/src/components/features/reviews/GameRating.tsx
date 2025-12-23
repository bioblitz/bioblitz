"use client";

import { useState, useEffect } from "react";
import { Star, Lock } from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth"; // Import standard auth
import { firestore, auth } from "@/lib/firebase"; 

interface GameRatingProps {
  gameId: string;
  hasPlayed: boolean;
}

export default function GameRating({ gameId, hasPlayed }: GameRatingProps) {
  // Replace useAuthState with standard React state
  const [user, setUser] = useState<User | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // 1. Listen for Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch existing rating once User is loaded
  useEffect(() => {
    const fetchRating = async () => {
      if (!user) {
        // If auth is done loading and no user, stop loading state
        if (user === null) setLoading(false);
        return;
      }

      try {
        const docRef = doc(firestore, "user_ratings", `${gameId}_${user.uid}`);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          setRating(snap.data().score);
        }
      } catch (error) {
        console.error("Error fetching rating:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRating();
  }, [user, gameId]);

  const handleRate = async (score: number) => {
    if (!user || !hasPlayed) return;

    setRating(score); // Optimistic update
    try {
      const docRef = doc(firestore, "user_ratings", `${gameId}_${user.uid}`);
      await setDoc(docRef, {
        userId: user.uid,
        gameId: gameId,
        score: score,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error saving rating:", error);
    }
  };

  // Prevent flash of content before we know who the user is
  if (loading && !user) return <div className="h-6 w-24 bg-zinc-800 animate-pulse rounded" />;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          // If the user hasn't played, they can't interact, but we show empty stars
          const isActive = star <= (hover || rating);
          
          return (
            <button
              key={star}
              disabled={!hasPlayed}
              type="button"
              className={`transition-all duration-200 ${hasPlayed ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-50'}`}
              onMouseEnter={() => hasPlayed && setHover(star)}
              onMouseLeave={() => hasPlayed && setHover(rating)}
              onClick={() => handleRate(star)}
            >
              <Star
                className={`w-6 h-6 ${
                  isActive 
                    ? "fill-yellow-500 text-yellow-500" 
                    : "fill-zinc-900 text-zinc-600"
                }`}
              />
            </button>
          );
        })}
      </div>
      
      {!hasPlayed && (
        <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900/50 px-2 py-1 rounded-md border border-zinc-800 w-fit">
          <Lock className="w-3 h-3" />
          <span>Play to unlock voting</span>
        </div>
      )}
      {hasPlayed && rating > 0 && (
        <span className="text-xs text-zinc-400">Your Rating: {rating}/5</span>
      )}
    </div>
  );
}