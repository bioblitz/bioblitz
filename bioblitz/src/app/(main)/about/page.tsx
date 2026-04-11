"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const SCREENSHOTS: (string | null)[] = [
  "/images/about/home.png",                             
  "/images/about/blitz.png",                              
  "/images/about/leaderboard.png", 
  "/images/about/potd.png", 
  "/images/about/compete.png",
  "/images/about/create.png", 
  "/images/about/profile.png", 

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
                <br /><br />
                Our platform hosts the top USABO participants, used by several in the top 50 as well as an international biology olympiad
                gold medalist. See how you stack against the top users, and improve your olympiad skills.
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
                <br /><br />
                After you play each blitz, you can also rate the quality of that blitz out of five stars. Let others know how well made a
                blitz is so it can get promoted to others. Try to take higher quality blitzes for better practice first. Subscribe to
                channels that frequently provide high quality blitzes, so you are notified when a new blitz is posted.
                <br /><br />
                Train
              </p>
            </div>

            <div ref={(el) => { sectionRefs.current[2] = el; }} className="min-h-screen flex flex-col">
              <h2 className="text-neutral-300 mb-3">Compete</h2>
              <p className="text-neutral-400 mb-6">
                Everyone starts at 500 rating. Based on your performance on the blitzes, your rating will either go up or down. You can see how you stack up against your competitors on the{" "}
                <Link className="hover:underline text-yellow-300" href="leaderboard">leaderboard</Link>.
                <br /><br />
                Different rankings are divided into tiers, starting at bronze III and climbing up to grandmaster. Your username will show off
                your ranking on leaderboards and your profile, so climb the tiers to show off your progress to your friends.
                <br /><br />
                During the first 15 unique blitz attempts, a blitz has yet to be rated by our system. You can take these blitzes for a 2x
                rating boost during this stage, and your rating will be updated automatically after the threshold of 15 unique attempts is
                reached. After this, the contest is autorated, with its rating still dynamically changing based on the skill of the people
                who take it and their performance.
              </p>
            </div>

            <div ref={(el) => { sectionRefs.current[3] = el; }} className="min-h-screen flex flex-col">
              <h2 className="text-neutral-300 mb-3">Problem of the day</h2>
              <p className="text-neutral-400 mb-6">
                Every day is a new problem, curated by a team of problem writers who have historically been among the T50 USABO participants.
                These can span over any available topic, and range in difficulty. For more practice, you may view the archive that contains
                hundreds of problems and take each of them. Problems are tagged by their topic, so you can filter by a specific category such
                as Anatomy and Physiology to practice the areas you have just learned or are weakest at.
                <br /><br />
                Every day you take the daily problem, whether you get it right or wrong, you will keep your streak alive. One day missed will
                set you back to 0, so make sure to do the daily problem each day. The most devoted participants can be seen on the streak
                leaderboard. Try the daily problem every day to climb the streak leaderboard. Content is learned best by spaced repetition, so
                by challenging yourself each day, you will retain information for semis or opens.
              </p>
            </div>
            <div ref={(el) => { sectionRefs.current[4] = el;}} className="min-h-screen flex flex-col">
              <h2 className="text-neutral-300 mb-3">Face off against your friends</h2>
              <p className="text-neutral-400 mb-6">
                <br /><br />
                On the compete tab, you can challenge your friends to a blitz. You will first take the blitz and get feedback on your
                performance. They will have 48 hours to respond. If they get more questions right, then they win, and vice versa. Time taken
                is a tie breaker if you both get the same accuracy.
                <br /><br />
                Challenging your friends will apply the same rating update as if you were taking the contests on your own, but provide a 1v1
                aspect. You will be able to track your record against each of your friends, allowing you to see who is truly better at bio.
              </p>
            </div>
            <div ref={(el) => { sectionRefs.current[5] = el; }} className="min-h-screen flex flex-col">
              <h2 className="text-neutral-300 mb-3">Create</h2>
            </div>
            <div ref={(el) => { sectionRefs.current[6] = el; }} className="min-h-screen flex flex-col">
              <h2 className="text-neutral-300 mb-3">Track your progress</h2>
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
                src="/images/about/computer.png"
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