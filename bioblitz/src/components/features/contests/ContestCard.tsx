"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { gameRoom } from "@/types";
import { Clock, Star, Users, Zap, Trophy, BarChart3 } from "lucide-react";
import DefaultAvatar from "@/components/ui/DefaultAvatar";
import { getTopicShortLabel } from "@/lib/utils";
import { getRatingTier } from "@/lib/rating";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { trackAnalyticsEvent } from "@/lib/analytics-client";

interface ContestCardProps {
  contest: gameRoom;
  href?: string;
  isCompleted?: boolean;
}

const ContestCard: React.FC<ContestCardProps> = ({
  contest,
  href,
  isCompleted,
}) => {
  const [userSubmission, setUserSubmission] = useState<{
    rank?: number;
  } | null>(null);
  const auth = getAuth(app);
  const db = getFirestore(app);

  useEffect(() => {
    if (isCompleted && auth.currentUser) {
      const fetchSubmission = async () => {
        try {
          const subRef = doc(
            db,
            "gameSubmissions",
            `${auth.currentUser?.uid}_${contest.id}`,
          );
          const subSnap = await getDoc(subRef);
          if (subSnap.exists()) {
            const data = subSnap.data();
            setUserSubmission({
              rank: data.rank || data.ranking,
            });
          }
        } catch (e) {
          console.error("Error fetching submission for card:", e);
        }
      };
      fetchSubmission();
    }
  }, [isCompleted, contest.id, auth.currentUser?.uid]);

  const timeInMinutes = contest.timeLimit
    ? typeof contest.timeLimit === "string" && contest.timeLimit.includes("min")
      ? parseInt(contest.timeLimit)
      : Math.floor(parseInt(contest.timeLimit) / 60)
    : 0;
  const questionCount = parseInt(contest.number_of_questions) || 0;

  const getTopicColor = (topic?: string) => {
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
  };

  const contestElo = Math.round(contest.contestRating || 0);
  const tier = getRatingTier(contestElo);

  return (
    <Link
      key={contest.id}
      href={href || `/contests/${contest.id}`}
      onClick={() => {
        void trackAnalyticsEvent({
          event: "contest_card_click",
          source: "contest_card",
          page: "contest_list",
          metadata: {
            gameId: contest.id,
            isCompleted: Boolean(isCompleted),
          },
        });
      }}
      className="block group w-full"
    >
      <div className="relative h-full flex flex-col bg-black border border-neutral-800 rounded-lg overflow-hidden transition-colors duration-200 hover:border-neutral-700">
        <div className="relative w-full h-28 bg-neutral-900">
          {contest?.bannerUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${contest.bannerUrl})` }}
            />
          ) : contest.creatorPfp ? (
            <>
              <div className="absolute inset-0 bg-neutral-900" />
              <div className="relative h-full flex items-center justify-center">
                <img
                  src={contest.creatorPfp}
                  alt="Channel owner"
                  className="w-20 h-20 rounded-full object-cover border-2 border-neutral-700"

                />
              </div>
            </>
          ) : (
            <div className="absolute inset-0 bg-neutral-900" />
          )}
          <div className="absolute inset-0 bg-neutral-900/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-4 z-20">
            <p className="text-white text-sm text-center">
              {questionCount} problem{questionCount !== 1 ? "s" : ""} in{" "}
              {timeInMinutes} minute{timeInMinutes !== 1 ? "s" : ""}
            </p>
            {contest.description && (
              <>
                <div className="h-3" />
                <p className="text-zinc-300 text-xs text-center line-clamp-3 leading-relaxed">
                  {contest.description}
                </p>
              </>
            )}
          </div>
          {isCompleted && (
            <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[0.25px] z-20">
              <div className="absolute top-0 left-0 flex overflow-hidden w-24 h-24">
                <span className="absolute -left-6 top-4 w-28 text-black text-xs font-semibold bg-yellow-300 -rotate-45 px-5 justify-center py-1 border border-white/10">
                  Completed
                </span>
              </div>
            </div>
          )}
          {contest.topic && (
            <div className="absolute bottom-2 left-2 z-10 transition-opacity duration-300 group-hover:opacity-80">
              <span
                className={`${getTopicColor(contest.topic)} text-white text-[10px] font-bold tracking-wide px-2 py-1 rounded-full`}
              >
                {getTopicShortLabel(contest.topic)}
              </span>
            </div>
          )}
          {!contest.ratingActivated && (
            <div className="absolute top-2 left-2 z-10 transition-opacity duration-300 group-hover:opacity-80">
              <span className="flex items-center gap-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                <Zap className="w-2.5 h-2.5" />
                2x
              </span>
            </div>
          )}
          <div className="absolute bottom-2 right-2 z-10 flex rounded bg-neutral-800/80 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-80">
            {contestElo > 0 && (
              <div className="flex rounded px-1.5 backdrop-blur-sm py-1">
                <span className={`text-xs font-bold ${tier.textClass}`}>
                  {contestElo}
                </span>
              </div>
            )}
            <div className="flex gap-1 text-white px-1.5 py-1 rounded-md">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs">{timeInMinutes} min</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-3 flex flex-col">
          <div className="flex items-start gap-3 flex-1">
            {contest.creatorPfp ? (
              <img
                src={contest.creatorPfp}
                alt={contest.creatorUsername || "Creator"}
                className="w-12 h-12 rounded-full object-cover border-2 border-neutral-700 flex-shrink-0"

              />
            ) : (
              <div className="w-12 h-12 flex-shrink-0">
                <DefaultAvatar name={""} />
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="group/title relative">
                <h2 className="text-base font-bold text-white truncate mb-1">
                  {contest.title}
                </h2>
                <div className="pointer-events-none absolute left-0 bottom-full mb-1.5 z-50 opacity-0 group-hover/title:opacity-100 transition-opacity duration-150 delay-0 group-hover/title:delay-[1000ms]">
                  <div className="bg-zinc-900 border border-zinc-700 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-normal max-w-[220px] leading-snug">
                    {contest.title}
                  </div>
                </div>
              </div>
              {contest.creatorUsername && (
                <span
                  className="text-xs text-neutral-400 hover:underline block truncate mb-1 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void trackAnalyticsEvent({
                      event: "contest_creator_click",
                      source: "contest_card",
                      page: "contest_list",
                      metadata: {
                        creatorUsername: contest.creatorUsername || "",
                      },
                    });
                    window.location.href = `/channel/${contest.creatorUsername}`;
                  }}
                >
                  {contest.creatorUsername}
                </span>
              )}
              <div className="flex items-center gap-3 text-xs mt-auto">
                {(contest.rating ?? 0) > 0 && (
                  <div className="flex items-center gap-1 text-yellow-400">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      <span className="font-medium">
                        {contest.rating?.toFixed(1)}/5
                      </span>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-neutral-400">
                  <Users className="w-3 h-3" />
                  <span className="font-medium">
                    {contest.firstAttemptCount ?? 0} plays
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ContestCard;
