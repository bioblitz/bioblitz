import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { HeartPulse, Microscope, Dna, Leaf, Globe } from "lucide-react";
import MountainHero from "@/components/MountainHero";

export default async function mainPage({
  searchParams,
}: {
  searchParams: { potato: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect("/home");

  const size = 180;
  const strokeWidth = 15;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const timeLeft = 43;
  const timeTotal = 60;
  const dashOffset = circumference * (1 - timeLeft / timeTotal);

  const cards = [
    {
      title: "Animal Anatomy & Physiology",
      weight: "25%",
      color: "border-violet-500/50",
      bg: "bg-violet-500/10",
      text: "text-violet-400",
      icon: <HeartPulse className="w-16 h-16" />,
      desc: "Animal body systems, organ functions, and physiological regulation.",
    },
    {
      title: "Cell & Molecular Biology",
      weight: "20%",
      color: "border-fuchsia-500/50",
      bg: "bg-fuchsia-500/10",
      text: "text-fuchsia-400",
      icon: <Microscope className="w-16 h-16" />,
      desc: "Cellular structures, biomolecules, and molecular processes.",
    },
    {
      title: "Genetics & Evolution",
      weight: "20%",
      color: "border-blue-500/50",
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      icon: <Dna className="w-16 h-16" />,
      desc: "Inheritance, genetic variation, and evolutionary mechanisms.",
    },
    {
      title: "Plant Anatomy & Physiology",
      weight: "15%",
      color: "border-green-500/50",
      bg: "bg-green-500/20",
      text: "text-green-400",
      icon: <Leaf className="w-16 h-16" />,
      desc: "Plant structures, transport systems, and metabolic processes.",
    },
    {
      title: "Ecology, Ethology, & Biosystematics",
      weight: "20%",
      color: "border-orange-500/50",
      bg: "bg-orange-500/20",
      text: "text-orange-400",
      icon: <Globe className="w-16 h-16" />,
      desc: "Species interactions, animal behavior, and biological classification.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col font-inter bg-[#020204] text-slate-200 selection:bg-violet-500 selection:text-white overflow-x-hidden">


      <main className="relative z-10 flex-grow flex flex-col w-full">
        <MountainHero />

        <section id="demo" className="w-full pt-10 pb-20 px-6 relative -mt-[42vh] z-20">
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="relative rounded-2xl border border-zinc-800 bg-black shadow-2xl overflow-hidden demo-pop"
              style={{ boxShadow: "0 0 0 1px rgba(61,184,112,0.06), 0 32px 80px rgba(0,0,0,0.5)" }}>
              <div className="h-10 border-b border-zinc-800 bg-zinc-900 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                </div>
                <div className="ml-4 px-3 py-1 bg-black/40 rounded text-[10px] text-zinc-500 font-mono w-64 border border-zinc-800/50">
                  bioblitz.com/home/opens2014
                </div>
              </div>

              <div className="p-6 md:p-10 lg:p-14 font-sans relative">
                <div className="mb-8 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-4">
                    <h3 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                      2014 Opens Cell Bio
                    </h3>
                    <span className="bg-violet-600 text-white text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wider mb-2 shadow-lg shadow-violet-600/20">
                      Ranked
                    </span>
                  </div>
                  <div className="h-1 w-20 bg-violet-600 rounded-full mx-auto md:mx-0" />
                </div>

                <div className="flex flex-col xl:flex-row gap-8 items-start">
                  <div className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-violet-500/10 text-violet-400 text-sm font-bold px-3 py-1 rounded-full border border-violet-500/20">
                        Question 4
                      </span>
                    </div>
                    <p className="mb-8 text-lg md:text-xl leading-relaxed text-zinc-100 font-medium">
                      In the absence of oxygen, yeast cells can obtain energy by
                      fermentation, resulting in the production of which of the
                      following sets of molecules?
                    </p>
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center w-full px-5 py-4 rounded-xl border-2 bg-zinc-800/50 text-zinc-300 border-zinc-700 hover:border-zinc-600 cursor-pointer transition-all">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg mr-4 font-bold text-sm bg-black/20 text-zinc-400">A</span>
                        <span className="text-lg">ATP, CO2, and Acetyl-CoA</span>
                      </div>
                      <div className="flex items-center w-full px-5 py-4 rounded-xl border-2 bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-900/50 scale-[1.01] cursor-pointer transition-all">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg mr-4 font-bold text-sm bg-white/20 text-white">B</span>
                        <span className="text-lg">ATP, CO2, and Ethanol</span>
                      </div>
                      <div className="flex items-center w-full px-5 py-4 rounded-xl border-2 bg-zinc-800/50 text-zinc-300 border-zinc-700 hover:border-zinc-600 cursor-pointer transition-all">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg mr-4 font-bold text-sm bg-black/20 text-zinc-400">C</span>
                        <span className="text-lg">ATP, NADH, and Pyruvate</span>
                      </div>
                      <div className="flex items-center w-full px-5 py-4 rounded-xl border-2 bg-zinc-800/50 text-zinc-300 border-zinc-700 hover:border-zinc-600 cursor-pointer transition-all">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg mr-4 font-bold text-sm bg-black/20 text-zinc-400">D</span>
                        <span className="text-lg">ATP, Pyruvate, and Acetyl-CoA</span>
                      </div>
                    </div>
                  </div>

                  <div className="hidden xl:block sticky top-8">
                    <div className="flex flex-col items-center">
                      <div style={{ width: size, height: size, position: "relative" }}>
                        <svg height={size} width={size} className="transform -rotate-90">
                          <circle stroke="#27272a" fill="transparent" strokeWidth={strokeWidth} r={radius} cx={size / 2} cy={size / 2} />
                          <circle stroke="#8b5cf6" fill="transparent" strokeWidth={strokeWidth} strokeLinecap="round"
                            strokeDasharray={circumference} strokeDashoffset={dashOffset} r={radius} cx={size / 2} cy={size / 2} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-bold text-white tabular-nums">00:{timeLeft}</span>
                          <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider mt-1">Remaining</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="curriculum" className="w-full bg-[#050505] py-16 border-t border-slate-900">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                What you'll be tested on
              </h2>
              <p className="text-slate-400">
                All five topic areas from the official USABO syllabus, with
                problem sets weighted to match the real exam.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {cards.map((card, i) => (
                <div key={i} className="group h-[320px] w-full [perspective:1000px]">
                  <div className="relative h-full w-full transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                    <div className="absolute inset-0 h-full w-full rounded-2xl bg-[#0F1422] border border-slate-800 p-6 flex flex-col items-center justify-center [backface-visibility:hidden]">
                      <div className={`absolute top-0 right-0 w-32 h-32 ${card.bg} blur-[60px] rounded-full opacity-50`} />
                      <div className={`mb-6 ${card.text} transition-transform duration-300 group-hover:scale-110`}>{card.icon}</div>
                      <div className="text-center z-10">
                        <div className={`text-xs font-black uppercase tracking-widest ${card.text} mb-2`}>Section 0{i + 1}</div>
                        <h3 className="text-xl font-bold text-white leading-tight">{card.title}</h3>
                      </div>
                      <div className="absolute bottom-4 text-slate-700 text-[10px] uppercase tracking-wider font-mono">{card.weight} of exam</div>
                    </div>
                    <div className={`absolute inset-0 h-full w-full rounded-2xl bg-[#0F1422] border ${card.color} p-6 flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden]`}>
                      <div className={`absolute -bottom-10 -left-10 w-40 h-40 ${card.bg} blur-[50px] rounded-full opacity-40`} />
                      <div className="relative z-10">
                        <div className={`text-xs font-black uppercase tracking-widest ${card.text} mb-4`}>Section 0{i + 1}</div>
                        <h3 className="text-lg font-bold text-white leading-tight mb-3">{card.title}</h3>
                        <p className="text-slate-300 text-sm leading-relaxed">{card.desc}</p>
                      </div>
                      <div className="relative z-10 mt-auto flex items-end justify-between border-t border-slate-800/50 pt-4">
                        <div>
                          <div className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">Weightage</div>
                          <div className={`h-1 w-12 rounded-full ${card.text.replace("text", "bg")} opacity-60 mt-1`} />
                        </div>
                        <div className="text-3xl font-black text-white/90">{card.weight}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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

        <section id="reviews" className="w-full py-16 px-6 border-t border-slate-900 bg-[#020204]">
          <div className="max-w-4xl mx-auto">
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-white">From the community</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-[#0B0F19] border border-slate-800 rounded-xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 text-sm font-bold">A</div>
                  <div>
                    <div className="text-white font-bold text-sm">Alex C.</div>
                    <div className="text-slate-500 text-xs">USABO Finalist '24</div>
                  </div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  "The problem quality is legitimately good. I stopped just re-reading Campbell's and started actually understanding the material. Hit Gold Tier last week."
                </p>
              </div>
              <div className="p-6 bg-[#0B0F19] border border-slate-800 rounded-xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 text-sm font-bold">S</div>
                  <div>
                    <div className="text-white font-bold text-sm">Sarah J.</div>
                    <div className="text-slate-500 text-xs">Pre-Med @ JHU</div>
                  </div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  "Used this for MCAT prep and honestly the USABO-level questions made everything else feel manageable. The timed format forces you to actually know it, not just recognize it."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────── */}
        <section className="w-full py-16 px-6 border-t border-slate-900 bg-[#050505]">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8">FAQ</h2>
            <div className="space-y-4">
              {[
                {
                  q: "What is the difference between a Ranked and Practice Blitz?",
                  a: "Your first attempt at any Blitz is automatically \"Ranked\" and affects your global Elo rating based on speed and accuracy. Any subsequent attempts on that same problem set are \"Practice\" modes—great for reviewing mistakes, but they won't alter your leaderboard standing.",
                },
                {
                  q: "How do I build my Streak?",
                  a: "Streaks are exclusively tied to the Problem of the Day (POTD). Completing standard Blitzes contributes to your Elo, but to keep your fire burning, you must solve the official daily problem every 24 hours. Miss a day, and the streak resets.",
                },
                {
                  q: "How is my Elo rating calculated?",
                  a: "Your rating is dynamic. It updates after every full Blitz submission based on your performance relative to the set's difficulty. High accuracy, paired with fast completion on harder sets, leads to the greatest rating gains.",
                },
                {
                  q: "Is the content aligned with USABO & Campbell?",
                  a: "Yes. Our question bank is rigorously aligned with Campbell Biology (12th Ed), Raven's Biology of Plants, and past USABO Open/Semifinal exams. We cover all 7 official syllabus areas, from Cell Biology to Biosystematics.",
                },
                {
                  q: "Is this useful for AP Biology or MCAT?",
                  a: "Absolutely. While BioBlitz is optimized for Olympiad-level difficulty, it serves as \"weight training\" for AP Bio and MCAT aspirants. If you can handle a USABO Blitz, standard exams will feel significantly easier.",
                },
              ].map((item, i) => (
                <details key={i} className="group border border-slate-800 rounded-lg bg-[#0F1422] open:border-violet-500/50 transition-all duration-300">
                  <summary className="flex cursor-pointer items-center justify-between p-6 font-medium text-slate-200">
                    <span>{item.q}</span>
                    <span className="transition-transform duration-300 group-open:rotate-180 ml-4 flex-shrink-0">
                      <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24">
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
          <div className="absolute inset-0 z-0 bg-violet-900/5" />
          <div className="max-w-3xl mx-auto bg-[#0F1422] rounded-3xl p-10 border border-white/5 relative z-10 shadow-2xl">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              See where you rank.
            </h2>
            <p className="text-slate-300 mb-8 text-lg">
              Your first Blitz is free. No account required to start.
            </p>
            <Link href="/home">
              <button className="bg-white text-black font-bold py-3 px-10 rounded-full hover:bg-slate-200 transition-colors shadow-lg shadow-white/10">
                Start a Blitz
              </button>
            </Link>
          </div>
        </section>

        <footer className="w-full text-center py-8 text-slate-600 text-sm border-t border-slate-900 bg-[#020204]">
          <div className="flex justify-center gap-6 mb-4">
            <Link href="/privacy-policy" className="hover:text-violet-400 transition-colors">Privacy</Link>
            <Link href="/terms-and-conditions" className="hover:text-violet-400 transition-colors">Terms and Conditions</Link>
            <Link href="/about" className="hover:text-violet-400 transition-colors">About</Link>
          </div>
          © {new Date().getFullYear()} BioBlitz. Powered by{" "}
          <Link href="https://mitosisphere.org" target="_blank" rel="noopener noreferrer" className="hover:text-violet-400 transition-colors font-medium">
            Mitosisphere
          </Link>
          .
        </footer>
      </main>
    </div>
  );
}