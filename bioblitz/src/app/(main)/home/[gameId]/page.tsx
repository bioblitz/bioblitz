"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { allGames, gameRoom } from "@/lib/gameRoomsAll";
import { Sprout } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";

import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

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
        <nav className="w-14 bg-gray-900 text-white p-4"></nav>

        <motion.main
          className="flex-1 p-6 overflow-y-auto flex gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={slideLeft}
            className="relative bg-zinc-950 rounded-2xl p-10 shadow-lg border border-gray-800 overflow-hidden"
          >
            <h1
              className={`${inter.className} text-4xl font-extrabold text-white mb-8 text-center tracking-tight`}
            >
              {game.title}
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-gray-300">
              <div className="flex flex-col items-center p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <p className="text-sm uppercase text-green-400 mb-1 tracking-wide">
                  Source
                </p>
                <p className="text-lg font-semibold">{game.source}</p>
              </div>

              {game.topic && (
                <div className="flex flex-col items-center p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <p className="text-sm uppercase text-green-400 mb-1 tracking-wide">
                    Topic
                  </p>
                  <p className="text-lg font-semibold">{game.topic}</p>
                </div>
              )}

              <div className="flex flex-col items-center p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <p className="text-sm uppercase text-green-400 mb-1 tracking-wide">
                  Difficulty
                </p>
                <p className="text-lg font-semibold">{game.difficulty}</p>
              </div>

              <motion.div
                animate={{ x: 100 }}
                transition={{ type: "spring", stiffness: 50 }}
                className="flex flex-col items-center p-4 rounded-xl bg-zinc-900/50 border border-zinc-800"
              >
                <p className="text-sm uppercase text-green-400 mb-1 tracking-wide">
                  Questions
                </p>
                <p className="text-lg font-semibold">
                  {game.number_of_questions}
                </p>
              </motion.div>

              <motion.div
                animate={{ x: 100 }}
                transition={{ type: "spring", stiffness: 50 }}
                className="flex flex-col items-center p-4 rounded-xl bg-zinc-900/50 border border-zinc-800"
              >
                <p className="text-sm uppercase text-green-400 mb-1 tracking-wide">
                  Time Limit
                </p>
                <p className="text-lg font-semibold">{game.timeLimit}</p>
              </motion.div>
            </div>

            <motion.button
              onClick={handleJoinGame}
              whileTap={{ scale: 0.95 }}
              className="w-full mt-8 bg-green-500/80 hover:bg-green-500/40 text-white text-lg font-semibold px-6 py-3 rounded-xl transition-all shadow-lg"
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
                  <Sprout className="w-5 h-5 text-green-400" />
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
            className="w-114 flex-shrink-0 overflow-y-auto bg-zinc-950 rounded-2xl p-4 shadow-md border border-gray-700 gap-14"
            style={{ marginLeft: "1rem" }}
          >
            <h2 className="text-xl font-bold text-white mb-4">Other Games</h2>
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full mb-4 px-3 py-2 rounded-lg bg-zinc-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
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
                  className="block p-4 mb-4 bg-zinc-900 rounded-lg hover:bg-zinc-800 hover:scale-105 transition-transform transition-colors"
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
              </motion.div>
            ))}
          </motion.aside>
        </motion.main>
      </div>
    </div>
  );
}
