import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import LeaderboardClient from "./LeaderboardClient";
import { unstable_cache } from "next/cache";

export const revalidate = 60; // Revalidate both lists every 60 seconds

export interface LeaderboardUser {
  uid: string;
  displayName: string;
  photoURL: string;
  bElo: number;
  streak: number; // Added streak field
  school?: string;
  username: string;
}

// 1. Cached Elo Fetcher
const getEloLeaderboard = unstable_cache(
  async () => {
    const db = getFirestore(app);
    const q = query(collection(db, "users"), orderBy("bElo", "desc"), limit(50));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        displayName: data.displayName || "Anonymous",
        photoURL: data.photoURL || "",
        bElo: data.bElo || 0,
        streak: data.streak || 0,
        school: data.school,
        username: data.username || "user",
      } as LeaderboardUser;
    }).filter(u => u.bElo > 0); // Optional filter
  },
  ['leaderboard-elo'], 
  { revalidate: 1800 }
);

// 2. Cached Streak Fetcher
const getStreakLeaderboard = unstable_cache(
  async () => {
    const db = getFirestore(app);
    // Query by streak descending
    const q = query(collection(db, "users"), orderBy("streak", "desc"), limit(50));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        displayName: data.displayName || "Anonymous",
        photoURL: data.photoURL || "",
        bElo: data.bElo || 0,
        streak: data.streak || 0,
        school: data.school,
        username: data.username || "user",
      } as LeaderboardUser;
    }).filter(u => u.streak > 0); // Only show people with active streaks
  },
  ['leaderboard-streak'], 
  { revalidate: 1800 }
);

export default async function LeaderboardPage() {
  // Fetch both concurrently
  const [eloUsers, streakUsers] = await Promise.all([
    getEloLeaderboard(),
    getStreakLeaderboard()
  ]);

  return <LeaderboardClient initialEloUsers={eloUsers} initialStreakUsers={streakUsers} />;
}