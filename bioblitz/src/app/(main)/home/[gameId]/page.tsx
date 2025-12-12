"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { allGames, gameRoom } from "@/lib/gameRoomsAll";
import { Sprout, Loader2, History, Trophy, AlertCircle, Calendar, Clock, Play } from "lucide-react"; 
import { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, firestore } from "@/lib/firebase"; 
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";

// Define shape for past attempts
interface GameSubmission {
  id: string;
  score: number;
  totalQuestions: number; 
  submittedAt: Timestamp;
  timeTaken: number;
  ranked?: boolean;
}

export default function GameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params?.gameId as string;

  const [user, setUser] = useState<User | null>(null);
  const [game, setGame] = useState<gameRoom | undefined>(undefined);
  const [otherGames, setOtherGames] = useState<gameRoom[]>([]);
  
  // Loading states
  const [loadingGame, setLoadingGame] = useState(true);
  const [loadingAttempts, setLoadingAttempts] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [previousAttempts, setPreviousAttempts] = useState<GameSubmission[]>([]);

  // 1. Listen for Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoadingAttempts(false); // Stop loading if no user
    });
    return () => unsubscribe();
  }, []);

  // 2. Load Game Data (Static / Config)
  useEffect(() => {
    const loadGameData = async () => {
      if (!gameId) return;

      setLoadingGame(true);
      const fetchedGames = await allGames();
      const currentGame = fetchedGames.find((g) => g.id === gameId);

      setGame(currentGame);
      setOtherGames(fetchedGames);
      setLoadingGame(false);
    };

    loadGameData();
  }, [gameId]);

  // 3. Load Previous Attempts (Firestore)
  useEffect(() => {
    const fetchAttempts = async () => {
      if (!user || !gameId) return;

      setLoadingAttempts(true);
      try {
        // NOTE: This query requires a Firestore Composite Index.
        // Check browser console if this fails; Firebase provides a link to create it.
        const q = query(
          collection(firestore, "gameSubmissions"),
          where("userId", "==", user.uid),
          where("gameId", "==", gameId),
          orderBy("submittedAt", "desc")
        );

        const snapshot = await getDocs(q);
        const attempts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as GameSubmission[];

        setPreviousAttempts(attempts);
      } catch (err) {
        console.error("Error fetching attempts (Check Console for Index Link):", err);
      } finally {
        setLoadingAttempts(false);
      }
    };

    fetchAttempts();
  }, [user, gameId]);

  // Logic: It is a "Ranked" attempt only if they have 0 previous submissions
  // We explicitly check !loadingAttempts to avoid false positives during load
  const isFirstAttempt = !loadingAttempts && previousAttempts.length === 0;

  const handleJoinGame = () => {
    if (loadingAttempts) return;
    // Pass 'ranked=true' if it's their first time, otherwise 'ranked=false'
    router.push(`/home/${gameId}/room?ranked=${isFirstAttempt}`);
  };

  if (loadingGame) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="flex flex-col items-center space-y-4 animate-in fade-in duration-500">
          <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
          <p className="text-zinc-500 font-medium tracking-wide animate-pulse">
            Loading Blitz Details...
          </p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p className="text-lg">Blitz not found</p>
      </div>
    );
  }

  const filteredOtherGames = otherGames
    .filter((g) => g.id !== gameId)
    .filter((g) => g.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const slideUp: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 80 },
    },
  };

  const formatTimePlayed = (seconds: number) => {
    if (!seconds) return "--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp.seconds * 1000).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
      {/* Scrollable Container */}
      <div className="flex flex-1 overflow-hidden pt-24 px-4 md:px-8 pb-4 gap-6 max-w-7xl mx-auto w-full">
        
        {/* LEFT COLUMN: Main Game Details */}
        <motion.main
          className="flex-[1.4] flex flex-col overflow-y-auto custom-scrollbar pr-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={slideUp}
            className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 shadow-2xl backdrop-blur-sm"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-2">
                  {game.title}
                </h1>
                <div className="flex gap-3 mt-3">
                  <span className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-bold uppercase tracking-wider">
                    {game.topic || "General"}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 text-xs font-bold uppercase tracking-wider">
                    {game.difficulty}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            {game.description && (
               <p className="text-zinc-400 text-lg leading-relaxed mb-8 max-w-3xl">
                 {game.description.replace(/^"(.*)"$/, "$1")}
               </p>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50 text-center">
                 <div className="text-zinc-500 text-xs uppercase font-bold mb-1">Questions</div>
                 <div className="text-2xl font-bold text-white">{game.number_of_questions}</div>
              </div>
              <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50 text-center">
                 <div className="text-zinc-500 text-xs uppercase font-bold mb-1">Time Limit</div>
                 <div className="text-2xl font-bold text-white">{Math.floor(parseInt(game.timeLimit) / 60)}m</div>
              </div>
              <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50 text-center">
                 <div className="text-zinc-500 text-xs uppercase font-bold mb-1">Attempts</div>
                 <div className="text-2xl font-bold text-white">
                    {loadingAttempts ? "-" : previousAttempts.length}
                 </div>
              </div>
            </div>

            {/* ACTION BUTTON */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleJoinGame}
                disabled={loadingAttempts}
                className={`w-full relative group overflow-hidden rounded-xl p-5 transition-all duration-300 transform active:scale-[0.98] ${
                  loadingAttempts 
                    ? "bg-zinc-800 cursor-wait opacity-70" 
                    : isFirstAttempt
                      ? "bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-900/20"
                      : "bg-white text-black hover:bg-zinc-200"
                }`}
              >
                <div className="relative z-10 flex items-center justify-center gap-3">
                  {loadingAttempts ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                      <span className="text-zinc-500 font-bold">Checking eligibility...</span>
                    </>
                  ) : isFirstAttempt ? (
                    <>
                      <Trophy className="w-6 h-6" />
                      <div className="flex flex-col items-start">
                        <span className="text-lg font-bold leading-none">Start Ranked Run</span>
                        <span className="text-xs font-medium opacity-80">Counts towards Elo</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Play className="w-6 h-6 fill-current" />
                      <div className="flex flex-col items-start">
                        <span className="text-lg font-bold leading-none">Practice Mode</span>
                        <span className="text-xs font-medium opacity-60">Replay for fun (No Elo)</span>
                      </div>
                    </>
                  )}
                </div>
              </button>

              {!loadingAttempts && !isFirstAttempt && (
                 <p className="text-center text-zinc-500 text-xs flex items-center justify-center gap-1.5 bg-zinc-900/50 py-2 rounded-lg border border-zinc-800/50">
                    <AlertCircle className="w-3 h-3" />
                    You have already played this Blitz. Score will not update Elo.
                 </p>
              )}
            </div>
          </motion.div>

          {/* HISTORY SECTION */}
          <motion.div variants={slideUp} className="mt-6 flex-1">
             <div className="flex items-center gap-2 mb-4 px-2">
                <History className="text-violet-500 w-5 h-5" />
                <h3 className="text-xl font-bold text-white">Your History</h3>
             </div>

             {loadingAttempts ? (
                <div className="flex justify-center py-10">
                   <Loader2 className="w-8 h-8 text-zinc-700 animate-spin" />
                </div>
             ) : previousAttempts.length === 0 ? (
                <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-2xl p-8 text-center">
                   <p className="text-zinc-500">No attempts yet. Be the first to play!</p>
                </div>
             ) : (
                <div className="space-y-3">
                   {previousAttempts.map((attempt) => (
                      <div 
                        key={attempt.id}
                        className={`group flex items-center justify-between p-4 rounded-xl border transition-all ${
                           attempt.ranked 
                             ? "bg-zinc-900 border-violet-500/20 hover:border-violet-500/40" 
                             : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                         <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                               attempt.ranked ? "bg-violet-900/30 text-violet-400" : "bg-zinc-800 text-zinc-400"
                            }`}>
                               {attempt.score}
                            </div>
                            <div>
                               <div className="flex items-center gap-2">
                                  <span className="text-white font-bold">{attempt.score} pts</span>
                                  {attempt.ranked && (
                                     <span className="text-[10px] bg-violet-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">Ranked</span>
                                  )}
                               </div>
                               <div className="text-zinc-500 text-xs flex gap-2 mt-1">
                                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {formatDate(attempt.submittedAt)}</span>
                               </div>
                            </div>
                         </div>
                         <div className="text-right">
                             <div className="text-zinc-400 text-sm font-mono flex items-center gap-1 justify-end">
                                <Clock className="w-3 h-3" /> {formatTimePlayed(attempt.timeTaken)}
                             </div>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </motion.div>
        </motion.main>

        {/* RIGHT COLUMN: Sidebar (Other Games) */}
        <motion.aside
          variants={slideUp}
          className="hidden lg:flex flex-[0.8] flex-col bg-zinc-900 border border-zinc-800 rounded-3xl p-6 overflow-hidden h-fit max-h-full sticky top-0"
        >
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Sprout className="text-green-500 w-5 h-5" />
            Similar Blitzes
          </h2>
          
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full mb-4 px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-all text-sm"
          />

          <div className="overflow-y-auto custom-scrollbar pr-1 flex-1 space-y-3">
            {filteredOtherGames.map((g) => (
              <Link
                key={g.id}
                href={`/home/${g.id}`}
                className="block p-3 rounded-xl bg-zinc-950/50 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 transition-all group"
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors line-clamp-1">
                    {g.title}
                  </h3>
                </div>
                <div className="flex gap-2 mt-2">
                   <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700">
                     {g.difficulty}
                   </span>
                   <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700">
                     {g.number_of_questions} Qs
                   </span>
                </div>
              </Link>
            ))}
            
            {filteredOtherGames.length === 0 && (
               <p className="text-zinc-600 text-center text-sm py-4">No other games found.</p>
            )}
          </div>
        </motion.aside>

      </div>
    </div>
  );
}