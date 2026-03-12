"use client";

import { useEffect, useRef, useState } from "react";

const SIZE = 180;
const STROKE = 15;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TIME_TOTAL = 43;
const TIME_MAX = 60;

const options = [
  { key: "A", label: "ATP, CO2, and Acetyl-CoA" },
  { key: "B", label: "ATP, CO2, and Ethanol" },
  { key: "C", label: "ATP, NADH, and Pyruvate" },
  { key: "D", label: "ATP, Pyruvate, and Acetyl-CoA" },
];

export default function DemoQuestion() {
  const [selected, setSelected] = useState("B");
  const [timeLeft, setTimeLeft] = useState(TIME_TOTAL);
  const [started, setStarted] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [started]);

  const dashOffset = CIRCUMFERENCE * (1 - timeLeft / TIME_MAX);
  const seconds = String(timeLeft).padStart(2, "0");
  const isUrgent = timeLeft <= 10;

  return (
    <div ref={sectionRef} className="flex flex-col xl:flex-row gap-8 items-start">
      {/* Question Card */}
      <div className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-violet-500/10 text-violet-400 text-sm font-bold px-3 py-1 rounded-full border border-violet-500/20">
            Question 4
          </span>
        </div>

        <p className="mb-8 text-lg md:text-xl leading-relaxed text-zinc-100 font-medium">
          In the absence of oxygen, yeast cells can obtain energy by
          fermentation, resulting in the production of which of the following
          sets of molecules?
        </p>

        <div className="flex flex-col space-y-3">
          {options.map(({ key, label }) => {
            const isSelected = selected === key;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`flex items-center w-full px-5 py-4 rounded-xl text-left border-2 transition-all duration-150 cursor-pointer
                  ${
                    isSelected
                      ? "bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-900/50 scale-[1.01]"
                      : "bg-zinc-800/50 text-zinc-300 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800"
                  }`}
              >
                <span
                  className={`flex items-center justify-center w-8 h-8 rounded-lg mr-4 font-bold text-sm transition-colors
                    ${isSelected ? "bg-white/20 text-white" : "bg-black/20 text-zinc-400"}`}
                >
                  {key}
                </span>
                <span className="text-lg">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Circular Timer */}
      <div className="hidden xl:block sticky top-8">
        <div className="relative flex flex-col items-center">
          <div style={{ width: SIZE, height: SIZE, position: "relative" }}>
            <svg height={SIZE} width={SIZE} className="transform -rotate-90">
              <circle
                stroke="#27272a"
                fill="transparent"
                strokeWidth={STROKE}
                r={RADIUS}
                cx={SIZE / 2}
                cy={SIZE / 2}
              />
              <circle
                stroke={isUrgent ? "#ef4444" : "#8b5cf6"}
                fill="transparent"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                r={RADIUS}
                cx={SIZE / 2}
                cy={SIZE / 2}
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-4xl font-bold tabular-nums transition-colors ${
                  isUrgent ? "text-red-400" : "text-white"
                }`}
              >
                00:{seconds}
              </span>
              <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider mt-1">
                Remaining
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
