import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";

interface SetPlayed {
  name: string;
  score: number;
  topic: string;
  setId: string;
}

interface RecentSetsCarouselProps {
  setsPlayed: SetPlayed[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScrollLeft: () => void;
  onScrollRight: () => void;
}

export default function RecentSetsCarousel({
  setsPlayed,
  scrollRef,
  onScrollLeft,
  onScrollRight,
}: RecentSetsCarouselProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-neutral-500" />
          Recent Sets
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onScrollLeft}
            className="p-2 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={onScrollRight}
            className="p-2 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {setsPlayed.length === 0 ? (
          <div className="w-full p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
            No recent activity recorded.
          </div>
        ) : (
          setsPlayed.map((set, i) => (
            <Link
              key={i}
              href={`/home/${set.setId}`}
              className="min-w-60 bg-zinc-900/50 border border-zinc-800/50 p-5 rounded-2xl hover:border-neutral-500/30 transition-all group block"
            >
              <div className="flex flex-col h-full justify-between gap-4">
                <span className="text-zinc-300 font-medium line-clamp-2 text-sm group-hover:text-white transition-colors">
                  {set.name.replace("Name: ", "")}
                </span>
                <div className="flex items-end justify-between border-t border-zinc-800 pt-3">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">
                    Score
                  </span>
                  <span className="text-xl font-bold text-neutral-400">{set.score}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </motion.div>
  );
}