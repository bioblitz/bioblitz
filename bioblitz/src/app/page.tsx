import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { HeartPulse, Microscope, Dna, Leaf, Globe } from "lucide-react";

export default async function mainPage({
  searchParams,
}: {
  searchParams: { potato: string };
}) {
  const user = await getCurrentUser();

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
      bg: "bg-violet-500/20", // Slightly stronger opacity for the glow
      text: "text-violet-400",
      icon: <HeartPulse className="w-16 h-16" />,
      desc: "Animal body systems, organ functions, and physiological regulation.",
    },
    {
      title: "Cell & Molecular Biology",
      weight: "20%",
      color: "border-fuchsia-500/50",
      bg: "bg-fuchsia-500/20",
      text: "text-fuchsia-400",
      icon: <Microscope className="w-16 h-16" />,
      desc: "Cellular structures, biomolecules, and molecular processes.",
    },
    {
      title: "Genetics & Evolution",
      weight: "20%",
      color: "border-blue-500/50",
      bg: "bg-blue-500/20",
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
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #2e1065 1px, transparent 1px), linear-gradient(to bottom, #2e1065 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Ambient Glow Spots */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-900/20 rounded-full blur-[128px] mix-blend-screen animate-pulse duration-1000"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[128px] mix-blend-screen"></div>
      </div>

      <main className="relative z-10 flex-grow flex flex-col items-center w-full pt-20">
        {/* --- HERO SECTION --- */}
        <section className="w-full max-w-6xl px-6 pt-15 pb-q text-center flex flex-col items-center">
          <h1 className="text-5xl md:text-8xl font-bold text-white tracking-tight mb-8 drop-shadow-2xl leading-[0.9]">
            Biology is now <br />
            <span
              className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-violet-300
"
            >
              beyond the books.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
            Stop memorizing textbooks alone. Join the competitive platform for{" "}
            <span className="text-slate-200 font-medium">USABO</span> and{" "}
            <span className="text-slate-200 font-medium">IBO</span> aspirants.
            Grind challenging problems, boost your Elo, and climb up the
            leaderboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-10">
            <Link href="/home">
              <button className="w-full sm:w-auto bg-violet-500 text-white font-bold py-4 px-10 rounded-lg hover:bg-violet-500 hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.6)] transition-all duration-200">
                Start Competing
              </button>
            </Link>
          </div>
        </section>

        {/* --- INTERFACE PREVIEW (THE ARENA) --- */}
        <section className="w-full py-8 px-6 relative bg-[#020204]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-sm font-mono text-violet-400 mb-2 tracking-widest uppercase">
                Join a Blitz
              </h2>
              <h3 className="text-3xl md:text-4xl font-bold text-white">
                Built for speed and accuracy
              </h3>
            </div>

            <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden group">
              <div className="h-10 border-b border-zinc-800 bg-zinc-900 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                <div className="ml-4 px-3 py-1 bg-black/40 rounded text-[10px] text-zinc-500 font-mono w-64 border border-zinc-800/50">
                  bioblitz.com/home/opens2014
                </div>
              </div>

              <div className="p-4 md:p-8 lg:p-12 font-sans relative">
                <div className="mb-8 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-4">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                      2014 Opens Cell Bio
                    </h1>
                    <span className="bg-violet-600 text-white text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wider mb-2 shadow-lg shadow-violet-600/20">
                      Ranked
                    </span>
                  </div>
                  <div className="h-1 w-20 bg-violet-600 rounded-full mx-auto md:mx-0"></div>
                </div>

                <div className="flex flex-col xl:flex-row gap-8 items-start">
                  {/* Left: The Question Card */}
                  <div className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl relative z-10">
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
                      {/* Option A (Normal) */}
                      <div className="group flex items-center w-full px-5 py-4 rounded-xl text-left border-2 transition-all duration-200 bg-zinc-800/50 text-zinc-300 border-zinc-700 hover:border-zinc-600">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg mr-4 font-bold text-sm uppercase transition-colors bg-black/20 text-zinc-400">
                          A
                        </span>
                        <span className="text-lg">
                          ATP, CO2, and Acetyl-CoA
                        </span>
                      </div>

                      {/* Option B (Selected) */}
                      <div className="group flex items-center w-full px-5 py-4 rounded-xl text-left border-2 transition-all duration-200 bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-900/50 transform scale-[1.01]">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg mr-4 font-bold text-sm uppercase transition-colors bg-white/20 text-white">
                          B
                        </span>
                        <span className="text-lg">ATP, CO2, and Ethanol</span>
                      </div>

                      {/* Option C (Normal) */}
                      <div className="group flex items-center w-full px-5 py-4 rounded-xl text-left border-2 transition-all duration-200 bg-zinc-800/50 text-zinc-300 border-zinc-700 hover:border-zinc-600">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg mr-4 font-bold text-sm uppercase transition-colors bg-black/20 text-zinc-400">
                          C
                        </span>
                        <span className="text-lg">ATP, NADH, and Pyruvate</span>
                      </div>

                      {/* Option D (Normal) */}
                      <div className="group flex items-center w-full px-5 py-4 rounded-xl text-left border-2 transition-all duration-200 bg-zinc-800/50 text-zinc-300 border-zinc-700 hover:border-zinc-600">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg mr-4 font-bold text-sm uppercase transition-colors bg-black/20 text-zinc-400">
                          D
                        </span>
                        <span className="text-lg">
                          ATP, Pyruvate, and Acetyl-CoA
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: The Circular Timer (Visual) */}
                  {/* Hidden on mobile to save space, shown on md+ */}
                  <div className="hidden xl:block sticky top-8">
                    <div className="relative flex flex-col items-center">
                      <div
                        style={{
                          width: size,
                          height: size,
                          position: "relative",
                        }}
                      >
                        {/* SVG Timer */}
                        <svg
                          height={size}
                          width={size}
                          className="transform -rotate-90"
                        >
                          <circle
                            stroke="#27272a"
                            fill="transparent"
                            strokeWidth={strokeWidth}
                            r={radius}
                            cx={size / 2}
                            cy={size / 2}
                          />
                          <circle
                            stroke="#8b5cf6"
                            fill="transparent"
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={dashOffset}
                            r={radius}
                            cx={size / 2}
                            cy={size / 2}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-bold text-white tabular-nums">
                            00:{timeLeft}
                          </span>
                          <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider mt-1">
                            Remaining
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* --- CURRICULUM BENTO GRID (USABO FOCUSED) --- */}
        {/* --- CURRICULUM BENTO GRID (UNIFORM SIZE) --- */}
        <section
          id="curriculum"
          className="w-full bg-[#050505] py-8 border-t border-slate-900"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Complete USABO Coverage
              </h2>
              <p className="text-slate-400">
                The Full USABO Framework; Play now to master the 7 official
                syllabus areas.
              </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {cards.map((card, i) => (
                <div
                  key={i}
                  className="group h-[320px] w-full [perspective:1000px]"
                >
                  {/* Inner Container: This is the element that actually rotates */}
                  <div className="relative h-full w-full transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                    {/* === FRONT FACE (Icon + Title) === */}
                    <div className="absolute inset-0 h-full w-full rounded-2xl bg-[#0F1422] border border-slate-800 p-6 flex flex-col items-center justify-center [backface-visibility:hidden]">
                      {/* Subtle Background Glow */}
                      <div
                        className={`absolute top-0 right-0 w-32 h-32 ${card.bg} blur-[60px] rounded-full opacity-50`}
                      ></div>

                      <div
                        className={`mb-6 ${card.text} transition-transform duration-300 group-hover:scale-110`}
                      >
                        {card.icon}
                      </div>

                      <div className="text-center z-10">
                        <div
                          className={`text-xs font-black uppercase tracking-widest ${card.text} mb-2`}
                        >
                          Section 0{i + 1}
                        </div>
                        <h3 className="text-xl font-bold text-white leading-tight">
                          {card.title}
                        </h3>
                      </div>

                      <div className="absolute bottom-4 text-slate-600 text-[10px] uppercase tracking-wider font-mono">
                        Hover to Reveal
                      </div>
                    </div>

                    {/* === BACK FACE (Description + Stats) === */}
                    <div
                      className={`absolute inset-0 h-full w-full rounded-2xl bg-[#0F1422] border ${card.color} p-6 flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden]`}
                    >
                      {/* Background Glow */}
                      <div
                        className={`absolute -bottom-10 -left-10 w-40 h-40 ${card.bg} blur-[50px] rounded-full opacity-40`}
                      ></div>

                      <div className="relative z-10">
                        <div
                          className={`text-xs font-black uppercase tracking-widest ${card.text} mb-4`}
                        >
                          Section 0{i + 1}
                        </div>
                        <h3 className="text-lg font-bold text-white leading-tight mb-3">
                          {card.title}
                        </h3>
                        <p className="text-slate-300 text-sm leading-relaxed">
                          {card.desc}
                        </p>
                      </div>

                      <div className="relative z-10 mt-auto flex items-end justify-between border-t border-slate-800/50 pt-4">
                        <div>
                          <div className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">
                            Weightage
                          </div>
                          <div
                            className={`h-1 w-12 rounded-full ${card.text.replace(
                              "text",
                              "bg"
                            )} opacity-60 mt-1`}
                          ></div>
                        </div>
                        <div className="text-3xl font-black text-white/90">
                          {card.weight}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* --- SOCIAL PROOF / REVIEWS --- */}
        <section
          id="reviews"
          className="w-full py-12 px-6 border-t border-slate-900 bg-[#020204]"
        >
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white">Hall of Fame</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Review 1 */}
              <div className="p-6 bg-[#0B0F19] border border-slate-800 rounded-xl relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"></div>
                  <div>
                    <div className="text-white font-bold text-sm">
                      Alex Chen
                    </div>
                    <div className="text-slate-500 text-xs">
                      USABO Finalist '24
                    </div>
                  </div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  "BioBlitz gamification is actually insane. I went from
                  struggling to memorize Campbell's to visualizing concepts
                  because of the problem quality. Hit Gold Tier last week."
                </p>
              </div>

              {/* Review 2 */}
              <div className="p-6 bg-[#0B0F19] border border-slate-800 rounded-xl relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500"></div>
                  <div>
                    <div className="text-white font-bold text-sm">
                      Sarah Jenkins
                    </div>
                    <div className="text-slate-500 text-xs">Pre-Med @ JHU</div>
                  </div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  "The MCAT biology section feels easy after grinding the hard
                  mode problems here. It's like weight training for your brain."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- FAQ --- */}
        <section className="w-full py-12 px-6 border-t border-slate-900 bg-[#050505]">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {/* Q1: The Streak Mechanic (Mandatory per your request) */}

              {/* Q2: The "Mathdash" Core Mechanic */}
              <details className="group border border-slate-800 rounded-lg bg-[#0F1422] open:border-violet-500/50 transition-all duration-300">
                <summary className="flex cursor-pointer items-center justify-between p-6 font-medium text-slate-200">
                  <span>
                    What is the difference between a Ranked and Practice Blitz?
                  </span>
                  <span className="transition-transform duration-300 group-open:rotate-180">
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
                      <path d="M6 9l6 6 6-6"></path>
                    </svg>
                  </span>
                </summary>
                <div className="group-open:animate-fadeIn mt-0 px-6 pb-6 text-slate-400 text-sm leading-relaxed border-t border-slate-800/50 pt-4">
                  Your first attempt at any Blitz is automatically "Ranked" and
                  affects your global Elo rating based on speed and accuracy.
                  Any subsequent attempts on that same problem set are
                  "Practice" modes—great for reviewing mistakes, but they won't
                  alter your leaderboard standing.
                </div>
              </details>

              <details className="group border border-slate-800 rounded-lg bg-[#0F1422] open:border-violet-500/50 transition-all duration-300">
                <summary className="flex cursor-pointer items-center justify-between p-6 font-medium text-slate-200">
                  <span>How do I build my Streak?</span>
                  <span className="transition-transform duration-300 group-open:rotate-180">
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
                      <path d="M6 9l6 6 6-6"></path>
                    </svg>
                  </span>
                </summary>
                <div className="group-open:animate-fadeIn mt-0 px-6 pb-6 text-slate-400 text-sm leading-relaxed border-t border-slate-800/50 pt-4">
                  Streaks are exclusively tied to the Problem of the Day (POTD).
                  Completing standard Blitzes contributes to your Elo, but to
                  keep your fire burning, you must solve the official daily
                  problem every 24 hours. Miss a day, and the streak resets.
                </div>
              </details>
              {/* Q3: Content Source (Critical for USABO/IBO context) */}

              {/* Q4: The Elo System (Adjusted for Batch/Set Mechanics) */}
              <details className="group border border-slate-800 rounded-lg bg-[#0F1422] open:border-violet-500/50 transition-all duration-300">
                <summary className="flex cursor-pointer items-center justify-between p-6 font-medium text-slate-200">
                  <span>How is my Elo rating calculated?</span>
                  <span className="transition-transform duration-300 group-open:rotate-180">
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
                      <path d="M6 9l6 6 6-6"></path>
                    </svg>
                  </span>
                </summary>
                <div className="group-open:animate-fadeIn mt-0 px-6 pb-6 text-slate-400 text-sm leading-relaxed border-t border-slate-800/50 pt-4">
                  Your rating is dynamic. It updates after every full Blitz
                  submission based on your performance relative to the set's
                  difficulty. High accuracy, paired with fast completion on
                  harder sets, leads to the greatest rating gains.
                </div>
              </details>

              <details className="group border border-slate-800 rounded-lg bg-[#0F1422] open:border-violet-500/50 transition-all duration-300">
                <summary className="flex cursor-pointer items-center justify-between p-6 font-medium text-slate-200">
                  <span>Is the content aligned with USABO & Campbell?</span>
                  <span className="transition-transform duration-300 group-open:rotate-180">
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
                      <path d="M6 9l6 6 6-6"></path>
                    </svg>
                  </span>
                </summary>
                <div className="group-open:animate-fadeIn mt-0 px-6 pb-6 text-slate-400 text-sm leading-relaxed border-t border-slate-800/50 pt-4">
                  Yes. Our question bank is rigorously aligned with{" "}
                  <em>Campbell Biology (12th Ed)</em>,{" "}
                  <em>Raven's Biology of Plants</em>, and past USABO
                  Open/Semifinal exams. We cover all 7 official syllabus areas,
                  from Cell Biology to Biosystematics.
                </div>
              </details>
              {/* Q5: Difficulty Scaling */}
              <details className="group border border-slate-800 rounded-lg bg-[#0F1422] open:border-violet-500/50 transition-all duration-300">
                <summary className="flex cursor-pointer items-center justify-between p-6 font-medium text-slate-200">
                  <span>Is this useful for AP Biology or MCAT?</span>
                  <span className="transition-transform duration-300 group-open:rotate-180">
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
                      <path d="M6 9l6 6 6-6"></path>
                    </svg>
                  </span>
                </summary>
                <div className="group-open:animate-fadeIn mt-0 px-6 pb-6 text-slate-400 text-sm leading-relaxed border-t border-slate-800/50 pt-4">
                  Absolutely. While BioBlitz is optimized for Olympiad-level
                  difficulty, it serves as "weight training" for AP Bio and MCAT
                  aspirants. If you can handle a USABO Blitz, standard exams
                  will feel significantly easier.
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* --- CTA FOOTER --- */}
        <section className="w-full py-10 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 z-0 bg-violet-900/5"></div>
          <div className="max-w-3xl mx-auto bg-[#0F1422] rounded-3xl p-6 border border-white/5 relative z-10 shadow-2xl">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Ready to start your streak?
            </h2>
            <p className="text-slate-300 mb-6 text-lg">
              Join the top students across the nation mastering biology today.
            </p>

            <Link href="/home">
              <button className="bg-white text-black font-bold py-3 px-10 rounded-full hover:bg-slate-200 transition-colors shadow-lg shadow-white/10">
                Get Started
              </button>
            </Link>
          </div>
        </section>

        {/* Simple Footer */}
        <footer className="w-full text-center py-8 text-slate-600 text-sm border-t border-slate-900 bg-[#020204]">
          <div className="flex justify-center gap-6 mb-4">
            <Link
              href="/privacy-policy"
              className="hover:text-violet-400 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms-and-conditions"
              className="hover:text-violet-400 transition-colors"
            >
              Terms and Conditions
            </Link>
            <Link
              href="/about"
              className="hover:text-violet-400 transition-colors"
            >
              About
            </Link>
          </div>
          © {new Date().getFullYear()} BioBlitz. Powered by{" "}
          <Link
            href="https://mitosisphere.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-violet-400 transition-colors font-medium"
          >
            Mitosisphere
          </Link>
          .{" "}
        </footer>
      </main>
    </div>
  );
}
