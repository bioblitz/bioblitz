"use client";
export default function About() {
  return (
    <div className="min-h-screen bg-neutral-900">
      <main className="max-w-7xl mx-auto pr-4 sm:pr-6 lg:pr-8 pl-0 sm:pl-12 lg:pl-33.5 pt-24 pb-12">
        <div className="flex items-start gap-10">

          <div className="max-w-md">
            <h1 className="font-semibold mb-6 text-3xl">BioBlitz</h1>
            <h2 className="text-neutral-300 mb-3">Introduction</h2>
            <p className="text-neutral-400 mb-6">
              First of all, you're probably wondering what BioBlitz is. It is a platform that hosts public biology tests, called
              "blitzes", to make biology education more accessible. Studying for the USA Biology Olympiad (USABO) or the MCAT exam takes
              a tremendous amount of effort and practice is needed to well. Most people spend hours reading Campbell's Biology to prepare for the opens,
              but are limited by the few open and semifinal exams that are available. Created by USABO participants, the platform provides a centralized place to
              take practice tests, as well as create questions for others.
            </p>
            <h2 className="text-neutral-300 mb-3">Home</h2>
            <p className="text-neutral-400">
              First of all, you're probably wondering what BioBlitz is. It is a platform that hosts public biology tests, called
              "blitzes", to make biology education more accessible. Studying for the USA Biology Olympiad (USABO) or the MCAT exam takes
              a tremendous amount of effort and practice is needed to well. Most people spend hours reading Campbell's Biology to prepare for the opens,
              but are limited by the few open and semifinal exams that are available. Created by USABO participants, the platform provides a centralized place to
              take practice tests, as well as create questions for others.
            </p>

          </div>

          <div className="flex-1 mt-30 -mr-20 overflow-hidden">
            <img src="images/about/computer.png" className="w-full" />
          </div>

        </div>
      </main>
    </div>
  );
}