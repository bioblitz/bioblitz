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

  const getTopicColors = (topic: string | undefined) => {
    switch (topic) {
      case "Animal":
        return {
          bg: "bg-blue-600 text-white",
          shadow: "hover:shadow-blue-500/30",
        };
      case "Cell Bio":
        return {
          bg: "bg-cyan-500 text-white",
          shadow: "hover:shadow-cyan-500/30",
        };
      case "Biochem":
        return {
          bg: "bg-teal-600 text-white",
          shadow: "hover:shadow-teal-500/30",
        };
      case "Genetics":
        return {
          bg: "bg-lime-600 text-white",
          shadow: "hover:shadow-lime-500/30",
        };
      case "Plants":
        return {
          bg: "bg-green-600 text-white",
          shadow: "hover:shadow-green-500/30",
        };
      default:
        return {
          bg: "bg-indigo-600 text-white",
          shadow: "hover:shadow-indigo-500/30",
        };
    }
  };

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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredGames.length === 0 ? (
                <p className="text-white">
                  No games found matching the filters.
                </p>
              ) : (
                filteredGames.map((game) => {
                  const topicColors = getTopicColors(game.topic);
                  return (
                    <Link key={game.id} href={`/home/${game.id}`} className="block">
                      <div className={`relative bg-gray-800 border border-gray-700 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl ${topicColors.shadow} hover:scale-[1.03] overflow-hidden`}>
                        {game.topic && (
                          <span className={`absolute top-4 right-4 ${topicColors.bg} text-xs font-semibold px-3 py-1 rounded-full shadow-md`}>
                            {game.topic}
                          </span>
                        )}

                        <div className="p-5">
                          <h2 className="text-xl font-bold mb-2 text-white truncate" title={game.title}>
                            {game.title}
                          </h2>
                          
                          {game.creator && (
                            <div className={`flex items-center space-x-2 text-sm text-gray-400 ${ (game as any).source ? 'mb-2' : 'mb-4' }`}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                              <span>{game.creator}</span>
                            </div>
                          )}

                          {(game as any).source && (
                            <div className="flex items-center space-x-2 text-sm text-gray-400 mb-4">
                          
                              <span>{(game as any).source}</span>
                            </div>
                          )}
                          
                          {!game.creator && !(game as any).source && (
                              <div className="mb-4"></div>
                          )}

                          <div className="flex justify-between items-center text-sm text-gray-300 pt-3 border-t border-gray-700/50">
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-base">{game.number_of_questions}</span>
                              <span className="text-gray-400 text-xs">Questions</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-base">{game.timeLimit}</span>
                              <span className="text-gray-400 text-xs">Time Limit</span>
                            </div>
                            {game.rating && (
                              <div className="flex flex-col items-center">
                                <span className="font-semibold text-base flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  {game.rating}
                                </span>
                                <span className="text-gray-400 text-xs">Rating</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}


