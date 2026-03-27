"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Trophy, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { getRatingTier } from "@/lib/rating";

interface SetPlayed {
  name: string;
  correctCount?: number;
  totalQuestions?: number;
  timeTaken?: number;
  topic: string;
  setId: string;
  delta?: number;
  contestRating?: number;
  rank?: number | string | null;
}

function deltaLabel(delta?: number) {
  if (delta == null) return <span className="text-zinc-600">—</span>;
  if (delta > 0) return <span className="text-emerald-400 font-bold">+{delta}</span>;
  if (delta < 0) return <span className="text-red-400 font-bold">{delta}</span>;
  return <span className="text-zinc-500 font-bold">±0</span>;
}

function formatRank(rank?: number | string | null) {
  if (rank == null) return <span className="text-zinc-600">—</span>;
  const r = String(rank);
  if (r === "1") return <span className="text-yellow-500 font-bold">#1 🥇</span>;
  if (r === "2") return <span className="text-zinc-400 font-bold">#2 🥈</span>;
  if (r === "3") return <span className="text-orange-400 font-bold">#3 🥉</span>;
  return <span className="text-zinc-400 font-bold">#{rank}</span>;
}

export default function SetsPlayedGrid({ setsPlayed }: { setsPlayed: SetPlayed[] }) {
  const [displayLimit, setDisplayLimit] = useState(5);
  const visible = setsPlayed.slice(0, displayLimit);
  const hasMore = displayLimit < setsPlayed.length;

  return (
    <motion.div
      initial={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          Blitzes Completed
        </h2>
      
      </div>

      {setsPlayed.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl text-zinc-600">
          <p className="text-sm font-medium">No blitzes completed yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-bold text-zinc-500 tracking-widest border-b border-neutral-900">
            <div className="col-span-6">Blitz Name</div>
            <div className="col-span-2 text-center">Contest Rating</div>
            <div className="col-span-2 text-center">+/-</div>
            <div className="col-span-2 text-center">Rank</div>
          </div>
          
          <div className="space-y-1">
            {visible.map((set, i) => {
              const elo = Math.round(set.contestRating || 0);
              const tier = getRatingTier(elo);
              
              return (
                <Link
                  key={i}
                  href={`/home/${set.setId}`}
                  className="grid grid-cols-12 gap-4 items-center p-4 bg-zinc-900/40 border border-transparent hover:border-zinc-700 hover:bg-neutral-800/60 rounded-2xl transition-all group"
                >
                  <div className="col-span-6 min-w-0">
                    <p className="text-sm font-bold text-white truncate transition-colors">
                      {set.name}
                    </p>
                    <p className="text-[10px] text-neutral-500 font-bold tracking-tight mt-0.5">
                      {set.topic}
                    </p>
                  </div>
                  
                  <div className="col-span-2 flex flex-col items-center">
                    <span className={`text-sm font-bold ${elo > 0 ? tier.textClass : "text-zinc-600"}`}>
                      {elo > 0 ? elo : "Unrated"}
                    </span>
                  </div>

                  <div className="col-span-2 text-center">
                    <div className="text-sm">
                      {deltaLabel(set.delta)}
                    </div>
                  </div>

                  <div className="col-span-2 text-center">
                    <div className="text-sm">
                      {formatRank(set.rank)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {hasMore && (
            <div className="pt-4 text-center">
              <button
                onClick={() => setDisplayLimit((prev) => prev + 5)}
                className="text-sm font-bold text-neutral-500 hover:text-white hover:underline transition-all"
              >
                View more
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
