import { Users } from "lucide-react";
import { gameRoom } from "@/types/index";
import { LeaderboardEntry } from "./types";

interface RegistrantsAvatarsProps {
  game: gameRoom;
  loadingLeaderboard: boolean;
  registrantAvatars: LeaderboardEntry[];
}

export default function RegistrantsAvatars({
  game,
  loadingLeaderboard,
  registrantAvatars,
}: RegistrantsAvatarsProps) {
  const registrantAvatarSkeletons = Array.from({ length: 3 });

  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="text-sm text-neutral-300 flex items-center gap-2">
        <Users className="w-4 h-4" />
        {game.firstAttemptCount ?? 0} registrant
        {(game.firstAttemptCount ?? 0) === 1 ? "" : "s"}
      </div>
      <div className="flex items-center -space-x-2">
        {loadingLeaderboard
          ? registrantAvatarSkeletons.map((_, index) => (
              <div
                key={`loading-${index}`}
                className="w-7 h-7 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-500"
              />
            ))
          : registrantAvatars.map((entry) => (
              <div
                key={entry.userId}
                className="w-7 h-7 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-500"
              >
                {entry.photoURL ? (
                  <img
                    src={entry.photoURL}
                    alt={entry.username}
                    className="w-full h-full rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  entry.username?.[0]?.toUpperCase()
                )}
              </div>
            ))}
        {[0, 1].map((index) => (
          <div
            key={`unknown-${index}`}
            className="w-7 h-7 rounded-full border border-dashed border-zinc-700 bg-zinc-900/60 flex items-center justify-center text-[10px] font-bold text-zinc-500"
          >
            ?
          </div>
        ))}
      </div>
    </div>
  );
}
