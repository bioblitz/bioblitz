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

            <div ref={(el) => { sectionRefs.current[0] = el; }} className="mb-12">
              <h2 className="text-neutral-300 mb-3">Introduction</h2>
              <p className="text-neutral-400 mb-4">
                First of all, you're probably wondering what BioBlitz is. It is a platform that hosts public biology tests, called
                "blitzes", to make biology education more accessible. Studying for the USA Biology Olympiad (USABO) or the MCAT exam takes
                a tremendous amount of effort and a lot of practice is needed.
              </p>
              <p className="text-neutral-400 mb-4">
                Many people spend hours reading Campbell's Biology to prepare for the first round of USABO,
                but are limited by the few past exams that are available. Created by USABO participants, this platform provides a centralized place to
                take practice tests (called "Blitzes"), as well as create them for others to take.
              </p>
              <p className="text-neutral-400">
                Our platform hosts many top-tier USABO participants, and is sponsored by many more, including Top 50, Top 20, and IBO medalists.
              </p>
            </div>

            <div ref={(el) => { sectionRefs.current[1] = el; }} className="mb-12">
              <h2 className="text-neutral-300 mb-3">How it works</h2>
              <p className="text-neutral-400 mb-4">
                The home page will show a list of blitzes. Each is created by a user on the platform.{" "}
                <Link className="text-yellow-300 hover:underline" href="https://mitosisphere.org">Mitosisphere</Link>{" "}
                is a team of problem writers that write many of the questions. Each contest is assigned a{" "}
                <Link className="hover:underline text-yellow-300" href="about/rating">rating</Link> based on how difficult it is.
                A Blitz with a higher rating indicates more challenging content, dynamically determined by how users performed on the blitz.
              </p>
              <p className="text-neutral-400">
                After you play each Blitz, you can also rate the quality of that blitz out of five stars. Let others know how well made a
                Blitz is so it can get promoted to others. Try to take higher quality Blitzes for better practice first. Subscribe to
                channels that frequently provide high quality Blitzes, so you are notified when a new Blitz is posted.
              </p>
            </div>

            <div ref={(el) => { sectionRefs.current[2] = el; }} className="mb-12">
              <h2 className="text-neutral-300 mb-3">Compete</h2>
              <p className="text-neutral-400 mb-4">
                Everyone starts at 500 rating. Based on your performance on the Blitzes, your rating will either go up or down. You can see how you stack up against your competitors on the{" "}
                <Link className="hover:underline text-yellow-300" href="leaderboard">leaderboard</Link>.
              </p>
              <p className="text-neutral-400 mb-4">
                Different rankings are divided into tiers, starting at bronze III and climbing up to grandmaster. Your username will show off
                your ranking on leaderboards and your profile, so climb the tiers to show off your progress to your friends.
              </p>
              <p className="text-neutral-400">
                During the first 25 unique Blitz attempts, a Blitz has yet to be rated by our system. You can take these Blitzes for a 2x
                rating boost during this stage, and your rating will be updated automatically after the threshold of 15 unique attempts is
                reached. After this, the contest is auto-rated, with its rating still dynamically changing based on the skill of the people
                who take it and their performance.
              </p>
            </div>

            <div ref={(el) => { sectionRefs.current[3] = el; }} className="mb-12">
              <h2 className="text-neutral-300 mb-3">Problem of the Day</h2>
              <p className="text-neutral-400 mb-4">
                There is a new problem released each day, curated by a team of experienced problem writers (USABO T125 and above).
                These can span over any available topic, and range in difficulty. You can also view the archive that contains every POTD ever released, and take each of them. Problems are tagged by their topic, so you can filter by a specific category such
                as Anatomy and Physiology to practice the areas you have just learned or are weakest at.
              </p>
              <p className="text-neutral-400">
                Every day you take the daily problem, whether you get it right or wrong, you will keep your streak alive. One day missed will
                set you back to 0, so make sure to do the daily problem each day. The most devoted participants can be seen on the streak
                leaderboard. Try the daily problem every day to climb the streak leaderboard. Content is learned best by spaced repetition, so
                by challenging yourself each day, you will retain information for the USABO exams.
              </p>
            </div>
            <div ref={(el) => { sectionRefs.current[5] = el; }} className="mb-12">
              <h2 className="text-neutral-300 mb-3">Create</h2>
              <p className="text-neutral-400 mb-4">
                You can make your own content for others to view as well. You simply enter details about the Blitz, upload a banner image, set a time limit, and put in the questions using our question editor.
              </p>
            </div>
            <div ref={(el) => { sectionRefs.current[6] = el; }} className="mb-96">
              <h2 className="text-neutral-300 mb-3">Track your progress</h2>
              <p className="text-neutral-400 mb-4">
               Your profile page shows useful stats about your journey. This includes the Blitzes you've played, how you've performed on them, and a graph of your Elo rating.
              </p>
              <p className="text-neutral-400">
              You can view others' profile pages. You can add friends as well, and view your friends list on the profile page. Currently, the friends feature has no functionality, but it's coming soon! (Challenges? 👀)
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