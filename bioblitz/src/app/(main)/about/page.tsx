import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col font-inter bg-[#020204] text-slate-200 selection:bg-violet-500 selection:text-white overflow-x-hidden">
      {/* --- BACKGROUND EFFECTS --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Subtle Grid - kept for design consistency but lowered opacity */}
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #2e1065 1px, transparent 1px), linear-gradient(to bottom, #2e1065 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[128px] mix-blend-screen animate-pulse duration-[8000ms]"></div>
        <div className="absolute bottom-0 left-20 w-[400px] h-[400px] bg-violet-900/10 rounded-full blur-[128px] mix-blend-screen"></div>
      </div>

      <main className="relative z-10 flex-grow flex flex-col items-center w-full pt-20">
        {/* --- HERO: THE HUMAN HOOK --- */}
        <section className="w-full max-w-3xl px-6 pt-16 pb-20 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-8 leading-tight">
            We are just <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300">
              biology nerds.
            </span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            We aren't a big ed-tech corporation. We are a small team of
            students, researchers, and former competitors who simply loved the
            subject too much to let it be taught poorly.
          </p>
        </section>

        {/* --- THE STORY (Text-Heavy, Honest Narrative) --- */}
        <section className="w-full max-w-4xl px-6 py-12">
          <div className="bg-[#0F1422] border border-slate-800 rounded-2xl p-8 md:p-12 relative overflow-hidden">
            {/* Soft decorative blob */}
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 space-y-6 text-slate-300 leading-relaxed text-lg">
              <h2 className="text-2xl font-bold text-white mb-6">
                The Origin Story
              </h2>
              <p>
                It started in a library at 2 AM. We were surrounded by stacks of
                Campbell Biology, highlighting sentences we had already read
                three times. We realized that despite loving the material, the{" "}
                <em>process</em> of learning it felt isolating and passive.
              </p>
              <p>
                We asked ourselves a simple question:{" "}
                <strong>
                  Why does learning the code of life feel so lifeless?
                </strong>
              </p>
              <p>
                BioBlitz wasn't built to be a "product." It started as a tool we
                built for ourselves to quiz each other before exams. We wanted a
                way to visualize the complex systems we were studying—from the
                Krebs cycle to population genetics—in a way that felt engaging
                and active.
              </p>
              <p>
                What began as a shared Google Doc turned into a script, which
                turned into this platform. Our mission isn't to sell
                subscriptions; it's to build the community we wish we had when
                we were starting out.
              </p>
            </div>
          </div>
        </section>

        {/* --- THE TEAM (People Focused) --- */}
        <section className="w-full max-w-6xl px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Meet the Team
            </h2>
            <p className="text-slate-400">The humans behind the screen.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Person 1 */}
            <div className="bg-[#0F1422] border border-slate-800 rounded-xl p-6 flex flex-col hover:border-violet-500/30 transition-colors group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                  {/* Placeholder for avatar */}
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 group-hover:scale-110 transition-transform duration-500"></div>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Alex Chen</h3>
                  <p className="text-indigo-400 text-sm">Founder & Developer</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Former USABO Finalist who realized he liked coding almost as
                much as botany. He built the first version of BioBlitz in his
                dorm room to procrastinate studying for O-Chem.
              </p>
              <div className="mt-auto pt-4 border-t border-slate-800/50">
                <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                  Favorite Topic:
                </span>
                <span className="text-slate-300 text-sm ml-2">
                  Plant Physiology
                </span>
              </div>
            </div>

            {/* Person 2 */}
            <div className="bg-[#0F1422] border border-slate-800 rounded-xl p-6 flex flex-col hover:border-violet-500/30 transition-colors group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20 group-hover:scale-110 transition-transform duration-500"></div>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">
                    Sarah Jenkins
                  </h3>
                  <p className="text-fuchsia-400 text-sm">Content Lead</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Currently a PhD candidate researching signal transduction. Sarah
                ensures that every question on the platform isn't just "hard,"
                but scientifically accurate and relevant.
              </p>
              <div className="mt-auto pt-4 border-t border-slate-800/50">
                <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                  Favorite Topic:
                </span>
                <span className="text-slate-300 text-sm ml-2">
                  Cell Signaling
                </span>
              </div>
            </div>

            {/* Person 3 */}
            <div className="bg-[#0F1422] border border-slate-800 rounded-xl p-6 flex flex-col hover:border-violet-500/30 transition-colors group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 group-hover:scale-110 transition-transform duration-500"></div>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">David Okonjo</h3>
                  <p className="text-blue-400 text-sm">Community</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                A medical student who swears he wouldn't have passed the MCAT
                without active recall. David manages our Discord and helps
                students find study partners.
              </p>
              <div className="mt-auto pt-4 border-t border-slate-800/50">
                <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                  Favorite Topic:
                </span>
                <span className="text-slate-300 text-sm ml-2">Immunology</span>
              </div>
            </div>
          </div>
        </section>

        {/* --- ETHOS / TRANSPARENCY --- */}
        <section className="w-full max-w-4xl px-6 py-20 border-t border-slate-900/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">
                Why we keep it affordable
              </h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                We know what it's like to be a high school student with no
                budget. Existing prep courses cost thousands of dollars,
                effectively gatekeeping top-tier science education. We are
                committed to keeping our core features free or extremely
                low-cost because talent is distributed equally, but opportunity
                is not.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-4">
                Our promise to you
              </h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                We are constantly learning, just like you. If you find a mistake
                in a question, or if you have an idea for a feature, email us
                directly. We read every single message. We are building this{" "}
                <em>with</em> you, not just for you.
              </p>
            </div>
          </div>
        </section>

        {/* --- SIMPLE CONTACT CTA --- */}
        <section className="w-full py-20 px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-6">
            Want to talk biology?
          </h2>
          <div className="flex justify-center gap-4">
            <a
              href="mailto:hello@bioblitz.com"
              className="text-slate-300 hover:text-white underline underline-offset-4 decoration-slate-700 hover:decoration-white transition-all"
            >
              Email the founders
            </a>
            <span className="text-slate-600">•</span>
            <Link
              href="/discord"
              className="text-slate-300 hover:text-white underline underline-offset-4 decoration-slate-700 hover:decoration-white transition-all"
            >
              Join the Discord
            </Link>
          </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="w-full text-center py-8 text-slate-600 text-sm border-t border-slate-900 bg-[#020204]">
          <div className="flex justify-center gap-6 mb-4">
            <Link
              href="/privacy-policy"
              className="hover:text-violet-400 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms-and-service"
              className="hover:text-violet-400 transition-colors"
            >
              Terms and Conditions
            </Link>
            <Link href="/about" className="text-violet-400 transition-colors">
              About
            </Link>
            <Link
              href="/home"
              className="hover:text-violet-400 transition-colors"
            >
              Game
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
          .
        </footer>
      </main>
    </div>
  );
}
