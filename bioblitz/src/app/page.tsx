import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import DemoModal from "@/components/DemoModal"; // Update path as needed

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
        <section className="w-full max-w-6xl px-6 pt-20 pb-10 text-center flex flex-col items-center">
          <h1 className="text-5xl md:text-8xl font-bold text-white tracking-tight mb-8 drop-shadow-2xl leading-[0.9]">
            Biology is now <br />
            <span
              className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-violet-300
"
            >
              Competitive.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
            Stop memorizing textbooks alone. Join the competitive platform for{" "}
            <span className="text-slate-200 font-medium">USABO</span> and{" "}
            <span className="text-slate-200 font-medium">MCAT</span> aspirants.
            Grind problems, raise your Elo, and dominate the leaderboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-10">
            <Link href="/home">
              <button className="w-full sm:w-auto bg-violet-500 text-white font-bold py-4 px-10 rounded-lg hover:bg-violet-500 hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.6)] transition-all duration-200">
                Start Competing
              </button>
            </Link>
            <DemoModal videoId="dQw4w9WgXcQ" />
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-800 border-y border-slate-800 bg-[#020204]/50 backdrop-blur w-full max-w-4xl">
            <div className="py-6 px-4">
              <div className="text-3xl font-mono font-bold text-white">
                12k+
              </div>
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold mt-1">
                Problems
              </div>
            </div>
            <div className="py-6 px-4">
              <div className="text-3xl font-mono font-bold text-violet-400">
                ~1400
              </div>
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold mt-1">
                Avg Rating
              </div>
            </div>
            <div className="py-6 px-4">
              <div className="text-3xl font-mono font-bold text-white">20+</div>
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold mt-1">
                Countries
              </div>
            </div>
            <div className="py-6 px-4">
              <div className="text-3xl font-mono font-bold text-fuchsia-400">
                Top 1%
              </div>
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold mt-1">
                Success Rate
              </div>
            </div>
          </div>
        </section>

        {/* --- INTERFACE PREVIEW (THE ARENA) --- */}
        <section className="w-full py-10 px-6 relative bg-[#020204]">
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
        <section
          id="curriculum"
          className="w-full bg-[#050505] py-24 border-t border-slate-900"
        >
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">
                Complete USABO Coverage
              </h2>
              <p className="text-slate-400">
                Aligned with the 7 official USABO content areas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:auto-rows-[250px]">
              {/* Card: Animal Anatomy (25%) - Large Priority */}
              <div className="md:col-span-2 md:row-span-2 relative group overflow-hidden rounded-2xl bg-[#0F1422] border border-slate-800 hover:border-violet-500/50 transition-all p-8 flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-32 bg-violet-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="inline-block px-3 py-1 bg-violet-900/30 text-violet-300 rounded-full text-xs font-bold mb-4 border border-violet-500/30">
                    25% of Exam
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-2">
                    Animal Anatomy & Physiology
                  </h3>
                  <p className="text-slate-400 leading-relaxed max-w-sm">
                    Comprehensive coverage of digestion, respiration,
                    circulation, excretion, regulation, and immunity.
                  </p>
                </div>
                {/* Visual bar graph style decoration */}
                <div className="flex gap-2 items-end h-24 relative z-10 opacity-50">
                  <div className="w-4 bg-violet-500 h-[40%] rounded-t-sm"></div>
                  <div className="w-4 bg-violet-500 h-[70%] rounded-t-sm"></div>
                  <div className="w-4 bg-white h-[90%] rounded-t-sm"></div>
                  <div className="w-4 bg-violet-500 h-[60%] rounded-t-sm"></div>
                  <div className="w-4 bg-violet-500 h-[30%] rounded-t-sm"></div>
                </div>
              </div>

              {/* Card: Cell Bio (20%) */}
              <div className="md:col-span-1 md:row-span-2 relative group overflow-hidden rounded-2xl bg-[#0F1422] border border-slate-800 hover:border-fuchsia-500/50 transition-all p-6 flex flex-col">
                <div className="w-10 h-10 bg-fuchsia-900/20 rounded text-fuchsia-400 flex items-center justify-center mb-6">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Cell Biology
                </h3>
                <div className="text-xs text-fuchsia-400 font-mono mb-4">
                  20% Weight
                </div>
                <p className="text-sm text-slate-400 mt-auto">
                  Organelle structure and function, membrane transport, and cell
                  cycle regulation.
                </p>
              </div>

              {/* Card: Genetics (20%) */}
              <div className="md:col-span-1 md:row-span-1 relative group overflow-hidden rounded-2xl bg-[#0F1422] border border-slate-800 hover:border-blue-500/50 transition-all p-6">
                <h3 className="text-lg font-bold text-white">
                  Genetics & Evolution
                </h3>
                <div className="w-full bg-slate-800 h-1 mt-4 rounded-full overflow-hidden">
                  <div className="bg-blue-500 w-[80%] h-full"></div>
                </div>
                <div className="text-[10px] text-right text-slate-500 mt-1">
                  20% Weight
                </div>
              </div>

              {/* Card: Plant Anatomy (15%) */}
              <div className="md:col-span-1 md:row-span-1 relative group overflow-hidden rounded-2xl bg-[#0F1422] border border-slate-800 hover:border-green-500/50 transition-all p-6">
                <h3 className="text-lg font-bold text-white">Plant Anatomy</h3>
                <div className="w-full bg-slate-800 h-1 mt-4 rounded-full overflow-hidden">
                  <div className="bg-green-500 w-[60%] h-full"></div>
                </div>
                <div className="text-[10px] text-right text-slate-500 mt-1">
                  15% Weight
                </div>
              </div>

              {/* Card: Ecology & Ethology (10%) */}
              <div className="md:col-span-2 md:row-span-1 relative group overflow-hidden rounded-2xl bg-[#0F1422] border border-slate-800 hover:border-orange-500/50 transition-all p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Ecology, Ethology & Biosystematics
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Population dynamics, communities, and animal behavior.
                  </p>
                </div>
                <div className="text-2xl font-bold text-orange-500">~20%</div>
              </div>
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
              <details className="group border border-slate-800 rounded-lg bg-[#0F1422] open:border-violet-500/50 transition-all">
                <summary className="flex cursor-pointer items-center justify-between p-6 font-medium text-slate-200">
                  <span>Is this suitable for AP Biology?</span>
                  <span className="transition group-open:rotate-180">
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
                <div className="group-open:animate-fadeIn mt-0 px-6 pb-6 text-slate-400 text-sm leading-relaxed">
                  Yes. While BioBlitz is optimized for USABO and MCAT, the
                  content covers 100% of the AP Biology curriculum but at a
                  higher depth.
                </div>
              </details>
              <details className="group border border-slate-800 rounded-lg bg-[#0F1422] open:border-violet-500/50 transition-all">
                <summary className="flex cursor-pointer items-center justify-between p-6 font-medium text-slate-200">
                  <span>How does the Elo rating work?</span>
                  <span className="transition group-open:rotate-180">
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
                <div className="group-open:animate-fadeIn mt-0 px-6 pb-6 text-slate-400 text-sm leading-relaxed">
                  Just like in chess. You gain points for solving problems
                  correctly and lose points for incorrect attempts. Harder
                  problems yield more points.
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* --- CTA FOOTER --- */}
        <section className="w-full py-20 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 z-0 bg-violet-900/5"></div>
          <div className="max-w-3xl mx-auto bg-[#0F1422] rounded-3xl p-12 border border-white/5 relative z-10 shadow-2xl">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Ready to start your streak?
            </h2>
            <p className="text-slate-300 mb-8 text-lg">
              Join thousands of students mastering biology today.
            </p>

            <Link href="/home">
              <button className="bg-white text-black font-bold py-3 px-10 rounded-full hover:bg-slate-200 transition-colors shadow-lg shadow-white/10">
                Get Started Free
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
