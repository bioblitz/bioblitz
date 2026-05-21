import { motion } from "framer-motion";
import Link from "next/link";
import { Loader2, Calendar, Clock, ChevronRight } from "lucide-react";
import { GameSubmission } from "./types";
import { formatDate, formatTimePlayed } from "./utils";

interface ContestHistoryProps {
  loadingAttempts: boolean;
  previousAttempts: GameSubmission[];
  gameId: string;
}

const slideUp = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 80 },
  },
};

export default function ContestHistory({
  loadingAttempts,
  previousAttempts,
  gameId,
}: ContestHistoryProps) {
  return (
    <motion.div
      variants={slideUp}
      className="mt-6 flex-1 mb-0 md:mb-8 pl-0 md:pl-6 pt-6 border-t border-neutral-800/60 md:border-t-0 md:pt-0"
    >
      {" "}
      <div className="flex items-center gap-2 mb-4 px-2">
        <h3 className="text-xl font-bold text-white">Your History</h3>
      </div>
      {loadingAttempts ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 text-neutral-700 animate-spin" />
        </div>
      ) : previousAttempts.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-neutral-500 text-sm mt-1">
            You haven't played this Blitz yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {previousAttempts.map((attempt, index) => (
            <Link
              href={`/home/${gameId}/review/${attempt.id}`}
              key={attempt.id}
              className={`group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                attempt.ranked
                  ? "bg-neutral-900 border-neutral-500/20 hover:border-neutral-500/50 hover:bg-neutral-900/80"
                  : "bg-neutral-900 border-neutral-800 hover:border-neutral-600 hover:bg-neutral-800"
              }`}
            >
              <div className="flex items-center gap-4 z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    attempt.ranked
                      ? "bg-neutral-900/30 text-neutral-400"
                      : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {attempt.ranked
                    ? attempt.ratingDelta != null
                      ? attempt.ratingDelta >= 0
                        ? `+${attempt.ratingDelta}`
                        : attempt.ratingDelta
                      : "±0"
                    : `${attempt.correctCount}/${attempt.totalQuestions}`}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">
                      Attempt #{previousAttempts.length - index}
                    </span>
                    {attempt.ranked && (
                      <span className="text-[10px] bg-neutral-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">
                        Ranked
                      </span>
                    )}
                  </div>
                  <div className="text-neutral-500 text-xs flex gap-2 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{" "}
                      {formatDate(attempt.submittedAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 z-10">
                <div className="text-right">
                  <div className="text-neutral-400 text-sm font-mono flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />{" "}
                    {formatTimePlayed(attempt.timeTaken)}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-white transition-colors transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}
