import React from "react";
import Link from "next/link";
import { gameRoom } from "@/types";
import { Clock, Star, Users, CheckCircle2 } from "lucide-react";
import DefaultAvatar from "@/components/ui/DefaultAvatar";
import { getTopicShortLabel } from "@/lib/utils";
interface ContestCardProps {
  contest: gameRoom;
  href?: string;
  isCompleted?: boolean;
}

const ContestCard: React.FC<ContestCardProps> = ({ contest, href, isCompleted }) => {
  const timeInMinutes = contest.timeLimit 
    ? (typeof contest.timeLimit === 'string' && contest.timeLimit.includes('min') 
        ? parseInt(contest.timeLimit) 
        : Math.floor(parseInt(contest.timeLimit) / 60))
    : 0;
  const questionCount = parseInt(contest.number_of_questions) || 0;

  const getTopicColor = (topic?: string) => {
    switch (topic) {
      case "Anatomy & Physiology": return "bg-blue-600";
      case "Cell Biology": return "bg-cyan-600";
      case "Plant Biology": return "bg-green-600";
      case "Genetics & Evolution": return "bg-lime-600";
      case "Biosystematics": return "bg-violet-600";
      case "Ecology": return "bg-emerald-600";
      case "Ethology": return "bg-orange-600";
      case "Multiple": return "bg-yellow-600";
      default: return "bg-zinc-600";
    }
  };

  return (
    <Link
      key={contest.id}
      href={href || `/contests/${contest.id}`}
      className="block group w-full"
    >
      <div className="relative h-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden transition-colors duration-200 hover:border-zinc-700">
        <div className="relative w-full h-28 bg-black">
          {contest?.bannerUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${contest.bannerUrl})` }}
            />
          ) : contest.creatorPfp ? (
            <>
              <img
                src={contest.creatorPfp}
                className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
                alt=""
                aria-hidden
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/60" />
              <div className="relative h-full flex items-center justify-center">
                <img
                  src={contest.creatorPfp}
                  alt="Channel owner"
                  className="w-20 h-20 rounded-full object-cover border-2 border-zinc-700"
                  referrerPolicy="no-referrer"
                />
              </div>
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black" />
          )}
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="text-white text-sm font-semibold text-center px-4">
              {questionCount} problem{questionCount !== 1 ? 's' : ''} in {timeInMinutes} minute{timeInMinutes !== 1 ? 's' : ''}
            </p>
          </div>
          {contest.topic && (
            <div className="absolute bottom-2 left-2 z-10">
              <span className={`${getTopicColor(contest.topic)} text-white text-[10px] font-bold tracking-wide px-2 py-1 rounded-full shadow-sm`}>
                {getTopicShortLabel(contest.topic)}
              </span>
            </div>
          )}
          {isCompleted && (
            <div className="absolute top-2 right-2 z-10">
              <CheckCircle2 className="w-5 h-5 text-green-400 drop-shadow-md" />
            </div>
          )}
          <div className="absolute bottom-2 right-2 z-10">
            <div className="flex items-center gap-1 bg-black/80 backdrop-blur-sm border border-white/10 text-white px-2 py-1 rounded-md shadow-lg">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">{timeInMinutes} min</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-3 flex flex-col">
          <div className="flex items-start gap-3 flex-1">
            {contest.creatorPfp ? (
              <img
                src={contest.creatorPfp}
                alt={contest.creatorUsername || "Creator"}
                className="w-12 h-12 rounded-full object-cover border-2 border-zinc-700 flex-shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 flex-shrink-0">
                <DefaultAvatar name={""} />
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col">
              <h2 className="text-base font-bold text-white line-clamp-2 mb-1">
                {contest.title}
              </h2>
              {contest.creatorUsername && (
                <span
                  className="text-xs text-zinc-400 hover:underline block truncate mb-1 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = `/channel/${contest.creatorUsername}`;
                  }}
                >
                  {contest.creatorUsername}
                </span>
              )}
              <div className="flex items-center gap-3 text-xs mt-auto">
                {contest.rating && contest.rating > 0 && (
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star className="w-3 h-3 fill-yellow-400" />
                    <span className="font-medium">{contest.rating.toFixed(1)}/5</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-zinc-400">
                  <Users className="w-3 h-3" />
                  <span className="font-medium">{contest.totalPlays || 0} plays</span>
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
