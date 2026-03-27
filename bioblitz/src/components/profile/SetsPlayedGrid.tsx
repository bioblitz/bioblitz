"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import { motion } from "framer-motion";

interface SetPlayed {
  name: string;
  correctCount?: number;
  totalQuestions?: number;
  timeTaken?: number;
  topic: string;
  setId: string;
  delta?: number;
}

const PAGE_SIZE = 50;

function boxClass(delta?: number) {
  if (delta == null) return "bg-zinc-800 border-zinc-700 hover:bg-zinc-700";
  if (delta > 0) return "bg-emerald-500/25 border-emerald-500/40 hover:bg-emerald-500/35";
  if (delta < 0) return "bg-red-500/25 border-red-500/40 hover:bg-red-500/35";
  return "bg-zinc-800 border-zinc-700 hover:bg-zinc-700";
}

function deltaLabel(delta?: number) {
  if (delta == null) return null;
  if (delta > 0) return <span className="text-emerald-400 font-semibold">+{delta}</span>;
  if (delta < 0) return <span className="text-red-400 font-semibold">{delta}</span>;
  return <span className="text-zinc-500">±0</span>;
}

export default function SetsPlayedGrid({ setsPlayed }: { setsPlayed: SetPlayed[] }) {
  const [page, setPage] = useState(1);
  const visible = setsPlayed.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < setsPlayed.length;

  return (
    <motion.div
      initial={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          Blitzes Completed
        </h2>
        <span className="text-sm text-zinc-500">{setsPlayed.length} total</span>
      </div>

      {setsPlayed.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
          No blitzes completed yet.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {visible.map((set, i) => (
              <Link
                key={i}
                href={`/home/${set.setId}`}
                className={`relative group w-8 h-8 rounded-lg border transition-colors ${boxClass(set.delta)}`}
              >
                {/* Hover tooltip */}
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover:block w-max max-w-[200px]">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 shadow-xl">
                    <p className="text-white text-xs font-medium line-clamp-2 leading-snug mb-1">
                      {set.name}
                    </p>
                    <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                      {set.correctCount != null && set.totalQuestions != null && (
                        <span>{set.correctCount}/{set.totalQuestions} correct</span>
                      )}
                      {deltaLabel(set.delta)}
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="w-2 h-2 bg-zinc-950 border-r border-b border-zinc-800 rotate-45 mx-auto -mt-1" />
                </div>
              </Link>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="mt-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Load more ({setsPlayed.length - visible.length} remaining)
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}
