"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { allGames, gameRoom } from "@/lib/gameRoomsAll";
import { Sprout, Loader2 } from "lucide-react"; // Added Loader2
import { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";

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

  // NEW: Animated Loading Screen (Matches Home Page style)
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="flex flex-col items-center space-y-4 animate-in fade-in duration-500">
          {/* Using Amber here to match the global loading theme, 
              or change text-amber-500 to text-indigo-500 if you want it to match this page's buttons */}
          <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
          <p className="text-zinc-500 font-medium tracking-wide animate-pulse">
            Loading Game Details...
          </p>
        </div>
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.25, delayChildren: 0.2 },
    },
  };

  const slideLeft: Variants = {
    hidden: { x: -80, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { type: "spring" as any, stiffness: 60 },
    },
  };

  const slideRight: Variants = {
    hidden: { x: 80, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { type: "spring" as any, stiffness: 100 },
    },
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      <div className="flex flex-1 overflow-hidden">
        <motion.main
          // Kept pt-24 to ensure it sits below the navbar
          className="flex-1 px-4 py-6 pt-24 overflow-y-auto flex justify-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={slideLeft}
            className="relative flex-[1.2] ml-14 bg-gray-900/70 rounded-2xl p-10 shadow-lg border border-gray-800 overflow-hidden"
          >
            <h1
              className={`text-4xl font-extrabold text-white mb-8 text-center tracking-tight`}
            >
              {game.title}
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-gray-300">
              <div className="flex flex-col items-center p-4 rounded-xl bg-gray-700/40 border border-gray-700">
                <p className="text-sm uppercase text-white mb-1 tracking-wide">
                  Source
                </p>
                <p className="text-lg font-semibold">{game.source}</p>
              </div>

              {game.topic && (
                <div className="flex flex-col items-center p-4 rounded-xl bg-gray-700/40 border border-gray-700">
                  <p className="text-sm uppercase text-white mb-1 tracking-wide">
                    Topic
                  </p>
                  <p className="text-lg font-semibold">{game.topic}</p>
                </div>
              )}

              <div className="flex flex-col items-center p-4 rounded-xl bg-gray-700/40 border border-gray-700">
                <p className="text-sm uppercase text-white  mb-1 tracking-wide">
                  Difficulty
                </p>
                <p className="text-lg font-semibold">{game.difficulty}</p>
              </div>

              <motion.div
                animate={{ x: 100 }}
                transition={{ type: "spring", stiffness: 50 }}
                className="flex flex-col items-center p-4 rounded-xl bg-gray-700/40 border border-gray-700"
              >
                <p className="text-sm uppercase text-white  mb-1 tracking-wide">
                  Questions
                </p>
                <p className="text-lg font-semibold">
                  {game.number_of_questions}
                </p>
              </motion.div>

              <motion.div
                animate={{ x: 100 }}
                transition={{ type: "spring", stiffness: 50 }}
                className="flex flex-col items-center p-4 rounded-xl bg-gray-700/40 border border-gray-700"
              >
                <p className="text-sm uppercase text-white  mb-1 tracking-wide">
                  Time Limit
                </p>
                <p className="text-lg font-semibold">{game.timeLimit}</p>
              </motion.div>
            </div>

            <motion.button
              onClick={handleJoinGame}
              whileTap={{ scale: 0.95 }}
              className="w-full mt-8 bg-indigo-500 hover:bg-[#5271FF]/60 text-white text-lg font-semibold px-6 py-3 rounded-xl transition-all shadow-lg"
            >
              Join This Game Now!
            </motion.button>

            {game.description && (
              <div className="mt-8 text-left max-w-2xl">
                <h2 className="text-2xl font-bold text-white mb-2">
                  About This Game
                </h2>
                <p className="text-white/70 leading-relaxed flex items-center gap-1">
                  {game.description.replace(/^"(.*)"$/, "$1")}
                </p>
              </div>
            )}
            <Link
              href="/home"
              className="block mt-4 text-sm text-gray-500 hover:text-gray-400 transition-colors font-medium text-left"
            >
              ← Back to game list
            </Link>
          </motion.div>

          <motion.aside
            variants={slideRight}
            className="flex-[0.9] overflow-y-auto bg-gray-900/70 rounded-2xl p-4 shadow-md border border-gray-800 ml-10"
          >
            <h2 className="text-xl font-bold text-white mb-4">Other Games</h2>
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full mb-4 px-3 py-2 rounded-lg bg-gray-700/40  text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5271FF]"
            />
            {filteredOtherGames.map((g) => (
              <motion.div
                key={g.id}
                whileHover={{ scale: 1.0 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Link
                  key={g.id}
                  href={`/home/${g.id}`}
                  className="block p-4 mb-4 bg-gray-800/30  border-gray-700 rounded-lg hover:bg-gray-700 hover:scale-105 transition-colors"
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
                    <Sprout size={40} color="#5271FF" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.aside>
        </motion.main>
      </div>
    </div>
  );
}