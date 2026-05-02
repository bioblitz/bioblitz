import { unstable_cache } from "next/cache";
import { adminFirestore } from "@/lib/firebase-admin";

export interface LeaderboardUser {
  uid: string;
  displayName: string;
  photoURL: string;
  bElo: number;
  streak: number;
  contestsPlayed: number;
  school?: string;
  username: string;
}

function toLeaderboardUser(docSnap: any): LeaderboardUser {
  const data = docSnap.data() || {};
  return {
    uid: docSnap.id,
    displayName: String(data.displayName || "Anonymous"),
    photoURL: String(data.photoURL || ""),
    bElo: Number(data.bElo || 500),
    streak: Number(data.streak || 0),
    contestsPlayed: Number(data.contestsPlayed || 0),
    school: data.school ? String(data.school) : undefined,
    username: String(data.username || "user"),
  };
}

async function loadEloLeaderboard() {
  const snapshot = await adminFirestore
    .collection("users")
    .orderBy("bElo", "desc")
    .limit(100)
    .get();

  return snapshot.docs
    .map(toLeaderboardUser)
    .filter((user) => user.contestsPlayed >= 1)
    .slice(0, 50);
}

async function loadStreakLeaderboard() {
  const snapshot = await adminFirestore
    .collection("users")
    .orderBy("streak", "desc")
    .limit(100)
    .get();

  return snapshot.docs
    .map(toLeaderboardUser)
    .filter((user) => user.streak > 0)
    .slice(0, 50);
}

export const getEloLeaderboard = unstable_cache(
  loadEloLeaderboard,
  ["leaderboard-elo"],
  { revalidate: 1800 }
);

export const getStreakLeaderboard = unstable_cache(
  loadStreakLeaderboard,
  ["leaderboard-streak"],
  { revalidate: 1800 }
);
