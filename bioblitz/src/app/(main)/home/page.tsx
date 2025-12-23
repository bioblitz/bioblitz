"use client";

import Link from "next/link";
import { allGames, gameRoom } from "@/lib/gameRoomsAll";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Clock, HelpCircle, User, Star, Filter, Loader2, CheckCircle2, SlidersHorizontal, ChevronDown, ChevronUp, Search } from "lucide-react"; 
import { getAuth } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { app } from "@/lib/firebase";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [topic, setTopic] = useState("All Topics");
  
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"All" | "Completed" | "New">("All");
  const [typeFilter, setTypeFilter] = useState<"All" | "Official" | "Community">("All");

  const [games, setGames] = useState<gameRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playedGameIds, setPlayedGameIds] = useState<Set<string>>(new Set());
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = getAuth(app);
  const db = getFirestore(app);

  const topics = ["All Topics", "Animal", "Cell Bio", "Biochem", "Genetics", "Plants"];

  useEffect(() => {
    const loadData = async () => {
      try {
        const fetchedGames = await allGames();
        setGames(fetchedGames);

        const currentUser = auth.currentUser;
        if (currentUser) {
          const historyRef = collection(db, "users", currentUser.uid, "setsPlayed");
          const historySnap = await getDocs(historyRef);
          const ids = new Set<string>();
          historySnap.forEach(doc => ids.add(doc.id));
          setPlayedGameIds(ids);
        }

      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [auth, db]);

  const filteredGames = games.filter((game) => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = topic === "All Topics" || game.topic === topic;
    const isPlayed = playedGameIds.has(game.id);
    
    let matchesStatus = true;
    if (statusFilter === "Completed") matchesStatus = isPlayed;
    if (statusFilter === "New") matchesStatus = !isPlayed;

    const hasSource = (game as any).source;
    const hasCreator = game.creator;
    let matchesType = true;
    
    if (typeFilter === "Official") {
        matchesType = !!hasSource || !hasCreator;
    } else if (typeFilter === "Community") {
        matchesType = !!hasCreator && !hasSource;
    }

    return matchesSearch && matchesTopic && matchesStatus && matchesType;
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

  const activeFilterCount = (statusFilter !== "All" ? 1 : 0) + (typeFilter !== "All" ? 1 : 0) + (topic !== "All Topics" ? 1 : 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                Join a Blitz
              </h1>
              <p className="text-zinc-400 mt-1">Select a topic to start competing</p>
            </div>

            <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
               
               <div className="relative group flex-grow sm:flex-grow-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search titles..."
                    className="w-full sm:w-64 bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder:text-zinc-600"
                  />
               </div>

               <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`
                    flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all
                    ${showFilters || activeFilterCount > 0 
                       ? "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700" 
                       : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white"
                    }
                  `}
               >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                     <span className="bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem]">
                        {activeFilterCount}
                     </span>
                  )}
                  {showFilters ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
               </button>
            </div>
          </div>

          {showFilters && (
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  
                  <div className="md:col-span-5 space-y-6">
                    <div className="space-y-3">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3" /> Status
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {(["All", "New", "Completed"] as const).map((opt) => (
                              <button
                                key={opt}
                                onClick={() => setStatusFilter(opt)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                                  statusFilter === opt
                                  ? "bg-zinc-800 text-white border-zinc-600"
                                  : "bg-transparent text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700"
                                }`}
                              >
                                {opt}
                              </button>
                          ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                          <User className="w-3 h-3" /> Type
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {(["All", "Official", "Community"] as const).map((opt) => (
                              <button
                                key={opt}
                                onClick={() => setTypeFilter(opt)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                                  typeFilter === opt
                                  ? "bg-zinc-800 text-white border-zinc-600"
                                  : "bg-transparent text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700"
                                }`}
                              >
                                {opt}
                              </button>
                          ))}
                        </div>
                    </div>
                  </div>

                  <div className="md:col-span-7 border-t md:border-t-0 md:border-l border-zinc-800 pt-6 md:pt-0 md:pl-8">
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <Filter className="w-3 h-3" /> Topics
                        </span>
                        <div className="flex flex-wrap gap-2">
                            {topics.map((t) => (
                              <button
                                key={t}
                                onClick={() => setTopic(t)}
                                className={`
                                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border
                                  ${topic === t 
                                    ? "bg-violet-600/15 text-violet-300 border-violet-500/30" 
                                    : "bg-transparent text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white"
                                  }
                                `}
                              >
                                {t}
                              </button>
                            ))}
                        </div>
                      </div>
                  </div>

                </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredGames.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-zinc-900/50 rounded-2xl border border-white/5">
              <Filter className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 text-lg">No Blitzes found matching these filters.</p>
              <button 
                onClick={() => {
                   setSearchQuery("");
                   setTopic("All Topics");
                   setStatusFilter("All");
                   setTypeFilter("All");
                }}
                className="mt-4 text-violet-400 hover:text-violet-500 font-medium transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            filteredGames.map((game) => {
              const theme = getTopicColors(game.topic);
              const isPlayed = playedGameIds.has(game.id);

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
                        
                        {isPlayed && (
                          <div className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Completed</span>
                          </div>
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
                      {/* UPDATED: Styled Rating Badge using prop */}
                      {game.rating && game.rating > 0 && (
                        <div className="flex items-center text-yellow-400 font-medium bg-yellow-400/5 px-2 py-0.5 rounded-md border border-yellow-400/10">
                          <Star className="w-3.5 h-3.5 mr-1 fill-yellow-400" />
                          <span className="text-xs font-bold">{game.rating}</span>
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