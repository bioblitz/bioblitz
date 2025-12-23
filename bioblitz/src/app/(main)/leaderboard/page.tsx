import { getFirestore, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { app } from "@/lib/firebase"; // Ensure your firebase init is server-safe
import LeaderboardClient from "./LeaderboardClient"; // We'll make this next

export const revalidate = 60; // Cache the leaderboard for 60 seconds (Huge cost saver)

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
    if (typeof data.bElo === "number") {
      leaderboardData.push({
        uid: doc.id,
        displayName: data.displayName || "It's a mystery",
        photoURL: data.photoURL || "",
        bElo: data.bElo,
        school: data.school,
        username: data.username
      });
    }
  });

  return leaderboardData;
}

export default async function LeaderboardPage() {
  const users = await getLeaderboardData();

  return (
    // We pass the data to a Client Component to handle Auth highlighting
    <LeaderboardClient initialUsers={users} />
  );
}