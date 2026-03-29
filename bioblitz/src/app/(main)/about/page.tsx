"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const SCREENSHOTS: (string | null)[] = [
  "/images/about/home.png",                             
  "/images/about/blitz.png",                              
  "/images/about/leaderboard.png", 
  "/images/about/potd.png", 
  "/images/about/create.png", 
];

export default function About() {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      let current = 0;
      sectionRefs.current.forEach((el, i) => {
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= window.innerHeight / 2) current = i;
        }
      });
      setActiveIndex(current);
    };

    document.addEventListener("scroll", handleScroll);
    return () => document.removeEventListener("scroll", handleScroll);
  }, []);
  return (
    <div className="min-h-screen bg-neutral-900">
      <main className="max-w-7xl mx-auto pr-4 sm:pr-6 lg:pr-8 pl-0 sm:pl-12 lg:pl-33.5 pt-24 pb-12">
        <div className="flex items-start gap-10">

          <div className="max-w-md text-lg">
            <h1 className="font-semibold mb-6 text-3xl">BioBlitz</h1>

            <div ref={(el) => { sectionRefs.current[0] = el; }} className="min-h-screen flex flex-col">
              <h2 className="text-neutral-300 mb-3">Introduction</h2>
              <p className="text-neutral-400 mb-6">
                First of all, you're probably wondering what BioBlitz is. It is a platform that hosts public biology tests, called
                "blitzes", to make biology education more accessible. Studying for the USA Biology Olympiad (USABO) or the MCAT exam takes
                a tremendous amount of effort and practice is needed to well.
                <br /><br />
                Most people spend hours reading Campbell's Biology to prepare for the opens,
                but are limited by the few open and semifinal exams that are available. Created by USABO participants, the platform provides a centralized place to
                take practice tests, as well as create questions for others.
              </p>
            </div>

            <div ref={(el) => { sectionRefs.current[1] = el; }} className="min-h-screen flex flex-col">
              <h2 className="text-neutral-300 mb-3">How it works</h2>
              <p className="text-neutral-400 mb-6">
                The home page will show a list of blitzes. Each will be created by a user on the platform.{" "}
                <Link className="text-yellow-300 hover:underline" href="https://mitosisphere.org">Mitosisphere</Link>{" "}
                is a team of problem writers that make many of the questions. Each contest is assigned a{" "}
                <Link className="hover:underline text-yellow-300" href="about/rating">rating</Link> based on how difficult it is.
                A blitz with a higher rating indicates more challenging content, dynamically determined by how users performed on the blitz.
              </p>
            </div>

            <div ref={(el) => { sectionRefs.current[2] = el; }} className="min-h-screen flex flex-col">
              <h2 className="text-neutral-300 mb-3">Compete</h2>
              <p className="text-neutral-400 mb-6">
                Everyone starts at 500 rating. Based on your performance on the blitzes, your rating will either go up or down. You can see how you stack up against your competitors on the{" "}
                <Link className="hover:underline text-yellow-300" href="leaderboard">leaderboard</Link>.
              </p>
            </div>
          </div>

          <div className="flex-1 sticky top-50 mt-30 -mr-20">
            <div className="relative">
              

              <div className="absolute rounded-full z-20" style={{ top: "9.5%", left: "18.3%", width: "66%", height: "65%" }}>
                {SCREENSHOTS.map((src, i) =>
                  src ? (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className={`absolute rounded-full inset-0 scale-150 px-20 w-full h-full object-cover object-top rounded-sm transition-opacity duration-700 ${
                        activeIndex === i ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  ) : null
                )}
              </div>

              <img
                src="images/about/computer.png"
                alt=""
                className="relative z-10 w-full pointer-events-none"
              />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}