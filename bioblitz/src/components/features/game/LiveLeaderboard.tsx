import React, { useState, useMemo } from 'react';

export type AnswerStatus = 'correct' | 'incorrect' | 'blank';

export type PlayerInput = {
  id: number | string;
  name: string;
  location: string;
  avatar: string;
  answers: AnswerStatus[];
  baseTime: number;
};

export type Player = PlayerInput & {
  rank: number;
  finalScore: number;
  correctAnswers: number;
};

const formatTime = (seconds: number) => {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  return `${min}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

const MedalIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /><path d="m12 7 1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5-2.5-2.5 3.5-.5L12 7z" />
  </svg>
);

const MoreHorizontalIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
    </svg>
);

const AnswerIndicator = ({ answers }: { answers: AnswerStatus[] }) => {
  const statusInfo = {
    correct: { color: 'bg-blue-500', title: 'Correct' },
    incorrect: { color: 'bg-red-500', title: 'Incorrect' },
    blank: { color: 'bg-gray-500', title: 'Not Attempted' },
  };
  return (
    <div className="flex space-x-1.5 mt-2">
      {answers.map((status, index) => (
        <div key={index} className={`h-4 w-4 rounded-sm ${statusInfo[status].color}`} title={statusInfo[status].title}></div>
      ))}
    </div>
  );
};

const RankDisplay = ({ rank }: { rank: number }) => {
  const rankColors: { [key: number]: string } = { 1: 'text-yellow-400', 2: 'text-gray-300', 3: 'text-yellow-600' };
  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  if (rank <= 3) {
    return (
      <div className={`flex items-center justify-center font-bold ${rankColors[rank]}`}>
        <MedalIcon className="w-5 h-5 mr-1" /><span>{getOrdinal(rank)}</span>
      </div>
    );
  }
  return <span className="text-gray-400">{rank}</span>;
};

const LeaderboardItem = ({ player, isCurrentUser }: { player: Player, isCurrentUser: boolean }) => {
  const highlightClass = isCurrentUser ? 'bg-blue-900/50 border-blue-500' : 'border-transparent';
  return (
    <li className={`flex items-center p-3 transition-colors duration-200 hover:bg-gray-700/50 rounded-lg border-l-4 ${highlightClass}`}>
      <div className="w-16 text-center text-lg font-bold">{<RankDisplay rank={player.rank} />}</div>
      <div className="flex items-center ml-2 flex-1">
        <img className="h-10 w-10 rounded-full flex-shrink-0 bg-gray-700" src={player.avatar} alt={`${player.name}'s avatar`} onError={(e) => { e.currentTarget.src = `https://placehold.co/40x40/475569/ffffff?text=${player.name.charAt(0)}` }}/>
        <div className="ml-4">
          <p className="font-semibold text-gray-100">{player.name} <span className="text-gray-400 text-sm">({player.location})</span></p>
          <AnswerIndicator answers={player.answers} />
        </div>
      </div>
      <div className="flex items-center space-x-3 text-right pr-2">
        <div className="bg-gray-700 px-3 py-1 rounded-md w-12 text-center"><p className="font-semibold text-gray-200">{player.correctAnswers}</p></div>
        <p className="hidden sm:block font-semibold text-gray-200 w-24 text-left">{formatTime(player.finalScore)}</p>
      </div>
      <button className="ml-2 p-2 rounded-full hover:bg-gray-700 text-gray-400"><MoreHorizontalIcon className="w-5 h-5" /></button>
    </li>
  );
};

export const useLeaderboard = (initialPlayers: PlayerInput[], timePenaltyPerIncorrect: number) => {
  const [players, setPlayers] = useState(initialPlayers);

  const rankedPlayers = useMemo(() => {
    const scoredPlayers = players.map(player => {
      const correctAnswers = player.answers.filter(a => a === 'correct').length;
      const incorrectAnswers = player.answers.filter(a => a === 'incorrect').length;
      const finalScore = player.baseTime + (incorrectAnswers * timePenaltyPerIncorrect);
      return { ...player, correctAnswers, finalScore };
    });

    scoredPlayers.sort((a, b) => {
      if (a.correctAnswers !== b.correctAnswers) {
        return b.correctAnswers - a.correctAnswers;
      }
      return a.finalScore - b.finalScore;
    });

    return scoredPlayers.map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
  }, [players, timePenaltyPerIncorrect]);

  const updatePlayerAnswers = (playerId: number | string, newAnswers: AnswerStatus[]) => {
    setPlayers(currentPlayers =>
      currentPlayers.map(p =>
        p.id === playerId ? { ...p, answers: newAnswers } : p
      )
    );
  };

  return { rankedPlayers, updatePlayerAnswers };
};

interface LiveLeaderboardProps {
  title?: string;
  players: Player[];
  currentUserId?: number | string;
  className?: string;
}

export const LiveLeaderboard = ({
  title = 'Standings',
  players,
  currentUserId,
  className = ''
}: LiveLeaderboardProps) => {
  return (
    <div className={`max-w-xl bg-gray-800 text-white rounded-2xl shadow-lg flex flex-col font-sans ${className}`}>
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-100">{title}</h2>
      </div>
      <div className="p-2 overflow-y-auto h-[65vh]">
        <ul className="space-y-1">
          {players.map((player) => (
            <LeaderboardItem key={player.id} player={player} isCurrentUser={player.id === currentUserId} />
          ))}
        </ul>
      </div>
    </div>
  );
};