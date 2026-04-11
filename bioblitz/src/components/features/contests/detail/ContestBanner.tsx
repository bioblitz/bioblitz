import { motion } from "framer-motion";
import { gameRoom } from "@/types/index";

interface ContestBannerProps {
  game: gameRoom;
}

const slideUp = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 80 },
  },
};

export default function ContestBanner({ game }: ContestBannerProps) {
  return (
    <motion.div
      variants={slideUp}
      className="w-full pt-24 pr-4 pl-2 md:pr-8 md:pl-4 max-w-7xl mx-auto"
    >
      <div className="mb-6">
        <div className="relative h-48 md:h-56 rounded overflow-hidden">
          {game.bannerUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${game.bannerUrl})` }}
            />
          ) : game.creatorPfp ? (
            <>
              <img
                src={game.creatorPfp}
                className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
                alt=""
                aria-hidden

              />
              <div className="absolute inset-0 bg-neutral-900/60" />
              <div className="relative h-full flex items-center justify-center">
                <img
                  src={game.creatorPfp}
                  alt="Creator"
                  className="w-20 h-20 rounded-full object-cover border-2 border-zinc-700"

                />
              </div>
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
