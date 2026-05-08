"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type ExplorerItem = {
  key: string;
  title: string;
  eyebrow: string;
  description: string;
  bullets: string[];
  image: string;
};

const EXPLORER_ITEMS: ExplorerItem[] = [
  {
    key: "blitzes",
    title: "Practice Blitzes",
    eyebrow: "Study with purpose",
    description:
      "The home feed is a centralized place to take biology tests created by the community and by the writers behind Mitosisphere.",
    bullets: [
      "Practice USABO and MCAT-style biology questions in one place.",
      "See how each Blitz is rated so you can pick the right challenge.",
      "Rate the quality after you finish to help others find strong sets.",
    ],
    image: "/images/about/home.png",
  },
  {
    key: "compete",
    title: "Compete and climb",
    eyebrow: "Ranked play",
    description:
      "Everyone starts at 500 rating, then moves up or down as they perform on Blitzes and compare themselves on the leaderboard.",
    bullets: [
      "Climb through tiers from bronze to grandmaster.",
      "Use the leaderboard to see where you stack up.",
      "Compete first, then refine your skill with more practice.",
    ],
    image: "/images/about/leaderboard.png",
  },
  {
    key: "potd",
    title: "Daily Problem of the Day",
    eyebrow: "Build streaks",
    description:
      "A fresh problem drops every day, with topic filters and a streak system that rewards consistent practice.",
    bullets: [
      "Keep your streak alive by solving the daily problem.",
      "Filter by topic to focus on your weak spots.",
      "Use the archive whenever you want more repetition.",
    ],
    image: "/images/about/potd.png",
  },
  {
    key: "create",
    title: "Create your own Blitzes",
    eyebrow: "Make content",
    description:
      "You can publish your own Blitzes, set the time limit, upload a banner, and build questions in the editor.",
    bullets: [
      "Turn your own practice set into something others can play.",
      "Choose a banner and structure the contest however you want.",
      "Contribute to the platform instead of only consuming it.",
    ],
    image: "/images/about/create.png",
  },
  {
    key: "progress",
    title: "Track your progress",
    eyebrow: "See your growth",
    description:
      "Your profile shows your played Blitzes, performance history, and Elo graph so you can measure improvement over time.",
    bullets: [
      "Review the contests you have already taken.",
      "Use your Elo chart to spot growth trends.",
      "Check your profile stats to see how your training is going.",
    ],
    image: "/images/about/profile.png",
  },
];

export default function LandingPlatformExplorer() {
  const [activeKey, setActiveKey] = useState(EXPLORER_ITEMS[0].key);

  const activeItem = useMemo(
    () => EXPLORER_ITEMS.find((item) => item.key === activeKey) ?? EXPLORER_ITEMS[0],
    [activeKey],
  );

  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-neutral-800 bg-neutral-950/70 p-5 sm:p-6 lg:p-8 shadow-2xl shadow-black/20">
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Learn the platform</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-50 sm:text-3xl">
              Tap through the parts that make BioBlitz work.
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400 sm:text-base">
              This pulls the core ideas from the About section into a compact tour that stays readable on mobile and still feels spacious on desktop.
            </p>
          </div>
          <Link
            href="/about"
            className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-700 hover:bg-neutral-800"
          >
            Read the full about page
          </Link>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
          {EXPLORER_ITEMS.map((item) => {
            const selected = item.key === activeKey;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveKey(item.key)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-all ${
                  selected
                    ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-200"
                    : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                }`}
                aria-pressed={selected}
              >
                {item.title}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="rounded-[1.5rem] border border-neutral-800 bg-neutral-900/60 p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">{activeItem.eyebrow}</p>
            <h3 className="mt-3 text-2xl font-semibold text-neutral-50 sm:text-3xl">{activeItem.title}</h3>
            <p className="mt-3 text-sm leading-6 text-neutral-300 sm:text-base">{activeItem.description}</p>

            <ul className="mt-5 space-y-3 text-sm leading-6 text-neutral-400 sm:text-[15px]">
              {activeItem.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/50 px-4 py-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-yellow-400" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-neutral-800 bg-neutral-900/50">
            <div className="border-b border-neutral-800 bg-neutral-950 px-4 py-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              {activeItem.title}
            </div>
            <div className="relative aspect-[4/5] min-h-[18rem] w-full bg-neutral-950 sm:aspect-[16/10] lg:aspect-auto lg:min-h-full">
              <img
                src={activeItem.image}
                alt={activeItem.title}
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/20 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}