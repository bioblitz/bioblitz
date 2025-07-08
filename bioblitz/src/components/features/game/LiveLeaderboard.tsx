import React, { useState } from 'react';

export type AnswerStatus = 'correct' | 'incorrect' | 'blank';

export type Player = {
  id: number | string;
  rank: number;
  name: string;
  location: string;
  score: string;
  avatar: string; 
  answers: AnswerStatus[];
};


const MedalIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
    <path d="m12 7 1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5-2.5-2.5 3.5-.5L12 7z" />
  </svg>
);

const MoreHorizontalIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
    </svg>
);

const AnswerIndicator = ({ answers }: { answers: AnswerStatus[] }) => {
  const statusColorMap = { correct: 'bg-blue-500', incorrect: 'bg-red-500', blank: 'bg-gray-500' };
  return (
    <div className="flex space-x-1.5 mt-2">
      {answers.map((status, index) => (
        <div key={index} className={`h-3 w-6 rounded-sm ${statusColorMap[status]}`} title={`Question ${index + 1}: ${status}`}></div>
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
        <MedalIcon className="w-5 h-5 mr-1" />
        <span>{getOrdinal(rank)}</span>
      </div>
    );
  }
  return <span className="text-gray-400">{rank}</span>;
};

const LeaderboardItem = ({ player, isCurrentUser }: { player: Player, isCurrentUser: boolean }) => {
  const highlightClass = isCurrentUser ? 'bg-blue-900/50 border-blue-500' : 'border-transparent';
  const correctAnswers = player.answers.filter(a => a === 'correct').length;
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
        <div className="bg-gray-700 px-3 py-1 rounded-md"><p className="font-semibold text-gray-200">{correctAnswers}</p></div>
        <p className="hidden sm:block font-semibold text-gray-200 w-24 text-left">{player.score}</p>
      </div>
      <button className="ml-2 p-2 rounded-full hover:bg-gray-700 text-gray-400"><MoreHorizontalIcon className="w-5 h-5" /></button>
    </li>
  );
};

interface PaginationProps {
  totalPlayers: number;
  playersPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ totalPlayers, playersPerPage, currentPage, onPageChange }: PaginationProps) => {
  const pageCount = Math.ceil(totalPlayers / playersPerPage);
  if (pageCount <= 1) return null; 

  const pages = [];
  for (let i = 1; i <= pageCount; i++) {
    pages.push(i);
  }

  return (
    <div className="flex justify-center items-center space-x-2 p-4 border-t border-gray-700">
      {pages.map(pageNumber => {
        const startRange = (pageNumber - 1) * playersPerPage + 1;
        const endRange = Math.min(pageNumber * playersPerPage, totalPlayers);
        const isActive = currentPage === pageNumber;
        return (
          <button
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
              isActive ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {`${startRange}-${endRange}`}
          </button>
        );
      })}
    </div>
  );
};


interface LiveLeaderboardProps {
  title?: string;
  players: Player[];
  currentUserId?: number | string;
  onSeeAllClick?: () => void;
  onFiltersClick?: () => void;
  className?: string;
}

export const LiveLeaderboard = ({
  title = 'Standings',
  players,
  currentUserId,
  onSeeAllClick = () => console.log('See All clicked'),
  onFiltersClick = () => console.log('Filters clicked'),
  className = ''
}: LiveLeaderboardProps) => {
  const [activeTab, setActiveTab] = useState('Individual');
  const [currentPage, setCurrentPage] = useState(1);
  const playersPerPage = 50;

  const indexOfLastPlayer = currentPage * playersPerPage;
  const indexOfFirstPlayer = indexOfLastPlayer - playersPerPage;
  const currentPlayers = players.slice(indexOfFirstPlayer, indexOfLastPlayer);

  const handleTabClick = (tabName: string) => {
    setActiveTab(tabName);
    setCurrentPage(1);
  }

  return (
    <div className={`max-w-xl bg-gray-800 text-white rounded-2xl shadow-lg flex flex-col font-sans ${className}`}>
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-100">{title}</h2>
          <div className="flex items-center space-x-2">
            <button onClick={onSeeAllClick} className="text-sm font-medium text-blue-400 hover:underline">See All</button>
            <button onClick={onFiltersClick} className="text-sm font-medium text-blue-400 hover:underline">Filters</button>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex border-b border-gray-700">
            {['Individual', 'Team'].map(tabName => (
              <button key={tabName} onClick={() => handleTabClick(tabName)} className={`px-4 py-2 text-sm font-semibold transition-colors duration-200 ${ activeTab === tabName ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-gray-200' }`}>
                {tabName}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-2 overflow-y-auto h-[65vh]">
        {activeTab === 'Individual' && (
          <ul className="space-y-1">
            {currentPlayers.sort((a, b) => a.rank - b.rank).map((player) => (
                <LeaderboardItem key={player.id} player={player} isCurrentUser={player.id === currentUserId} />
              ))}
          </ul>
        )}
        {activeTab === 'Team' && (
          <div className="text-center py-16 text-gray-400"><p>Team standings would be shown here.</p></div>
        )}
      </div>

      {activeTab === 'Individual' && (
        <Pagination 
          totalPlayers={players.length}
          playersPerPage={playersPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};
