"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const QUESTIONS = [
  {
    content: "In the absence of oxygen, yeast cells can obtain energy by fermentation, resulting in the production of which of the following sets of molecules?",
    choices: [
      { key: "a", text: "ATP, CO₂, and Acetyl-CoA" },
      { key: "b", text: "ATP, CO₂, and Ethanol" },
      { key: "c", text: "ATP, NADH, and Pyruvate" },
      { key: "d", text: "ATP, Pyruvate, and Acetyl-CoA" },
    ],
    correct: "b",
  },
  {
    content: "Which of the following best describes the role of ATP synthase during oxidative phosphorylation?",
    choices: [
      { key: "a", text: "It pumps protons across the inner mitochondrial membrane" },
      { key: "b", text: "It uses the proton gradient to synthesize ATP from ADP and Pᵢ" },
      { key: "c", text: "It directly oxidizes NADH to produce ATP" },
      { key: "d", text: "It transfers electrons from NADH to oxygen" },
    ],
    correct: "b",
  },
  {
    content: "A cell treated with a drug that inhibits tubulin polymerization would be most directly impaired in which of the following processes?",
    choices: [
      { key: "a", text: "DNA replication" },
      { key: "b", text: "Transcription of mRNA" },
      { key: "c", text: "Chromosomal segregation during mitosis" },
      { key: "d", text: "Translation at the ribosome" },
    ],
    correct: "c",
  },
  {
    content: "Which of the following correctly describes the fate of a protein destined for secretion from a eukaryotic cell?",
    choices: [
      { key: "a", text: "Synthesized by free ribosomes → nucleus → plasma membrane" },
      { key: "b", text: "Synthesized by membrane-bound ribosomes → rough ER → Golgi → secretory vesicle" },
      { key: "c", text: "Synthesized in the mitochondria → smooth ER → plasma membrane" },
      { key: "d", text: "Synthesized in the cytoplasm → lysosome → plasma membrane" },
    ],
    correct: "b",
  },
  {
    content: "In a diploid organism with 2n = 8, how many bivalents are present at the metaphase plate during metaphase I of meiosis?",
    choices: [
      { key: "a", text: "2" },
      { key: "b", text: "4" },
      { key: "c", text: "8" },
      { key: "d", text: "16" },
    ],
    correct: "b",
  },
];

const TOTAL_SECONDS = 20 * 60;

export default function DemoBlitz() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const size = 180;
  const strokeWidth = 15;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - timeLeft / TOTAL_SECONDS);

  const question = QUESTIONS[current];

  return (
    <div className="flex flex-col xl:flex-row gap-8 items-start">
      <div className="flex-1 w-full">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(9,9,11,0.8)] border border-neutral-800 text-neutral-300 font-bold text-[13px] rounded-lg hover:bg-neutral-800 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </button>
          <div className="flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-neutral-500 rounded-full transition-all duration-300"
              style={{ width: `${((current + 1) / QUESTIONS.length) * 100}%` }}
            />
          </div>
          <span className="text-neutral-400 text-[11px] font-[700] tabular-nums shrink-0">
            {current + 1} / {QUESTIONS.length}
          </span>
          <button
            onClick={() => setCurrent((c) => Math.min(QUESTIONS.length - 1, c + 1))}
            disabled={current === QUESTIONS.length - 1}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(9,9,11,0.8)] border border-neutral-800 text-neutral-300 font-bold text-[13px] rounded-lg hover:bg-neutral-800 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Question card */}
        <div className="bg-[rgba(9,9,11,0.8)] border border-neutral-800 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-neutral-400 text-sm">Question {current + 1}</span>
          </div>
          <p className="mb-6 text-[18px] leading-relaxed text-neutral-100 font-medium">
            {question.content}
          </p>
          <div className="flex flex-col space-y-2.5">
            {question.choices.map(({ key, text }) => {
              const selected = answers[current] === key;
              return (
                <button
                  key={key}
                  onClick={() => setAnswers((a) => ({ ...a, [current]: key }))}
                  className={`flex items-center w-full px-5 py-4 rounded-xl border transition-all duration-200 text-left ${
                    selected
                      ? "bg-neutral-600 text-white border-neutral-500 shadow-lg shadow-neutral-900/30"
                      : "bg-[rgba(24,24,27,0.6)] text-neutral-300 border-neutral-700/60 hover:bg-neutral-800 hover:text-white hover:border-neutral-500/50"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-lg mr-4 font-normal text-[12px] uppercase shrink-0 ${
                      selected ? "bg-white/20 text-white" : "bg-neutral-900/30 text-neutral-500"
                    }`}
                  >
                    {key}
                  </span>
                  <span className="text-[16px]">{text}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className="hidden xl:block sticky top-8">
        <div className="flex flex-col items-center">
          <div style={{ width: size, height: size, position: "relative" }}>
            <svg height={size} width={size} className="transform -rotate-90">
              <circle
                stroke="#27272a"
                fill="transparent"
                strokeWidth={strokeWidth}
                r={radius}
                cx={size / 2}
                cy={size / 2}
              />
              <circle
                stroke="#e5e5e5"
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
              <span className="text-4xl font-normal text-white tabular-nums">
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
              <span className="text-neutral-500 text-xs font-medium tracking-wider mt-1">
                Remaining
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
