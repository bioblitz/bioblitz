import LeaderboardClient from "./LeaderboardClient";
import { getEloLeaderboard, getStreakLeaderboard } from "@/lib/leaderboard";

export const revalidate = 60;

export default async function LeaderboardPage() {
  const [eloUsers, streakUsers] = await Promise.all([
    getEloLeaderboard(),
    getStreakLeaderboard()
  ]);

  return <LeaderboardClient initialEloUsers={eloUsers} initialStreakUsers={streakUsers} />;
}