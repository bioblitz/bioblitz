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
          
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/80 backdrop-blur-sm border border-white/10 text-white px-2 py-1 rounded-md shadow-lg">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{timeInMinutes} min</span>
          </div>
        </div>

        <div className="flex-1 p-3 flex flex-col">
          

          <div className="flex mb-2 items-center gap-2">
            {contest.creatorPfp ? (
              <img 
                src={contest.creatorPfp} 
                alt={contest.creatorUsername || "Creator"} 
                className="w-8 h-8 rounded-full object-cover border-2 border-zinc-700"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8">
                <DefaultAvatar name={""} />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-white line-clamp-1">
                {contest.title}
              </h2>
              {contest.creatorUsername && (
                <p className="text-xs text-zinc-400 truncate">
                  {contest.creatorUsername}
                </p>
              )}
            </div>
            
          </div>
          <div className="flex items-center gap-3 mb-2 text-xs">
            <div className="flex items-center gap-1 text-zinc-400">
              <Users className="w-3.5 h-3.5" />
              <span className="font-medium">{(contest as any).totalPlays || 0}</span>
            </div>
            {contest.rating && contest.rating > 0 && (
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="w-3.5 h-3.5 fill-yellow-400" />
                <span className="font-medium">{contest.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ContestCard;
