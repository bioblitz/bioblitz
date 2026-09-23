"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { JOIN_CODE_LENGTH, normalizeJoinCode } from "@/lib/liveGame";
import { liveFetch } from "@/lib/liveClient";

/** Code entry for players. The host reads the code out; this takes it back. */
export default function JoinRoomCard({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = code.length === JOIN_CODE_LENGTH;

  const join = async () => {
    if (!ready || joining) return;
    if (!signedIn) {
      router.push("/auth");
      return;
    }
    setJoining(true);
    setError(null);
    try {
      const data = await liveFetch<{ liveGameId: string }>("/api/live/join", {
        body: { code },
      });
      router.push(`/live/play/${data.liveGameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join.");
      setJoining(false);
    }
  };

  return (
    <div className="bg-[rgba(9,9,11,0.8)] border border-neutral-800 rounded-2xl p-6 md:p-8">
      <h2 className="text-[20px] font-[900] text-white mb-1" style={{ letterSpacing: "-0.02em" }}>
        Join a room
      </h2>
      <p className="text-neutral-500 text-[14px] mb-6">
        Enter the {JOIN_CODE_LENGTH}-character code from the host&apos;s screen.
      </p>

      <input
        value={code}
        onChange={(e) => {
          setCode(normalizeJoinCode(e.target.value));
          setError(null);
        }}
        onKeyDown={(e) => e.key === "Enter" && join()}
        placeholder="ABC123"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        aria-label="Join code"
        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-5 py-5 text-center text-[32px] md:text-[40px] font-[900] text-white tracking-[0.35em] placeholder:text-neutral-800 focus:outline-none focus:border-neutral-600 transition-colors uppercase"
      />

      {error && (
        <p className="mt-3 text-[13px] text-red-400 text-center">{error}</p>
      )}

      <button
        onClick={join}
        disabled={!ready || joining}
        className="mt-5 w-full py-4 rounded-xl bg-white text-black font-bold text-[16px] hover:bg-neutral-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {joining ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Joining...
          </>
        ) : (
          <>
            <LogIn className="w-4 h-4" /> Join
          </>
        )}
      </button>

      <p className="mt-4 text-[12px] text-neutral-600 leading-relaxed">
        A blitz you have never played counts as a normal ranked attempt. If you
        have played it before you can still join and answer along, but as a
        ghost: no rank, no leaderboard, no change to your rating.
      </p>
    </div>
  );
}
