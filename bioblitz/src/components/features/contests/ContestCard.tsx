import React from 'react';
import Link from 'next/link';
import { gameRoom } from '@/types';
import { HelpCircle, Clock, Star, CheckCircle2 } from 'lucide-react';
import { getTopicColors } from '@/lib/utils';
import { useAuth } from '../../../../context/AuthContext';


interface ContestCardProps {
  contest: gameRoom;
}

const ContestCard: React.FC<ContestCardProps> = ({ contest }) => {
  const { user: authUser } = useAuth();
  const theme = getTopicColors(contest.topic);
  const isCreator = contest.creator === authUser?.uid;

  return (
    <Link
      key={contest.id}
      href={`/contests/${contest.id}`}
      className="block group"
    >
      <div
        className={`relative h-full flex flex-col justify-between bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${theme.shadow}`}
      >
        <div className="p-5">
          <div className="flex justify-between items-start mb-3">
            {contest.topic && (
              <span
                className={`${theme.badge} text-[10px] font-bold tracking-wide px-2 py-1 rounded-full shadow-sm`}
              >
                {contest.topic}
              </span>
            )}

            {contest.status === 'incomplete' && isCreator && (
              <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                <span>Incomplete</span>
              </div>
            )}
            {contest.status === 'completed' && (
                <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Completed</span>
                </div>
            )}
          </div>
          <h2 className="text-xl font-bold text-white mb-2 line-clamp-2 leading-tight transition-colors">
            {contest.title}
          </h2>
          <div className="space-y-1">
            {contest.creatorPfp && (
              <div className="flex items-center text-sm text-zinc-400">
                By <span className="ml-1 truncate">{contest.creator}</span>
              </div>
            )}
            {contest.source && (
              <div className="flex items-center text-sm text-zinc-500">
                <span className="text-xs border border-zinc-700 px-1.5 rounded">
                  {contest.source}
                </span>
              </div>
            )}
            {!contest.creator && !contest.source && (
              <div className="h-6"></div>
            )}
          </div>
        </div>
        <div className="px-5 py-4 bg-black/20 border-t border-white/5 flex justify-between items-center text-sm">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center text-zinc-400"
              title="Questions"
            >
              <HelpCircle className="w-4 h-4 mr-1.5 opacity-70" />
              <span className="font-semibold text-zinc-300">
                {contest.number_of_questions}
              </span>
            </div>
            <div
              className="flex items-center text-zinc-400"
              title="Time Limit"
            >
              <Clock className="w-4 h-4 mr-1.5 opacity-70" />
              <span className="font-semibold text-zinc-300">
                {contest.timeLimit}
              </span>
            </div>
          </div>
          {contest.rating && contest.rating > 0 && (
            <div className="flex items-center text-yellow-400 font-medium bg-yellow-400/5 px-2 py-0.5 rounded-md border border-yellow-400/10">
              <Star className="w-3.5 h-3.5 mr-1 fill-yellow-400" />
              <span className="text-xs font-bold">
                {contest.rating}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ContestCard;