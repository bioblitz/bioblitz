"use client";

import Link from "next/link";
import { allGames, gameRoom } from "@/lib/gameRoomsAll";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Clock, HelpCircle, User, Star, Filter, Loader2 } from "lucide-react"; 

export default function HomePage() {
  const [topic, setTopic] = useState("All Topics");
  const [games, setGames] = useState<gameRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const searchParams = useSearchParams();
  const router = useRouter();

  const topics = ["All Topics", "Animal", "Cell Bio", "Biochem", "Genetics", "Plants"];

  useEffect(() => {
    const loadGames = async () => {
      try {
        const fetchedGames = await allGames();
        setGames(fetchedGames);
      } catch (error) {
        console.error("Failed to load Blitzes:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadGames();
  }, []);

  const filteredGames = games.filter((game) => {
    return topic === "All Topics" || game.topic === topic;
  });

  const getTopicColors = (topic: string | undefined) => {
    switch (topic) {
      case "Animal":
        return { bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", shadow: "hover:shadow-blue-500/10 hover:border-blue-500/50", badge: "bg-blue-500 text-white" };
      case "Cell Bio":
        return { bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", shadow: "hover:shadow-cyan-500/10 hover:border-cyan-500/50", badge: "bg-cyan-500 text-white" };
      case "Biochem":
        return { bg: "bg-teal-500/10 text-teal-400 border-teal-500/20", shadow: "hover:shadow-teal-500/10 hover:border-teal-500/50", badge: "bg-teal-600 text-white" };
      case "Genetics":
        return { bg: "bg-lime-500/10 text-lime-400 border-lime-500/20", shadow: "hover:shadow-lime-500/10 hover:border-lime-500/50", badge: "bg-lime-600 text-white" };
      case "Plants":
        return { bg: "bg-green-500/10 text-green-400 border-green-500/20", shadow: "hover:shadow-green-500/10 hover:border-green-500/50", badge: "bg-green-600 text-white" };
      default:
        return { bg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", shadow: "hover:shadow-yellow-500/10 hover:border-yellow-500/50", badge: "bg-yellow-600 text-white" };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center pt-20">
        <div className="flex flex-col items-center space-y-4 animate-in fade-in duration-500">
          <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
          <p className="text-zinc-500 font-medium tracking-wide animate-pulse">
            Loading Blitzes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Join a Blitz
            </h1>
            <p className="text-zinc-400 mt-1">Select a topic to start competing</p>
          </div>

          {/* TOPIC SELECTOR UI */}
          <div className="w-full md:w-auto overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
             <div className="flex space-x-2">
                {topics.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    className={`
                      whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border
                      ${topic === t 
                        // NAV STYLE MATCH: Glassy Violet (15% opacity) + Bright Text + Subtle Glow
                        ? "bg-violet-600/15 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.15)] border-violet-500/10" 
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white hover:border-zinc-700"
                      }
                    `}
                  >
                    {t}
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredGames.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-zinc-900/50 rounded-2xl border border-white/5">
              <Filter className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 text-lg">No Blitzes found matching these filters.</p>
              <button 
                onClick={() => setTopic("All Topics")}
                className="mt-4 text-yellow-500 hover:text-yellow-400 font-medium transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            filteredGames.map((game) => {
              const theme = getTopicColors(game.topic);
              return (
                <Link key={game.id} href={`/home/${game.id}`} className="block group">
                  <div className={`relative h-full flex flex-col justify-between bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${theme.shadow}`}>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                         {game.topic && (
                          <span className={`${theme.badge} text-[10px] font-bold tracking-wide px-2 py-1 rounded-full shadow-sm`}>
                            {game.topic}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-white mb-2 line-clamp-2 leading-tight transition-colors">
                        {game.title}
                      </h2>
                      <div className="space-y-1">
                        {game.creator && (
                          <div className="flex items-center text-sm text-zinc-400">
                            <User className="w-3 h-3 mr-2" />
                            <span className="truncate">{game.creator}</span>
                          </div>
                        )}
                        {(game as any).source && (
                          <div className="flex items-center text-sm text-zinc-500">
                            <span className="text-xs border border-zinc-700 px-1.5 rounded">{(game as any).source}</span>
                          </div>
                        )}
                        {!game.creator && !(game as any).source && <div className="h-6"></div>}
                      </div>
                    </div>
                    <div className="px-5 py-4 bg-black/20 border-t border-white/5 flex justify-between items-center text-sm">
                      <div className="flex items-center gap-3">
                         <div className="flex items-center text-zinc-400" title="Questions">
                           <HelpCircle className="w-4 h-4 mr-1.5 opacity-70" />
                           <span className="font-semibold text-zinc-300">{game.number_of_questions}</span>
                         </div>
                         <div className="flex items-center text-zinc-400" title="Time Limit">
                           <Clock className="w-4 h-4 mr-1.5 opacity-70" />
                           <span className="font-semibold text-zinc-300">{game.timeLimit}</span>
                         </div>
                      </div>
                      {game.rating && (
                        <div className="flex items-center text-yellow-400 font-medium">
                          <Star className="w-4 h-4 mr-1 fill-yellow-400" />
                          <span>{game.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}