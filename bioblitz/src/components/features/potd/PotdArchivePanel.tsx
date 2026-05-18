"use client";

import Link from "next/link";
import {
  History,
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
  Calendar,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { DailyPuzzle } from "@/lib/potd";
import { getTopicColors } from "@/lib/utils";

interface PotdArchivePanelProps {
  showArchive: boolean;
  onToggleArchive: () => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  statusFilter: "All" | "Completed" | "New";
  onStatusFilterChange: (value: "All" | "Completed" | "New") => void;
  topic: string;
  onTopicChange: (value: string) => void;
  topics: string[];
  filteredArchive: DailyPuzzle[];
  playedGameIds: Set<string>;
}

export default function PotdArchivePanel({
  showArchive,
  onToggleArchive,
  searchQuery,
  onSearchQueryChange,
  showFilters,
  onToggleFilters,
  statusFilter,
  onStatusFilterChange,
  topic,
  onTopicChange,
  topics,
  filteredArchive,
  playedGameIds,
}: PotdArchivePanelProps) {
  return (
    <section>
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={onToggleArchive}
          className="flex items-center gap-2 text-xl font-bold text-neutral-200 hover:text-white transition-colors"
        >
          <History className="w-5 h-5 text-neutral-500" />
          More Practice Problems
          {showArchive ? (
            <ChevronUp className="w-4 h-4 text-neutral-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-500" />
          )}
        </button>
      </div>

      {showArchive && (
        <div className="animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex flex-col gap-6 mb-8 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder="Search past questions..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-neutral-600"
                />
              </div>
              <button
                onClick={onToggleFilters}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  showFilters
                    ? "bg-neutral-800 text-white border-neutral-700"
                    : "bg-neutral-900 text-neutral-400 border-neutral-800"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-neutral-800">
                <div className="space-y-3">
                  <span className="text-xs font-bold text-neutral-500 uppercase">
                    Status
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(["All", "New", "Completed"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => onStatusFilterChange(opt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          statusFilter === opt
                            ? "bg-neutral-800 text-white border-neutral-600"
                            : "text-neutral-500 border-neutral-800 hover:text-white"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <span className="text-xs font-bold text-neutral-500 uppercase">
                    Topics
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((t) => (
                      <button
                        key={t}
                        onClick={() => onTopicChange(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          topic === t
                            ? "bg-orange-600/15 text-orange-300 border-orange-500/30"
                            : "text-neutral-500 border-neutral-800 hover:text-white"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArchive.length === 0 ? (
              <div className="col-span-full py-12 text-center text-neutral-500">
                No past problems found.
              </div>
            ) : (
              filteredArchive.map((p) => {
                const theme = getTopicColors(p.topic);
                const isPlayed = playedGameIds.has(p.id);

                return (
                  <Link key={p.id} href={`/potd/${p.id}`} className="block group">
                    <div
                      className={`relative h-full flex flex-col justify-between bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${theme.shadow}`}
                    >
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <span
                            className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide shadow-sm ${theme.bg}`}
                          >
                            {p.topic || "General"}
                          </span>
                          {isPlayed && (
                            <div className="flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Completed</span>
                            </div>
                          )}
                          {isPlayed && (
                            <div
                              title="Redo Problem"
                              className="absolute top-5 right-5 text-neutral-600 group-hover:text-neutral-400 transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <h2 className="text-lg font-bold text-white mb-2 line-clamp-2">
                          {p.title}
                        </h2>
                        <p className="text-sm text-neutral-500 line-clamp-2 mb-3">
                          {p.questionText}
                        </p>
                        <div className="flex items-center text-sm text-neutral-400 mt-auto">
                          <Calendar className="w-3 h-3 mr-2" />
                          <span className="truncate">
                            {new Date(p.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </section>
  );
}
