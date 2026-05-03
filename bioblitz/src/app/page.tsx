import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import MountainHero from "@/components/MountainHero";
import DemoBlitz from "@/components/DemoBlitz";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  alternates: {
    canonical: SITE_URL,
  },
};

export default async function mainPage({
  searchParams,
}: {
  searchParams: { potato: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect("/home");

  return (
    <div className="min-h-screen flex flex-col font-inter bg-neutral-900 text-slate-200 selection:text-white overflow-x-hidden">
      <main className="relative z-10 flex-grow flex flex-col w-full">
        <MountainHero />

        <section
          id="demo"
          className="w-full pt-12.5 pointer-events-none pb-20 px-6 relative -mt-[42vh] z-20"
        >
          <div className="max-w-6xl pointer-events-auto mx-auto relative z-10">
            <div className="relative rounded-2xl border border-zinc-800 bg-neutral-900 shadow-2xl overflow-hidden demo-pop">
              <div className="h-10 border-b border-zinc-800 bg-zinc-900 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                </div>
                <div className="ml-4 px-3 py-1 bg-neutral-900/40 rounded text-[10px] text-zinc-500 font-mono w-64 border border-zinc-800/50">
                  bioblitz.com/home/opens2014
                </div>
              </div>

              <div className="p-6 md:p-10 lg:p-14 font-sans relative">
                <div className="mb-8 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-4">
                    <h3 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                      2014 Opens Cell Bio
                    </h3>
                    <span className="text-white border text-xs px-2 py-1 rounded-md font-bold mb-2">
                      Ranked
                    </span>
                  </div>
                  <div className="h-1 w-20  rounded mx-auto md:mx-0" />
                </div>

                <DemoBlitz />
              </div>
            </div>
          </div>
        </section>

        <style>{`
          .demo-pop {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
            animation: demo-pop 0.8s ease forwards;
            animation-delay: 0.9s;
          }
          @keyframes demo-pop {
            from {
              opacity: 0;
              transform: translateY(24px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>

        <section className="w-full py-16 px-45">
          <div className="max-w-2xl left">
            <h2 className="text-2xl font-semibold text-neutral-200 mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "What is the difference between a Ranked and Practice Blitz?",
                  a: "Your first attempt will count towards your rating, while the subsequent attempts are just for practice.",
                },
                {
                  q: "How do I build my Streak?",
                  a: "Streaks are exclusively tied to the Problem of the Day (POTD). Completing standard Blitzes contributes to your Elo, but to keep your streak alive, you must solve the official daily problem every 24 hours. Miss a day, and the streak resets.",
                },
                {
                  q: "How is my Elo rating calculated?",
                  a: "Your rating is dynamic. It updates after every full Blitz submission based on your performance relative to the set's difficulty. Perform well on blitzes to increase your rating.",
                },
                {
                  q: "Can you create your own blitzes?",
                  a: "Yep! While Mitosisphere's content writers create a lot of official content for the website, anyone with an account can create ranked blitzes for others to play. We are a tight-knit community, and your contributions help others improve their bio skills.",
                },
                {
                  q: "Is the content aligned with USABO & Campbell?",
                  a: "Yes. As the community creates a LOT of blitzes, there are many that are aligned with the official content areas of USABO. However, that's not the only content that's on the website, as there are other biology and medical exam-related content that many have uploaded.",
                },
                {
                  q: "Is this useful for other biology exams, like AP Biology or medical exams?",
                  a: "Absolutely. While BioBlitz is optimized for the United States Biology Olympiad exam, it is equally useful for other biology-related tests, such as for AP Biology exams, the MCAT, and USMLE.",
                },
              ].map((item, i) => (
                <details key={i} className="group transition-all duration-300">
                  <summary className="flex cursor-pointer justify-between p-6 font-medium text-slate-200">
                    <span>{item.q}</span>
                    <span className="transition-transform duration-300 group-open:rotate-180 ml-4 flex-shrink-0">
                      <svg
                        fill="none"
                        height="24"
                        shapeRendering="geometricPrecision"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        viewBox="0 0 24 24"
                        width="24"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </summary>
                  <div className="px-6 pb-6 text-slate-400 text-sm leading-relaxed border-t border-slate-800/50 pt-4">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full py-16 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 z-0" />
          <div className="max-w-3xl mx-auto bg-[pale] rounded-4xl p-10 border bg-neutral-200 border-white/5 relative z-10 shadow-lg">
            <h2 className="text-3xl md:text-5xl font-bold text-black mb-4">
              See where you rank.
            </h2>
            
            <Link href="/auth">
              <button className="bg-neutral-900 text-white font-bold py-3 px-10 rounded-full hover:bg-neutral-900 transition-colors shadow-lg shadow-white/10">
                Get started
              </button>
            </Link>
          </div>
        </section>

        <footer className="w-full text-center py-8 text-neutral-400 text-sm border-t border-slate-900 bg-neutral-900">
          <div className="flex justify-center gap-6 mb-4">
            <Link href="/privacy-policy" className=" transition-colors">
              Privacy
            </Link>
            <Link href="/terms-and-conditions" className=" transition-colors">
              Terms and Conditions
            </Link>
            <Link href="/about" className=" transition-colors">
              About
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
