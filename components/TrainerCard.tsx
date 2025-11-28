
import React from 'react';
import { TrainerStats, XPState } from '../types';

interface TrainerCardProps {
  stats: TrainerStats;
  xpState: XPState;
  username?: string;
}

const TrainerCard: React.FC<TrainerCardProps> = ({ stats, xpState, username = "Trainer" }) => {
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500 rounded-xl p-4 shadow-2xl relative overflow-hidden font-sans">
        {/* Holographic Shine */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none"></div>
        
        <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                     <span className="text-2xl">🧢</span>
                 </div>
                 <div>
                     <h3 className="font-bold text-white text-lg leading-none">{username}</h3>
                     <span className="text-xs text-yellow-400 uppercase tracking-widest font-bold">Lvl {xpState.level}</span>
                 </div>
             </div>
             <div className="text-right">
                 <div className="text-[10px] text-gray-400 uppercase">ID No.</div>
                 <div className="text-xs font-mono text-gray-300">8934-2210</div>
             </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center mb-4">
            <div className="bg-gray-800/50 rounded p-2 border border-gray-700">
                <div className="text-xs text-gray-400 uppercase">Wins</div>
                <div className="text-xl font-bold text-green-400">{stats.wins}</div>
            </div>
            <div className="bg-gray-800/50 rounded p-2 border border-gray-700">
                <div className="text-xs text-gray-400 uppercase">Losses</div>
                <div className="text-xl font-bold text-red-400">{stats.losses}</div>
            </div>
            <div className="bg-gray-800/50 rounded p-2 border border-gray-700">
                <div className="text-xs text-gray-400 uppercase">Rate</div>
                <div className="text-xl font-bold text-blue-400">{winRate}%</div>
            </div>
        </div>

        {/* Badges / Streak */}
        <div className="flex items-center justify-between bg-black/30 rounded px-3 py-2">
            <span className="text-xs text-gray-400 uppercase font-bold">Current Streak</span>
            <div className="flex gap-1">
                {[...Array(stats.currentStreak)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-xs">🔥</span>
                ))}
                {stats.currentStreak === 0 && <span className="text-xs text-gray-600">-</span>}
            </div>
        </div>
    </div>
  );
};

export default TrainerCard;
