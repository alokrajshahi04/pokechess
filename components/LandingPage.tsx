
import React from 'react';
import { GameMode } from '../types';

interface LandingPageProps {
  onStartGame: (mode: GameMode) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStartGame }) => {
  return (
    <div className="relative z-20 flex flex-col items-center justify-center min-h-[600px] w-full max-w-4xl p-8 text-center animate-fadeIn">
      {/* Hero Title */}
      <h1 className="text-5xl md:text-7xl font-pixel text-yellow-400 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] tracking-widest mb-4 transform hover:scale-105 transition-transform duration-300">
        PokeChess
      </h1>
      <p className="text-gray-300 text-lg md:text-xl font-bold tracking-wide mb-12 max-w-2xl leading-relaxed drop-shadow-md">
        Master the board. Catch the King. <br/> 
        <span className="text-blue-400">Strategy</span> meets <span className="text-red-500">Adventure</span>.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">
        <button
          onClick={() => onStartGame('ai')}
          className="group relative flex-1 bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white p-6 rounded-xl shadow-xl border-b-4 border-blue-900 active:border-b-0 active:translate-y-1 transition-all overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="text-2xl mb-2">🤖</div>
          <div className="text-xl font-bold font-pixel uppercase">Vs Computer</div>
          <div className="text-xs text-blue-200 mt-2 font-sans">Challenge the Rival AI</div>
        </button>

        <button
          onClick={() => onStartGame('p2p')}
          className="group relative flex-1 bg-gradient-to-br from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 text-white p-6 rounded-xl shadow-xl border-b-4 border-green-900 active:border-b-0 active:translate-y-1 transition-all overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="text-2xl mb-2">👥</div>
          <div className="text-xl font-bold font-pixel uppercase">Local PvP</div>
          <div className="text-xs text-green-200 mt-2 font-sans">Pass & Play</div>
        </button>

        <button
          onClick={() => onStartGame('online')}
          className="group relative flex-1 bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white p-6 rounded-xl shadow-xl border-b-4 border-purple-900 active:border-b-0 active:translate-y-1 transition-all overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="text-2xl mb-2">🌐</div>
          <div className="text-xl font-bold font-pixel uppercase">Online</div>
          <div className="text-xs text-purple-200 mt-2 font-sans">Play w/ Friends</div>
        </button>
      </div>

      {/* Footer Info */}
      <div className="mt-16 grid grid-cols-3 gap-8 text-gray-500 text-xs font-bold uppercase tracking-wider">
        <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-lg">⚡</div>
            <span>Fast Engines</span>
        </div>
        <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-lg">🎓</div>
            <span>Learn & Play</span>
        </div>
        <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-lg">🎨</div>
            <span>Pixel Art</span>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
            animation: fadeIn 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
