"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DM_Sans } from "next/font/google";
import { Radio } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import JoinRoomCard from "@/components/features/live/JoinRoomCard";
import HostSetPicker from "@/components/features/live/HostSetPicker";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

function LiveLanding() {
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const initialSetId = searchParams.get("set") || undefined;

  return (
    <div className={`${dmSans.className} min-h-screen bg-neutral-900 text-white pt-24`}>
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Radio className="w-6 h-6 text-neutral-500" />
            <h1 className="text-[32px] font-[900] text-white" style={{ letterSpacing: "-0.02em" }}>
              Live Blitz
            </h1>
          </div>
          <div className="h-[3px] w-20 bg-neutral-600 rounded-full" />
          <p className="text-neutral-500 text-[15px] mt-4 max-w-2xl">
            Run a blitz for a room. The host controls the pace, everyone answers
            the same question at the same moment, and the standings update after
            every reveal. Every run counts as a normal ranked attempt, so Elo and
            stats move exactly as they would solo.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 items-start">
          <JoinRoomCard signedIn={isAuthenticated} />
          <HostSetPicker signedIn={isAuthenticated} initialSetId={initialSetId} />
        </div>
      </div>
    </div>
  );
}

export default function LivePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
          <div className="w-10 h-10 border-[3px] border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
        </div>
      }
    >
      <LiveLanding />
    </Suspense>
  );
}
