"use client";

import { useState } from "react";
import {
  isUsernameUnique,
  updateUsername as updateUsernameInDb,
  updateMarketingPreference,
} from "@/lib/user";
import { trackAnalyticsEvent } from "@/lib/analytics-client";
import { applyUsernamePolicy } from "@/lib/usernamePolicy";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";

const INTRO_STEPS = [
  {
    title: "Welcome to BioBlitz!",
    subtitle: "The competitive biology platform.",
    content: (
      <p className="text-zinc-400 text-sm leading-relaxed">
        BioBlitz is a timed, ranked quiz platform built for biology competitors.
        Work through question sets, climb the leaderboard, and sharpen your
        skills, all in one place.
      </p>
    ),
  },
  {
    title: "How Blitzes Work",
    subtitle: "Race the clock, answer correctly.",
    content: (
      <p className="text-zinc-400 text-sm leading-relaxed">
        Each Blitz is a timed set of biology questions. Your first attempt on
        any set is <span className="text-white font-medium">Ranked</span>, as it
        counts toward your Elo rating. After that, replay in Practice Mode as
        many times as you like.
      </p>
    ),
  },
  {
    title: "Earn Your Ranking",
    subtitle: "Elo-based competitive ladder.",
    content: (
      <p className="text-zinc-400 text-sm leading-relaxed">
        Every ranked attempt adjusts your{" "}
        <span className="text-white font-medium">Elo</span> score based on
        performance. Track your progress on the Global Leaderboard and see how
        you stack up against other competitors.
      </p>
    ),
  },
];

const TOTAL_STEPS = INTRO_STEPS.length + 1;

export function UsernamePopup() {
  const { user, updateUsername } = useAuth();
  const [step, setStep] = useState(0);
  const [username, setUsernameState] = useState("");
  const [wantsMarketing, setWantsMarketing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const isUsernameStep = step === TOTAL_STEPS - 1;

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setError(null);

    const { value: trimmed, censored } = await applyUsernamePolicy(username);
    if (censored) {
      setError("Inappropriate username, try again.");
      return;
    }
    if (trimmed !== username.trim().toLowerCase().replace(/\s+/g, "_")) {
      setUsernameState(trimmed);
    }

    if (trimmed.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      setError("Only letters, numbers, and underscores allowed.");
      return;
    }

    setLoading(true);
    try {
      const unique = await isUsernameUnique(trimmed);
      if (!unique) {
        setError("That username is already taken.");
        setLoading(false);
        return;
      }

      await Promise.all([
        updateUsernameInDb(user.uid, trimmed),
        updateMarketingPreference(user.uid, wantsMarketing),
      ]);

      void trackAnalyticsEvent({
        event: "onboarding_username_completed",
        source: "username_popup",
        page: "onboarding",
        metadata: {
          wantsMarketing,
        },
      });

      updateUsername(trimmed);
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) return null;

  const introStep = INTRO_STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/85 backdrop-blur-md px-4">
      <div
        className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "88vh" }}
      >
        <div className="h-1 w-full bg-zinc-800">
          <div
            className="h-full bg-yellow-300 transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        <div className="overflow-y-auto flex-1 px-8 py-10">
          {!isUsernameStep ? (
            <div className="flex flex-col items-center text-center gap-5">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {introStep.title}
                </h2>
                <p className="text-sm text-zinc-500">{introStep.subtitle}</p>
              </div>
              <div className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                {introStep.content}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-5">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  Pick your username
                </h2>
                <p className="text-sm text-zinc-500">
                  This is how you&apos;ll appear on the leaderboard.
                </p>
              </div>

              <div className="w-full text-left space-y-3">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsernameState(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="ramiz_elias"
                  maxLength={24}
                  className="w-full bg-zinc-900 border border-neutral-300 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-neutral-200 hover:border-neutral-200 transition-all text-sm"
                />
                {error && (
                  <p className="text-red-400 text-xs font-medium">{error}</p>
                )}
                <p className="text-zinc-600 text-xs">
                  3-24 characters, letters, numbers, underscores only
                </p>

                <div
                  onClick={() => setWantsMarketing(!wantsMarketing)}
                  className={`mt-4 p-4 rounded bg-neutral-900 transition-all cursor-pointer flex items-center gap-4 ${
                    wantsMarketing
                      ? "bg-neutral-500/10 border-neutral-500/50"
                      : "bg-neutral-900 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                      wantsMarketing
                        ? "bg-neutral-400 border-yellow-200"
                        : "bg-neutral-800 border-yellow-300"
                    }`}
                  >
                    {wantsMarketing && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center bg-neutral-800 gap-2 mb-0.5">
                      <span
                        className={`text-sm font-bold ${wantsMarketing ? "text-white" : "text-neutral-300"}`}
                      >
                        Stay in the loop!
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Can we send you occassional emails about new competitions,
                      features, or updates? No spam and you may unsubscribe
                      anytime.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-8 pb-8 pt-4 flex items-center justify-between gap-4 border-t border-zinc-800/50">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-4 h-2 bg-neutral-500"
                    : i < step
                      ? "w-2 h-2 bg-zinc-600"
                      : "w-2 h-2 bg-zinc-800"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {!isUsernameStep ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold bg-neutral-600 hover:bg-neutral-500 text-white transition-all"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || username.trim().length < 3}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold bg-neutral-600 hover:bg-neutral-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="animate-pulse">Saving…</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Finish
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
