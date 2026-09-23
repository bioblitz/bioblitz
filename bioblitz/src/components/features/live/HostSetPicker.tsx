"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { ChevronLeft, Loader2, Radio, Search } from "lucide-react";
import {
  DEFAULT_PACING,
  LivePacing,
  MAX_LIVE_QUESTIONS,
  MAX_PHASE_SECONDS,
  MIN_PHASE_SECONDS,
  MIN_SECONDS_PER_QUESTION,
  canHostSet,
  maxSecondsPerQuestion,
  validatePacing,
} from "@/lib/liveGame";
import { liveFetch } from "@/lib/liveClient";

type HostableSet = {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  questionCount: number;
  timeLimitSeconds: number;
};

const SET_FETCH_LIMIT = 120;

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes > 0 && seconds > 0) return `${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold text-neutral-300">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-[15px] text-white tabular-nums focus:outline-none focus:border-neutral-600 transition-colors disabled:opacity-40"
      />
      <span className="mt-1 block text-[11px] text-neutral-600">{hint}</span>
    </label>
  );
}

/**
 * Host flow: pick a blitz, then set the pace. Per-question time is capped so
 * that time-per-question x questions never exceeds the set's own time limit —
 * a live round can't hand out more time than the blitz itself allows.
 */
export default function HostSetPicker({
  signedIn,
  initialSetId,
}: {
  signedIn: boolean;
  initialSetId?: string;
}) {
  const router = useRouter();

  const [sets, setSets] = useState<HostableSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialSetId ?? null);
  const [pacing, setPacing] = useState<LivePacing>(DEFAULT_PACING);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(firestore, "sets"),
            orderBy("trendingScore", "desc"),
            fbLimit(SET_FETCH_LIMIT),
          ),
        );
        const rows: HostableSet[] = snap.docs
          .filter((doc) => {
            const data = doc.data();
            return !data.hidden && data.status !== "incomplete";
          })
          .map((doc) => {
            const data = doc.data();
            const questionCount = Array.isArray(data.questions)
              ? data.questions.length
              : parseInt(data.number_of_questions || "0", 10) ||
                Number(data.questionCount) ||
                0;
            return {
              id: doc.id,
              title: String(data.title || "Untitled Blitz"),
              topic: String(data.topic || "Other"),
              difficulty: String(data.difficulty || "Medium"),
              questionCount,
              timeLimitSeconds: parseInt(data.timeLimit || "0", 10) || 0,
            };
          })
          .filter((row) => canHostSet(row.questionCount, row.timeLimitSeconds));

        if (!cancelled) setSets(rows);
      } catch (err) {
        console.error("Could not load hostable blitzes:", err);
        if (!cancelled) setError("Could not load blitzes to host.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => sets.find((set) => set.id === selectedId) || null,
    [sets, selectedId],
  );

  const perQuestionCap = selected
    ? maxSecondsPerQuestion(selected.questionCount, selected.timeLimitSeconds)
    : MAX_PHASE_SECONDS;

  // Snap the default pace down to whatever the chosen set has room for.
  useEffect(() => {
    if (!selected) return;
    setPacing((prev) => ({
      ...prev,
      secondsPerQuestion: Math.min(
        Math.max(prev.secondsPerQuestion, MIN_SECONDS_PER_QUESTION),
        perQuestionCap,
      ),
    }));
  }, [selectedId, perQuestionCap, selected]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return sets;
    return sets.filter(
      (set) =>
        set.title.toLowerCase().includes(needle) ||
        set.topic.toLowerCase().includes(needle),
    );
  }, [sets, search]);

  const errors = selected
    ? validatePacing(pacing, selected.questionCount, selected.timeLimitSeconds)
    : [];

  const createRoom = async () => {
    if (!selected || creating) return;
    if (!signedIn) {
      router.push("/auth");
      return;
    }
    if (errors.length > 0) {
      setError(errors[0]);
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const data = await liveFetch<{ liveGameId: string }>("/api/live", {
        body: { gameId: selected.id, pacing },
      });
      router.push(`/live/host/${data.liveGameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the room.");
      setCreating(false);
    }
  };

  return (
    <div className="bg-[rgba(9,9,11,0.8)] border border-neutral-800 rounded-2xl p-6 md:p-8">
      <h2 className="text-[20px] font-[900] text-white mb-1" style={{ letterSpacing: "-0.02em" }}>
        Host a room
      </h2>
      <p className="text-neutral-500 text-[14px] mb-6">
        Pick a blitz, set the pace, and read out the code.
      </p>

      {!selected ? (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search blitzes"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-[14px] text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-neutral-500 text-[14px]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading blitzes...
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-neutral-600 text-[14px]">
              No blitzes match. Live rounds need a set with at most{" "}
              {MAX_LIVE_QUESTIONS} questions and enough time for{" "}
              {MIN_SECONDS_PER_QUESTION}s a question.
            </p>
          ) : (
            <ul className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {filtered.map((set) => (
                <li key={set.id}>
                  <button
                    onClick={() => setSelectedId(set.id)}
                    className="w-full text-left px-4 py-3 rounded-xl bg-[rgba(24,24,27,0.6)] border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-800/60 transition-all"
                  >
                    <p className="text-[15px] font-bold text-white truncate">
                      {set.title}
                    </p>
                    <p className="text-[12px] text-neutral-500 mt-0.5">
                      {set.questionCount} questions · {set.topic} ·{" "}
                      {formatSeconds(set.timeLimitSeconds)} limit
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <button
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-1.5 text-[13px] font-bold text-neutral-400 hover:text-white transition-colors mb-4"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Choose a different blitz
          </button>

          <div className="bg-[rgba(24,24,27,0.6)] border border-neutral-800 rounded-xl px-4 py-3 mb-5">
            <p className="text-[16px] font-bold text-white truncate">
              {selected.title}
            </p>
            <p className="text-[12px] text-neutral-500 mt-0.5">
              {selected.questionCount} questions ·{" "}
              {formatSeconds(selected.timeLimitSeconds)} limit · up to{" "}
              {perQuestionCap}s per question
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Time per question"
              hint={`${MIN_SECONDS_PER_QUESTION}-${perQuestionCap} seconds`}
              value={pacing.secondsPerQuestion}
              min={MIN_SECONDS_PER_QUESTION}
              max={perQuestionCap}
              onChange={(next) =>
                setPacing((prev) => ({ ...prev, secondsPerQuestion: next }))
              }
            />
            <NumberField
              label="Answer reveal"
              hint="How long the green/red screen stays up"
              value={pacing.revealSeconds}
              min={MIN_PHASE_SECONDS}
              max={MAX_PHASE_SECONDS}
              onChange={(next) =>
                setPacing((prev) => ({ ...prev, revealSeconds: next }))
              }
            />
            <NumberField
              label="Leaderboard"
              hint="Standings between questions"
              value={pacing.leaderboardSeconds}
              min={MIN_PHASE_SECONDS}
              max={MAX_PHASE_SECONDS}
              onChange={(next) =>
                setPacing((prev) => ({ ...prev, leaderboardSeconds: next }))
              }
            />
            <NumberField
              label="Reading time"
              hint="Question up, choices hidden"
              value={pacing.readSeconds}
              min={0}
              max={MAX_PHASE_SECONDS}
              onChange={(next) =>
                setPacing((prev) => ({ ...prev, readSeconds: next }))
              }
            />
          </div>

          <div className="mt-5 flex items-center justify-between text-[12px] text-neutral-500 border-t border-neutral-800 pt-4">
            <span>Answering time across the blitz</span>
            <span className="tabular-nums font-bold text-neutral-300">
              {formatSeconds(pacing.secondsPerQuestion * selected.questionCount)} /{" "}
              {formatSeconds(selected.timeLimitSeconds)}
            </span>
          </div>

          {(error || errors.length > 0) && (
            <p className="mt-3 text-[13px] text-red-400">{error || errors[0]}</p>
          )}

          <button
            onClick={createRoom}
            disabled={creating || errors.length > 0}
            className="mt-5 w-full py-4 rounded-xl bg-white text-black font-bold text-[16px] hover:bg-neutral-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Opening room...
              </>
            ) : (
              <>
                <Radio className="w-4 h-4" /> Open the room
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
