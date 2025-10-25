"use client";
import Link from "next/link";
import { allGames, gameRoom } from "@/lib/gameRoomsAll";
import { useEffect, useState } from "react";
import CurtainReveal from "../auth/curtain";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default function HomePage() {
  const [questionSource, setQuestionSource] = useState("All Sources");
  const [topic, setTopic] = useState("All Topics");
  const [difficulty, setDifficulty] = useState("All Difficulties");
  const [timeLimit, setTimeLimit] = useState("All");
  const [games, setGames] = useState<gameRoom[]>([]);

  const searchParams = useSearchParams();
  const justLoggedIn = searchParams.get("justLoggedIn") === "true";
  const router = useRouter();
  const [showCurtain, setShowCurtain] = useState(justLoggedIn);
  const [startCurtainAnimation, setStartCurtainAnimation] = useState(false);

  useEffect(() => {
    if (justLoggedIn) {
      setShowCurtain(true);
      setStartCurtainAnimation(true);

      const timer = setTimeout(() => {
        setShowCurtain(false);
        router.replace("/home", { scroll: false });
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [justLoggedIn, router]);

  useEffect(() => {
    const loadGames = async () => {
      const fetchedGames = await allGames();
      setGames(fetchedGames);
    };
    loadGames();
  }, []);

  const filteredGames = games.filter((game) => {
    return (
      (questionSource === "All Sources" || game.source === questionSource) &&
      (topic === "All Topics" || game.topic === topic) &&
      (difficulty === "All Difficulties" || game.difficulty === difficulty) &&
      (timeLimit === "All" || game.timeLimit === timeLimit)
    );
  });

  return (
    <>
      <div className="flex flex-col h-screen">
        <div className="flex flex-1 overflow-hidden">
          {showCurtain && <CurtainReveal trigger={startCurtainAnimation} />}

          <main className="flex-1 p-6 overflow-y-auto bg-black text-white">
            <h1 className="text-3xl font-bold text-center">Join a Blitz!</h1>

            <div className="bg-black p-4 rounded-lg mb-6">
              <div className="flex flex-wrap gap-4 w-full">
                <div className="flex flex-col">
                  <label
                    htmlFor="questionSource"
                    className="mb-1 font-semibold text-white"
                  >
                    Question Source
                  </label>
                  <select
                    id="questionSource"
                    value={questionSource}
                    onChange={(e) => setQuestionSource(e.target.value)}
                    className={`${inter.className} bg-green-400/80 border border-gray-600 text-white p-2 rounded-2xl w-48 duration-150 ease-out hover:scale-107`}
                  >
                    <option>All Sources</option>
                    <option>Mitosisphere</option>
                    <option>USABO Past Exams</option>
                    <option>BBO Past Exams</option>
                    <option>MCAT Past Exams</option>
                    <option>NSB Past Exams</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label
                    htmlFor="title"
                    className="mb-1 font-semibold text-white"
                  >
                    Topic
                  </label>
                  <select
                    id="title"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className={`${inter.className} bg-green-400/80 border border-gray-600 text-white p-2 rounded-2xl w-48 duration-150 ease-out hover:scale-107`}
                  >
                    <option>All Topics</option>
                    <option>Topic 1</option>
                    <option>Topic 2</option>
                    <option>Topic 3</option>
                    <option>Topic 4</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label
                    htmlFor="difficulty"
                    className="mb-1 font-semibold text-white"
                  >
                    Difficulty
                  </label>
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className={`${inter.className} bg-green-400/80 border border-gray-600 text-white p-2 rounded-2xl w-48 duration-150 ease-out hover:scale-107 `}
                  >
                    <option>All Difficulties</option>
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                    <option>Very Hard</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label
                    htmlFor="timeLimit"
                    className="mb-1 font-semibold text-white"
                  >
                    Time Limit
                  </label>
                  <select
                    id="timeLimit"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    className={`${inter.className} bg-green-400/80 border border-gray-600 text-white p-2 rounded-2xl w-48 duration-150 ease-out hover:scale-105`}
                  >
                    <option>All</option>
                    <option>5 min</option>
                    <option>10 min</option>
                    <option>15 min</option>
                    <option>30 min</option>
                  </select>
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
                    <div className="bg-zinc-950 border-zinc-800  border-2 rounded-3xl p-6 w-90 shadow-lg hover:scale-[1.06] transition-transform">
                      <h2 className="text-2xl font-semibold mb-2">
                        {game.title}
                      </h2>
                      <p className="text-sm mb-1">
                        <span className="font-bold text-green-400 uppercase mb-2">
                          Question Source:
                        </span>{" "}
                        {game.source}
                      </p>
                      <p className="text-sm mb-1">
                        <span className="font-bold  text-green-400 uppercase mb-2">
                          Number of Questions:
                        </span>{" "}
                        {game.number_of_questions}
                      </p>
                      <p className="text-sm mb-1">
                        <span className="font-bold  text-green-400 uppercase mb-2">
                          Difficulty:
                        </span>{" "}
                        {game.difficulty}
                      </p>
                      {game.topic && (
                        <p className="text-sm mb-1">
                          <span className="  text-green-400 uppercase font-bold mb-2">
                            Topic:
                          </span>{" "}
                          {game.topic}
                        </p>
                      )}

                      <p className="text-sm mb-1">
                        <span className=" text-green-400 uppercase font-bold">
                          Time Limit:
                        </span>{" "}
                        {game.timeLimit}
                      </p>
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
