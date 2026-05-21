import { motion } from "framer-motion";
import Link from "next/link";
import { User } from "firebase/auth";
import { MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react";
import { gameRoom } from "@/types/index";
import DefaultAvatar from "@/components/ui/DefaultAvatar";
import GameRating from "@/components/features/reviews/GameRating";
import { getTopicColors, getTopicShortLabel } from "@/lib/utils";
import { getRatingTier } from "@/lib/rating";

interface ContestInfoProps {
  game: gameRoom;
  user: User | null;
  isAdmin: boolean;
  isStaff: boolean;
  hasPlayed: boolean;
  deleting: boolean;
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  handleDeleteContest: () => void;
  router: any;
}

import type { Variants } from "framer-motion";

const slideUp: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 80 },
  },
};

export default function ContestInfo({
  game,
  user,
  isAdmin,
  isStaff,
  hasPlayed,
  deleting,
  showMenu,
  setShowMenu,
  menuRef,
  handleDeleteContest,
  router,
}: ContestInfoProps) {
  const isOwner = user && game ? game.creator === user.uid : false;
  const timeLimitMinutes = Math.max(
    1,
    parseInt(String(game.timeLimit || "0"), 10) || 0,
  );

  return (
    <motion.div variants={slideUp} className="rounded-3xl p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
            {game.title}
          </h1>
          {(isAdmin || isStaff || game.creator === user?.uid) && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800 transition-all"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showMenu && (
                <div className="absolute left-0 top-full mt-1 w-44 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      router.push(`/contests/create/${game.id}`);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-neutral-200 hover:bg-neutral-800 transition-colors text-left"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Blitz
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleDeleteContest();
                    }}
                    disabled={deleting}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete Blitz
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-6 mt-3 text-md text-neutral-400">
          <div className="flex items-center gap-2">
            <span>Hosted by: </span>
            {game.creatorUsername ? (
              <Link
                href={`/profile/${game.creatorUsername}`}
                className="flex items-center gap-2 text-neutral-200 hover:underline transition-colors"
              >
                {game.creatorPfp ? (
                  <img
                    src={game.creatorPfp}
                    alt={game.creatorUsername}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-neutral-500"
                  />
                ) : (
                  <div className="w-6 h-6 flex-shrink-0">
                    <DefaultAvatar name={game.creatorUsername || ""} />
                  </div>
                )}
                <span>{game.creatorUsername}</span>
              </Link>
            ) : (
              <span className="text-neutral-200">Unknown</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <span
            className={`${getTopicColors(game.topic).badge} text-white text-[11px] font-bold tracking-wide px-3 py-1.5 rounded-full`}
          >
            {getTopicShortLabel(game.topic || "General")}
          </span>

          <GameRating
            gameId={game.id}
            hasPlayed={hasPlayed}
            averageRating={game.rating}
            ratingCount={game.ratingCount}
          />
          <div className="text-neutral-300 rounded-full border border-neutral-700 py-0.5 px-2 text-sm">
            {" "}
            Rating:{" "}
            <span
              className={`text-sm font-bold ${
                game.contestRating
                  ? getRatingTier(game?.contestRating).textClass
                  : "text-neutral-300"
              }`}
            >
              {" "}
              {game.contestRating?.toFixed(0)}{" "}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div>
          <div className="text-xl font-bold text-white">
            {game.number_of_questions}
          </div>
          <div className="text-[11px] font-bold tracking-wide text-neutral-500">
            Questions
          </div>
        </div>
        <div>
          <div className="text-xl font-bold text-white flex items-center gap-2">
            {timeLimitMinutes}
          </div>
          <div className="text-[11px] font-bold tracking-wide text-neutral-500">
            Minutes
          </div>
        </div>
      </div>
    </motion.div>
  );
}
