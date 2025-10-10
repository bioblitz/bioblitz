"use client";
import Link from "next/link";
import { allGames, gameRoom } from "@/lib/gameRoomsAll";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import TopicFilter from "@/components/features/home/TopicFilter";

export default function HomePage() {
  const [topic, setTopic] = useState("All Topics");

  const [games, setGames] = useState<gameRoom[]>([]);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const loadGames = async () => {
      const fetchedGames = await allGames();
      setGames(fetchedGames);
    };
    loadGames();
  }, []);

  const filteredGames = games.filter((game) => {
    return (
      (topic === "All Topics" || game.topic === topic)
    );
  });

  return (
    <>
      <div className="flex flex-col h-screen">
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 p-6 overflow-y-auto bg-black/100 text-white">
            <h1 className="text-3xl font-bold mb-3">Join a Game!</h1>

            <div className="p-4 rounded-lg mb-6">
              <div className="flex flex-wrap gap-6">
                <div className="flex flex-col">
                  <TopicFilter setTopic={setTopic} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGames.length === 0 ? (
                <p className="text-white">
                  No games found matching the filters.
                </p>
              ) : (
                filteredGames.map((game) => (
                  <Link key={game.id} href={`/home/${game.id}`}>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-90 shadow-lg hover:scale-[1.04] transition-transform">
                      {game.creatorPfp && (
                        <img
                          src={game.creatorPfp}
                          alt={`${game.creator}'s profile picture`}
                          className="w-full h-32 object-cover rounded-t-2xl"
                        />
                      )}
                      <div className="p-6">
                        <h2 className="text-2xl font-semibold mb-2">
                          {game.title}
                        </h2>
                        {game.creator && (
                          <p className="text-sm mb-1">
                            <span className="font-bold">Creator:</span>{" "}
                            {game.creator}
                          </p>
                        )}
                        {game.rating && (
                          <p className="text-sm mb-1">
                            <span className="font-bold">Rating:</span>{" "}
                            {game.rating}
                          </p>
                        )}
                        <p className="text-sm mb-1">
                          <span className="font-bold mb-2">
                            Number of Questions:
                          </span>{" "}
                          {game.number_of_questions}
                        </p>
                        {game.topic && (
                          <p className="text-sm mb-1">
                            <span className="font-bold mb-2">Topic:</span>{" "}
                            {game.topic}
                          </p>
                        )}

                        <p className="text-sm mb-1">
                          <span className="font-bold">Time Limit:</span>{" "}
                          {game.timeLimit}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
