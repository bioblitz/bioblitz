import React from "react";
import Link from "next/link";
import { gameRoom } from "@/types";
import { Clock, Star, Users } from "lucide-react";
import DefaultAvatar from "@/components/ui/DefaultAvatar";

interface ContestCardProps {
  contest: gameRoom;
  href?: string;
}

const ContestCard: React.FC<ContestCardProps> = ({ contest, href }) => {
  const timeInMinutes = contest.timeLimit ? parseInt(contest.timeLimit) : 0;
  const questionCount = parseInt(contest.number_of_questions) || 0;

  const getTopicColor = (topic?: string) => {
    if (!topic) return "bg-violet-600";
    
    const topicLower = topic.toLowerCase();
    if (topicLower.includes("animal")) return "bg-rose-600";
    if (topicLower.includes("multiple")) return "bg-yellow-600";
    if (topicLower.includes("eco")) return "bg-emerald-600";
    if (topicLower.includes("genetic")) return "bg-lime-600";
    if (topicLower.includes("plant")) return "bg-green-600";
    return "bg-violet-600";
  };

  return (
    <Link
      key={contest.id}
      href={href || `/contests/${contest.id}`}
      className="block group w-full"
    >
      <div className="relative h-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10">
        <div className="relative w-full h-28 bg-black">
          {contest.bannerUrl && contest.bannerUrl.trim() !== "" ? (
            <img 
              src={contest.bannerUrl} 
              alt={`${contest.title} banner`} 
              className="w-full h-full object-cover"
            />
          ) : contest.creatorBanner ? (
            <img 
              src={contest.creatorBanner} 
              alt={`${contest.creatorUsername}'s banner`} 
              className="w-full h-full object-cover"
            />
          ) : contest.creatorPfp ? (
            <img 
              src={contest.creatorPfp} 
              alt={`${contest.creatorUsername}'s profile`} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black" />
          )}
          
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="text-white text-sm font-semibold text-center px-4">
              {questionCount} problem{questionCount !== 1 ? 's' : ''} in {timeInMinutes} minute{timeInMinutes !== 1 ? 's' : ''}
            </p>
          </div>
          
          {contest.topic && (
            <div className="absolute bottom-2 left-2 z-10">
              <span className={`${getTopicColor(contest.topic)} text-white text-[10px] font-bold tracking-wide px-2 py-1 rounded-full shadow-sm`}>
                {contest.topic}
              </span>
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
          <div className="flex items-start gap-3">
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
            
            <div className="flex-1 min-w-0">
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
              
              <div className="flex items-center gap-3 text-xs">
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
