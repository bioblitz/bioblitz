"use client";

import { useParams } from "next/navigation";

export default function GameDetailPage() {
  const params = useParams();
  const gameTitle = params?.gameTitle as string;
  const gameId = params?.gameId as string;

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      <nav className="h-12 bg-gray-900 text-white flex items-center justify-center px-6 shadow">
        Navbar goes here:
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-14 bg-gray-900 text-white p-4"></nav>

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-3xl bg-zinc-900 rounded-2xl p-8 shadow-md">
            <h1 className="text-3xl font-bold text-white mb-4">
              <span className="text-white font-extrabold">{gameTitle}</span>
            </h1>

            <button className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition hover:scale-[1.03] shadow-sm">
              Join This Game
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
