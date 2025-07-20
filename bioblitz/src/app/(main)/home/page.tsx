"use client";
import Link from "next/link";
import { allGames } from "@/lib/gameRoomsAll";
import { useEffect, useState } from "react";
import CurtainReveal from "../auth/curtain";
import { useSearchParams, useRouter } from "next/navigation";

export default function HomePage() {
  const [questionSource, setQuestionSource] = useState("All Sources");
  const [topic, setTopic] = useState("All Topics");
  const [difficulty, setDifficulty] = useState("All Difficulties");
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

  const filteredGames = allGames.filter((game) => {
    return (
      (questionSource === "All Sources" || game.source === questionSource) &&
      (topic === "All Topics" || game.topic === topic) &&
      (difficulty === "All Difficulties" || game.difficulty === difficulty)
    );
  });

  return (
    <>
      <div className="flex flex-col h-screen">
        <nav className="h-12 bg-gray-900 text-white flex items-center justify-center px-6 shadow">
          Navbar goes here:
        </nav>
        <div className="flex flex-1 overflow-hidden">
          <nav className="w-14 bg-gray-900 text-white p-4"></nav>

          {showCurtain && <CurtainReveal trigger={startCurtainAnimation} />}

          <main className="flex-1 p-6 overflow-y-auto bg-black/100 text-white">
            <h1 className="text-3xl font-bold mb-3">Join a Game!</h1>
            <div className="flex flex-wrap gap-6 mb-3">
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
                  className="bg-zinc-900 text-white p-2 rounded-md w-48"
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
                  className="bg-zinc-900 text-white p-2 rounded-md w-48"
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
                  className="bg-zinc-900 text-white p-2 rounded-md w-48"
                >
                  <option>All Difficulties</option>
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                  <option>Very Hard</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              {filteredGames.length === 0 ? (
                <p className="text-white">
                  No games found matching the filters.
                </p>
              ) : (
                filteredGames.map((game, index) => (
                  <div
                    key={game.id}
                    className="bg-zinc-900 rounded-2xl p-6 w-90 shadow-md hover:scale-[1.02] transition-transform"
                  >
                    <h2 className="text-2xl font-semibold mb-2">
                      {game.title}
                    </h2>
                    <p className="text-sm">
                      <span className="font-bold">Question Source:</span>{" "}
                      {game.source}
                    </p>
                    <p className="text-sm">
                      <span className="font-bold">Number of Questions:</span>{" "}
                      {game.number_of_questions}
                    </p>
                    <p className="text-sm">
                      <span className="font-bold">Difficulty:</span>{" "}
                      {game.difficulty}
                    </p>
                    <p className="text-sm mb-2">
                      <span className="font-bold">Time:</span> {game.total_time}
                    </p>

                    <Link
                      href={`/home/${game.title}/${game.id}`}
                      className="text-sm text-sky-400 cursor-pointer hover:underline"
                    >
                      Click to see more...
                    </Link>
                  </div>
                ))
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
