import { User } from "firebase/auth";
import { ArrowUpRight } from "lucide-react";
import ChallengeButton from "@/components/features/challenges/ChallengeButton";
import { gameRoom } from "@/types/index";
import { formatCountdown } from "./utils";

interface ContestActionButtonsProps {
  game: gameRoom;
  user: User | null;
  authResolved: boolean;
  loadingAttempts: boolean;
  activeSession: { timeLeft: number } | null;
  isFirstAttempt: boolean;
  isOwner: boolean;
  proceedToGame: () => void;
  handleJoinGame: () => void;
}

export default function ContestActionButtons({
  game,
  user,
  authResolved,
  loadingAttempts,
  activeSession,
  isFirstAttempt,
  isOwner,
  proceedToGame,
  handleJoinGame,
}: ContestActionButtonsProps) {
  return (
    <div className="flex flex-col gap-3">
      {activeSession && (
        <button
          onClick={proceedToGame}
          className="w-full relative group overflow-hidden rounded-xl p-5 bg-amber-500/10 border border-amber-500/50 hover:bg-amber-500/20 transition-all duration-300 transform active:scale-[0.98] mb-1"
        >
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex flex-col items-start">
              <span className="text-lg font-bold text-amber-500 leading-none">
                Attempt in Progress
              </span>
              <span className="text-xs font-medium text-amber-200/70 mt-1">
                Click to Resume
              </span>
            </div>
            <div className="text-2xl font-mono font-bold text-amber-500 tabular-nums">
              {formatCountdown(activeSession.timeLeft)}
            </div>
          </div>
        </button>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleJoinGame}
          disabled={loadingAttempts || !authResolved || activeSession !== null}
          className={`w-full py-2.5 blurred-border relative group overflow-hidden rounded-xl p-5 transition-all duration-300 transform active:scale-[0.98] ${
            loadingAttempts
              ? "bg-zinc-500 cursor-wait opacity-70"
              : activeSession !== null
                ? "bg-zinc-500 opacity-50 cursor-not-allowed"
                : isFirstAttempt && !isOwner
                  ? "border-neutral-100 border hover:bg-neutral-800"
                  : "bg-white text-black hover:bg-zinc-200"
          }`}
        >
          <div className="relative z-10 flex items-center justify-center gap-3">
            {!authResolved ? (
              <span className="text-zinc-500 font-bold">
                Checking sign-in...
              </span>
            ) : !user ? (
              <span className="text-lg font-bold">Sign in to Play</span>
            ) : isOwner ? (
              <div className="flex flex-col items-start">
                <span className="text-lg font-bold leading-none text-black">
                  Your Blitz
                </span>
                <span className="text-xs font-medium opacity-60 text-black">
                  Playing won't affect your Elo
                </span>
              </div>
            ) : activeSession ? (
              <span className="text-zinc-500 font-bold">
                Finish your current attempt first
              </span>
            ) : isFirstAttempt ? (
              <div className="flex flex-col items-start">
                <span className="text-lg justify-center font-bold leading-none">
                  Start Now
                </span>
                <span className="text-xs justify-center font-medium opacity-80">
                  Counts towards Elo
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-start">
                <span className="text-lg font-bold leading-none">
                  Start Now
                </span>
                <span className="text-xs justify-center font-medium opacity-60">
                  Replay for fun (No Elo)
                </span>
              </div>
            )}
          </div>
        </button>
        {user && isFirstAttempt && !isOwner && (
          <ChallengeButton
            blitzId={game.id}
            blitzTitle={game.title}
            onPlay={handleJoinGame}
          />
        )}
      </div>
    </div>
  );
}
