import { Trophy } from "lucide-react";

export default function Loading() {
  return (
    <main className="min-h-screen bg-black text-white pt-24 px-4 pb-12">
      <div className="max-w-3xl mx-auto">
        
        {/* Header Skeleton */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 rounded-full mb-4 bg-zinc-900 ring-1 ring-zinc-800 animate-pulse">
            <Trophy className="w-8 h-8 text-zinc-700" />
          </div>
          <div className="h-10 w-64 bg-zinc-900 rounded-lg mx-auto mb-2 animate-pulse" />
          <div className="h-5 w-48 bg-zinc-900 rounded-lg mx-auto animate-pulse" />
        </div>

        {/* Tab Switcher Skeleton */}
        <div className="flex justify-center mb-8">
            <div className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-xl flex items-center gap-1 w-[220px] h-[46px] animate-pulse" />
        </div>

        {/* List Skeleton - Rows appear as empty placeholders */}
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="flex items-center p-3 sm:p-4 rounded-2xl border border-zinc-900 bg-zinc-950/50"
            >
              {/* Rank Icon */}
              <div className="flex-shrink-0 w-8 sm:w-12 flex justify-center">
                <div className="w-6 h-6 bg-zinc-900 rounded-full animate-pulse" />
              </div>

              {/* Avatar */}
              <div className="flex-shrink-0 mr-4 ml-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-zinc-900 animate-pulse" />
              </div>

              {/* Name & School */}
              <div className="flex-grow pr-4 space-y-2">
                <div className="h-5 w-32 bg-zinc-900 rounded animate-pulse" />
                <div className="h-3 w-24 bg-zinc-900 rounded animate-pulse" />
              </div>

              {/* Score Badge */}
              <div className="flex-shrink-0">
                <div className="h-9 w-16 bg-zinc-900 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}