"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { allGames, gameRoom } from "@/lib/gameRoomsAll";
import { Sprout } from "lucide-react";
import { useEffect, useState } from "react";

export default function GameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params?.gameId as string;

  const [game, setGame] = useState<gameRoom | undefined>(undefined);
  const [otherGames, setOtherGames] = useState<gameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const handleJoinGame = () => {
    router.push(`/home/${gameId}/room`);
  };

  useEffect(() => {
    const loadGameData = async () => {
      if (!gameId) return;

      setLoading(true);
      const fetchedGames = await allGames();
      const currentGame = fetchedGames.find((g) => g.id === gameId);

      setGame(currentGame);
      setOtherGames(fetchedGames);
      setLoading(false);
    };

    loadGameData();
  }, [gameId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p className="text-lg">Loading Game...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p className="text-lg">Game not found</p>
      </div>
    );
  }

  const filteredOtherGames = otherGames
    .filter((g) => g.id !== gameId)
    .filter((g) => g.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-14 bg-gray-900 text-white p-4"></nav>

        <main className="flex-1 p-6 overflow-y-auto flex gap-8">
          <div className="max-w-3xl bg-zinc-950 rounded-2xl p-8 shadow-md border border-gray-700">
            <h1 className="text-4xl font-bold text-white mb-4">
              <span className="text-white font-extrabold">{game.title}</span>
            </h1>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 bg-zinc-900 rounded-xl p-6">
                <p className="text-lg text-gray-300 mb-4">
                  <span className="font-bold text-white-400">
                    Question Source:
                  </span>{" "}
                  {game.source}
                </p>
                {game.topic && (
                  <p className="text-lg text-gray-300 mb-4">
                    <span className="font-bold text-white-400">Topic:</span>{" "}
                    {game.topic}
                  </p>
                )}
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
                    <span className="font-bold text-white-400">
                      Time Limit:
                    </span>{" "}
                    {game.timeLimit}
                  </p>
                </div>
              </div>
            </div>

            {game.description && (
              <p className="text-lg text-gray-300 mt-6">
                <span className="font-bold">Description:</span>{" "}
                {game.description}
              </p>
            )}

            <button
              onClick={handleJoinGame}
              className="
    w-full mt-6 bg-cyan-600 text-white text-lg font-semibold px-4 py-2.5 rounded-lg 
    shadow-md b  hover:bg-cyan-900 
    "
            >
              Join This Game Now!
            </button>

            <Link
              href="/home"
              className="inline-block mt-6 text-cyan-600 hover:underline font-semibold transition-colors duration-300"
            >
              ← Back to game list
            </Link>
          </div>

          <aside className="w-114 flex-shrink-0 overflow-y-auto bg-zinc-950 rounded-2xl p-4 shadow-md border border-gray-700  ml-auto">
            <h2 className="text-xl font-bold text-white mb-4">Other Games</h2>
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full mb-4 px-3 py-2 rounded-lg bg-zinc-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-600"
            />
            {filteredOtherGames.map((g) => (
              <Link
                key={g.id}
                href={`/home/${g.id}`}
                className="block p-4 mb-4 bg-zinc-900 rounded-lg hover:scale-105 hover:shadow-[0_0_4px_#22d3ee,0_0_10px_#22d3ee]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {g.title}
                    </h3>
                    <p className="text-gray-300 text-sm">
                      {g.topic} {g.difficulty} · {g.number_of_questions}{" "}
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
