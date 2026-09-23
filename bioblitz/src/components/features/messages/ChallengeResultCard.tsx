"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Challenge } from "@/lib/challenges";
import { getTopicShortLabel } from "@/lib/utils";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";

interface ChallengeResultCardProps {
  challenge: Challenge;
  currentUserId: string;
}

function getTopicChipBg(topic?: string): string {
  switch (topic) {
    case "Anatomy & Physiology":
    case "Anat & Phys":
      return "bg-blue-400";
    case "Cell Biology":
    case "Cell Bio":
      return "bg-cyan-600";
    case "Plant Biology":
    case "Plant Bio":
      return "bg-green-600";
    case "Genetics & Evolution":
    case "Gen & Evo":
    case "Genetics":
      return "bg-lime-600";
    case "Biosystematics":
    case "Biosys":
      return "bg-indigo-600";
    case "Ecology":
      return "bg-emerald-600";
    case "Ethology":
      return "bg-orange-600";
    case "Multiple":
      return "bg-yellow-600";
    default:
      return "bg-neutral-600";
  }
}

function getTopicAccentText(topic?: string): string {
  switch (topic) {
    case "Anatomy & Physiology":
    case "Anat & Phys":
      return "text-blue-300";
    case "Cell Biology":
    case "Cell Bio":
      return "text-cyan-300";
    case "Plant Biology":
    case "Plant Bio":
      return "text-green-300";
    case "Genetics & Evolution":
    case "Gen & Evo":
    case "Genetics":
      return "text-lime-300";
    case "Biosystematics":
    case "Biosys":
      return "text-indigo-300";
    case "Ecology":
      return "text-emerald-300";
    case "Ethology":
      return "text-orange-300";
    case "Multiple":
      return "text-yellow-300";
    default:
      return "text-neutral-300";
  }
}

export default function ChallengeResultCard({
  challenge,
  currentUserId,
}: ChallengeResultCardProps) {
  const [topic, setTopic] = useState<string | undefined>(undefined);
  const [bannerUrl, setBannerUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    const db = getFirestore(app);
    getDoc(doc(db, "sets", challenge.blitzId)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data() as any;
        setTopic(d.topic);
        setBannerUrl(d.bannerUrl);
      }
    });
  }, [challenge.blitzId]);

  const iWon = challenge.winnerId === currentUserId;
  const isChallenger = challenge.challengerId === currentUserId;
  const isMine = iWon;

  const myScore = isChallenger
    ? (challenge.challengerScore ?? 0)
    : (challenge.challengedScore ?? 0);
  const theirScore = isChallenger
    ? (challenge.challengedScore ?? 0)
    : (challenge.challengerScore ?? 0);
  const theirUsername = isChallenger
    ? challenge.challengedUsername
    : challenge.challengerUsername;
  const myUsername = isChallenger
    ? challenge.challengerUsername
    : challenge.challengedUsername;

  const accentText = getTopicAccentText(topic);
  const margin = Math.abs(myScore - theirScore);

  const contextLine = iWon
    ? `You beat @${theirUsername}`
    : `@${theirUsername} beat you`;

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} mt-3 mb-1`}
    >
      <Link href={`/home/${challenge.blitzId}`} className="group block">
        <div className="relative w-[300px] flex flex-col bg-black border border-neutral-800 rounded-xl overflow-hidden transition-all duration-300 group-hover:border-neutral-600 group-hover:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_24px_-8px_rgba(0,0,0,0.6)]">
          {/* Banner */}
          <div className="relative w-full h-28 bg-neutral-900 overflow-hidden">
            {bannerUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${bannerUrl})` }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-neutral-950" />
            )}

            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent transition-opacity duration-300 group-hover:from-black/95" />

            {topic && (
              <div className="absolute top-2.5 left-2.5 z-10">
                <span
                  className={`${getTopicChipBg(
                    topic,
                  )} text-white text-[9px] font-bold tracking-wider  px-1.5 py-0.5 rounded-full`}
                >
                  {getTopicShortLabel(topic)}
                </span>
              </div>
            )}

            <div className="absolute top-2.5 right-2.5 z-10">
              <span
                className={`text-[10px] font-bold tracking-[0.12em] px-2 py-0.5 rounded ${
                  iWon
                    ? "bg-white text-black"
                    : "bg-black/60 backdrop-blur-md text-neutral-400 border border-neutral-700/60"
                }`}
              >
                {iWon ? "Winner" : "Loss"}
              </span>
            </div>

            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="flex items-baseline gap-2 px-3 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/5">
                <span
                  className={`text-2xl font-black tabular-nums leading-none ${
                    iWon ? "text-white" : "text-neutral-500"
                  }`}
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {myScore}
                </span>
                <span className="text-sm font-bold text-neutral-600 tabular-nums">
                  –
                </span>
                <span
                  className={`text-2xl font-black tabular-nums leading-none ${
                    !iWon ? "text-white" : "text-neutral-500"
                  }`}
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {theirScore}
                </span>
              </div>
            </div>
          </div>

          <div className="px-3.5 py-2.5">
            <p
              className={`text-[10px] tracking-wider truncate font-bold ${
                iWon ? accentText : "text-neutral-500"
              }`}
            >
              {contextLine}
            </p>

            <div className="flex items-center justify-between gap-2 mt-1">
              <h3 className="text-sm font-bold text-white truncate leading-tight">
                {challenge.blitzTitle}
              </h3>
              <div
                className={`flex items-center gap-1 text-xs font-bold shrink-0 ${accentText} transition-transform duration-300 group-hover:translate-x-0.5`}
              >
                View
                <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" />
              </div>
            </div>

            {iWon && margin > 0 && (
              <p className="text-[10px] text-neutral-600 mt-1">
                Won by {margin} {margin === 1 ? "point" : "points"}
              </p>
            )}
            {!iWon && margin > 0 && challenge.affectsElo && (
              <p className="text-[10px] text-neutral-600 mt-1">
                Lost by {margin} {margin === 1 ? "point" : "points"} · Ranked
              </p>
            )}
            {!iWon && margin > 0 && !challenge.affectsElo && (
              <p className="text-[10px] text-neutral-600 mt-1">
                Lost by {margin} {margin === 1 ? "point" : "points"}
              </p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
