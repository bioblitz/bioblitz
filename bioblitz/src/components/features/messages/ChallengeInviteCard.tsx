"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Hash, Zap, ArrowRight } from "lucide-react";
import { Challenge } from "@/lib/challenges";
import { getTopicShortLabel } from "@/lib/utils";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";

interface ChallengeInviteCardProps {
  challenge: Challenge;
  currentUserId: string;
}

interface BlitzMeta {
  topic?: string;
  number_of_questions?: string;
  timeLimit?: string;
  bannerUrl?: string;
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

function timeRemaining(expiresAtMs: number): string {
  const diff = expiresAtMs - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) return `${Math.floor(hours / 24)}d left`;
  if (hours >= 1) return `${hours}h left`;
  return `${mins}m left`;
}

export default function ChallengeInviteCard({
  challenge,
  currentUserId,
}: ChallengeInviteCardProps) {
  const [blitz, setBlitz] = useState<BlitzMeta | null>(null);

  useEffect(() => {
    const db = getFirestore(app);
    getDoc(doc(db, "sets", challenge.blitzId)).then((snap) => {
      if (snap.exists()) setBlitz(snap.data() as BlitzMeta);
    });
  }, [challenge.blitzId]);

  const isChallenger = challenge.challengerId === currentUserId;
  const isMine = isChallenger;
  const expired =
    challenge.expiresAt && challenge.expiresAt.toMillis() < Date.now();

  const myScore = isChallenger
    ? challenge.challengerScore
    : challenge.challengedScore;
  const theirScore = isChallenger
    ? challenge.challengedScore
    : challenge.challengerScore;
  const theirUsername = isChallenger
    ? challenge.challengedUsername
    : challenge.challengerUsername;

  const canPlay =
    !expired && challenge.status === "pending" && myScore === null;

  let contextLine: string;
  if (isChallenger) {
    contextLine = `You challenged @${theirUsername}`;
  } else {
    contextLine = `@${challenge.challengerUsername} challenged you`;
  }

  let actionText: string;
  if (challenge.status === "completed") {
    actionText = "View";
  } else if (expired || challenge.status === "expired") {
    actionText = "Expired";
  } else if (canPlay) {
    actionText = isChallenger ? "Play" : "Accept";
  } else if (myScore !== null) {
    actionText = "Waiting";
  } else {
    actionText = "View";
  }

  let bottomLeftLine: string;
  if (myScore !== null && theirScore === null) {
    bottomLeftLine = `Your score: ${myScore}`;
  } else if (myScore === null && theirScore !== null) {
    bottomLeftLine = `Their score: ${theirScore}`;
  } else if (myScore !== null && theirScore !== null) {
    bottomLeftLine = `${myScore} – ${theirScore}`;
  } else {
    bottomLeftLine = challenge.blitzTitle;
  }

  const questionCount = blitz?.number_of_questions
    ? parseInt(blitz.number_of_questions)
    : null;
  const timeInMinutes = blitz?.timeLimit
    ? typeof blitz.timeLimit === "string" && blitz.timeLimit.includes("min")
      ? parseInt(blitz.timeLimit)
      : Math.floor(parseInt(blitz.timeLimit) / 60)
    : null;

  const accentText = getTopicAccentText(blitz?.topic);
  const dimmed = expired || challenge.status === "completed";

  const cardInner = (
    <div
      className={`relative w-[300px] flex flex-col bg-black border border-neutral-800 rounded-xl overflow-hidden transition-all duration-300 ${
        canPlay
          ? "group-hover:border-neutral-600 group-hover:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_24px_-8px_rgba(0,0,0,0.6)] cursor-pointer"
          : ""
      } ${dimmed ? "opacity-80" : ""}`}
    >
      {/* Banner */}
      <div className="relative w-full h-28 bg-neutral-900 overflow-hidden">
        {blitz?.bannerUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(${blitz.bannerUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-neutral-950" />
        )}

        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 group-hover:from-black/95" />

        {blitz?.topic && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span
              className={`${getTopicChipBg(
                blitz.topic,
              )} text-white text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full`}
            >
              {getTopicShortLabel(blitz.topic)}
            </span>
          </div>
        )}

        {challenge.status === "pending" && !expired && (
          <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 text-[10px] text-neutral-200 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded">
            <Clock className="w-2.5 h-2.5" />
            {timeRemaining(challenge.expiresAt.toMillis())}
          </div>
        )}

        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 text-[10px] text-white/90">
          {challenge.affectsElo && (
            <span className="flex items-center gap-0.5 text-amber-300 font-bold">
              <Zap className="w-2.5 h-2.5" />
              Ranked
            </span>
          )}
          {questionCount !== null && (
            <span className="flex items-center gap-0.5">
              <Hash className="w-2.5 h-2.5" />
              {questionCount}
            </span>
          )}
          {timeInMinutes !== null && (
            <span className="flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {timeInMinutes}m
            </span>
          )}
        </div>
      </div>

      <div className="px-3.5 py-2.5">
        <p className="text-[10px] text-neutral-500 uppercase tracking-wider truncate">
          {contextLine}
        </p>

        <div className="flex items-center justify-between gap-2 mt-1">
          <h3 className="text-sm font-bold text-white truncate leading-tight">
            {bottomLeftLine === challenge.blitzTitle
              ? challenge.blitzTitle
              : bottomLeftLine}
          </h3>
          <div
            className={`flex items-center gap-1 text-xs font-bold shrink-0 ${
              dimmed ? "text-neutral-600" : accentText
            } transition-transform duration-300 group-hover:translate-x-0.5`}
          >
            {actionText}
            {canPlay && (
              <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" />
            )}
          </div>
        </div>

        {bottomLeftLine !== challenge.blitzTitle && (
          <p className="text-[11px] text-neutral-500 truncate mt-0.5">
            {challenge.blitzTitle}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} mt-3 mb-1`}
    >
      {canPlay ? (
        <Link href={`/home/${challenge.blitzId}`} className="group block">
          {cardInner}
        </Link>
      ) : (
        <div className="group">{cardInner}</div>
      )}
    </div>
  );
}
