import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";

interface SetPlayed {
  name: string;
  score: number;
  topic: string;
  setId: string;
  playedAt: number;
}

interface RecentSetsProps {
  setsPlayed: SetPlayed[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export default function RecentSets({ setsPlayed, scrollRef }: RecentSetsProps) {
  if (setsPlayed.length === 0) {
    return (
      <div className="bg-zinc-950 border border-zinc-800/50 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Recent Sets</h3>
        <div className="h-32 flex items-center justify-center text-zinc-600">
          <p>No blitzes completed yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800/50 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">Recent Sets</h3>
        <BookOpen className="w-5 h-5 text-neutral-500" />
      </div>
      <div ref={scrollRef} className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {setsPlayed.slice(0, 10).map((set, i) => (
          <Link
            key={i}
            href={`/home/${set.setId}`}
            className="flex items-center justify-between p-3 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{set.name}</p>
              <p className="text-xs text-zinc-500">{set.topic}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-bold ${
                  set.score >= 80
                    ? "text-green-400"
                    : set.score >= 60
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {set.score}%
              </span>
              <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-neutral-400 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
