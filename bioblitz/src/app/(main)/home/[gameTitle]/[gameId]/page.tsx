"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { allGames, gameRoom } from "@/lib/gameRoomsAll";
import { Sprout } from "lucide-react";

export default function GameDetailPage() {
  const params = useParams();
  const gameTitle = params?.gameTitle as string;
  const gameId = params?.gameId as string;

  const game: gameRoom | undefined = allGames.find((g) => g.id === gameId);

  if (!game) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p className="text-lg">Game not found</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-screen bg-black text-white">
      <nav className="h-12 bg-gray-900 text-white flex items-center justify-center px-6 shadow">
        Navbar goes here:
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-14 bg-gray-900 text-white p-4"></nav>

        <main className="flex-1 p-6 overflow-y-auto flex gap-6">
          <div className="max-w-3xl bg-zinc-950 rounded-2xl p-8 shadow-md border border-gray-700">
            <h1 className="text-4xl font-bold text-white mb-4">
              <span className="text-white font-extrabold">{gameTitle}</span>
            </h1>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 bg-zinc-900 rounded-xl p-6">
                <p className="text-lg text-gray-300 mb-4">
                  <span className="font-bold text-white-400">
                    Question Source:
                  </span>{" "}
                  {game.source}
                </p>
                <p className="text-lg text-gray-300 mb-4">
                  <span className="font-bold text-white-400">Topic:</span>{" "}
                  {game.topic}
                </p>
                <p className="text-lg text-gray-300 mb-4">
                  <span className="font-bold text-white-400">Difficulty:</span>{" "}
                  {game.difficulty}
                </p>
              </div>

              <div className="flex-1 bg-zinc-900 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <p className="text-lg text-gray-300 mb-4">
                    <span className="font-bold text-white-400">
                      Number of Questions:
                    </span>{" "}
                    {game.number_of_questions}
                  </p>

                  <p className="text-lg text-gray-300 mb-4">
                    <span className="font-bold text-white-400">Time:</span>{" "}
                    {game.total_time}
                  </p>

                  <p className="text-lg text-gray-300 mb-4">
                    <span className="font-bold text-white-400">
                      Time per Question:
                    </span>{" "}
                    {game.time_per_question}
                  </p>
                </div>
              </div>
            </div>
            <button
              className="
    w-full mt-6 bg-sky-500 text-white text-lg font-semibold px-4 py-2.5 rounded-lg 
    shadow-md b transform hover:scale-105 hover:bg-sky-500 
    hover:shadow-[0_0_8px_2px_rgba(14,165,233,0.7)]"
            >
              Join This Game Now!
            </button>

            <Link
              href="/home"
              className="inline-block mt-6 text-sky-400 hover:text-sky-600 hover:underline font-semibold transition-colors duration-300"
            >
              ← Back to game list
            </Link>
          </div>

          <aside className="w-114 flex-shrink-0 overflow-y-auto bg-zinc-950 rounded-2xl p-4 shadow-md border border-gray-700  ml-auto">
            {" "}
            <h2 className="text-xl font-bold text-white mb-4">Other Games</h2>
            {allGames
              .filter((g) => g.id !== gameId)

              .map((g) => (
                <Link
                  key={g.id}
                  href={`/home/${g.title}/${g.id}`}
                  className="block p-4 mb-4 bg-zinc-900 rounded-lg hover:bg-blue-800 hover:shadow-[0_0_8px_rgba(59,130,246,0.7)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {g.title}
                      </h3>
                      <p className="text-gray-300 text-sm">
                        {g.topic} · {g.difficulty} · {g.number_of_questions}{" "}
                        questions
                      </p>
                    </div>
                    <Sprout size={40} color="#1dad5cff " />
                  </div>
                </Link>
              ))}
          </aside>
        </main>
      </div>
    </div>
  );
}
