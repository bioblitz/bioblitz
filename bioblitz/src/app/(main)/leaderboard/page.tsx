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

export const revalidate = 60;

interface LeaderboardUser {
  uid: string;
  displayName: string;
  photoURL: string;
  bElo: number;
  school?: string;
  username: string;
}

async function getLeaderboardData() {
  const db = getFirestore(app);
  const usersRef = collection(db, "users");
  const q = query(usersRef, orderBy("bElo", "desc"), limit(50));

  const querySnapshot = await getDocs(q);
  const leaderboardData: LeaderboardUser[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (!data || typeof data.bElo !== "number" || !data.username) return;
    leaderboardData.push({
      uid: doc.id,
      displayName: data.displayName || "It's a mystery",
      photoURL: data.photoURL || "",
      bElo: data.bElo,
      school: data.school,
      username: data.username,
    });
  });

  return leaderboardData;
}

export default async function LeaderboardPage() {
  const users = await getLeaderboardData();

  return <LeaderboardClient initialUsers={users} />;
}
