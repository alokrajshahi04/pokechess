
import React from 'react';
import { SPRITE_BASE_URL } from '../constants';

interface HeroPageProps {
  onEnter: () => void;
}

const HeroPage: React.FC<HeroPageProps> = ({ onEnter }) => {
  return (
    <div className="relative z-50 min-h-screen w-full flex flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-gray-900 cursor-pointer py-8 md:py-0" onClick={onEnter}>
      
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-gray-900 to-black z-0 fixed"></div>
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] z-0 fixed"></div>

      {/* Floating Particles/Stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none fixed">
          {[...Array(20)].map((_, i) => (
              <div 
                key={i}
                className="absolute bg-white rounded-full opacity-20 animate-float"
                style={{
                    width: Math.random() * 4 + 'px',
                    height: Math.random() * 4 + 'px',
                    top: Math.random() * 100 + '%',
                    left: Math.random() * 100 + '%',
                    animationDuration: Math.random() * 5 + 3 + 's',
                    animationDelay: Math.random() * 2 + 's'
                }}
              />
          ))}
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-6xl px-4 flex flex-col items-center gap-6 md:gap-4 animate-fadeIn my-auto">
        
        {/* Title Section */}
        <div className="text-center relative mb-2 md:mb-4 mt-4 md:mt-0">
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-pixel text-yellow-400 drop-shadow-[2px_2px_0_rgba(59,130,246,1)] md:drop-shadow-[4px_4px_0_rgba(59,130,246,1)] tracking-widest relative z-10 transform hover:scale-105 transition-transform duration-500 whitespace-nowrap">
                POKE<span className="text-blue-500 drop-shadow-[2px_2px_0_rgba(250,204,21,1)] md:drop-shadow-[4px_4px_0_rgba(250,204,21,1)]">CHESS</span>
            </h1>
            <div className="absolute -inset-4 md:-inset-10 bg-blue-500/20 blur-3xl rounded-full animate-pulse"></div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center w-full">
            
            {/* LEFT: The Battle Art */}
            <div className="flex flex-col items-center justify-center gap-4 md:gap-8 order-2 md:order-1">
                <div className="flex items-center justify-center gap-4 md:gap-16">
                    {/* Pikachu */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-yellow-400/30 blur-xl rounded-full animate-pulse"></div>
                        <img 
                            src={`${SPRITE_BASE_URL}25.png`} 
                            alt="Pikachu" 
                            className="w-20 h-20 md:w-40 md:h-40 object-contain pixelated transform scale-x-[-1] animate-bounce-slow drop-shadow-2xl"
                        />
                    </div>

                    <div className="text-2xl md:text-4xl font-black italic text-gray-700 font-pixel animate-pulse">VS</div>

                    {/* Mewtwo */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-purple-600/30 blur-xl rounded-full animate-pulse"></div>
                        <img 
                            src={`${SPRITE_BASE_URL}150.png`} 
                            alt="Mewtwo" 
                            className="w-20 h-20 md:w-40 md:h-40 object-contain pixelated animate-float drop-shadow-2xl"
                        />
                    </div>
                </div>
                
                <div className="text-center space-y-1 md:space-y-2">
                    <p className="text-blue-300 font-pixel text-[10px] md:text-sm tracking-wider">
                        CHOOSE YOUR SIDE
                    </p>
                    <p className="text-gray-400 font-mono text-[10px] md:text-xs max-w-[200px] md:max-w-xs mx-auto">
                        Lead the Heroes or Command the Villains in a battle for the board.
                    </p>
                </div>
            </div>

            {/* RIGHT: Game Details & Screenshot */}
            <div className="flex flex-col items-center order-1 md:order-2 w-full">
                <div className="relative w-full max-w-sm md:max-w-md aspect-video bg-gray-800 rounded-lg border-2 md:border-4 border-gray-700 shadow-2xl overflow-hidden md:transform md:rotate-2 md:hover:rotate-0 transition-all duration-500 group">
                    {/* Screenshot Placeholder */}
                    <img 
                        src="https://images.unsplash.com/photo-1611195974226-a6a9be9dd763?w=800&auto=format&fit=crop&q=60" 
                        alt="Gameplay Preview" 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3 md:p-4">
                        <span className="font-pixel text-white text-[10px] md:text-xs drop-shadow-md">GAMEPLAY PREVIEW</span>
                    </div>
                    
                    {/* CRT Scanline Effect */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_4px,6px_100%] pointer-events-none"></div>
                </div>

                <div className="mt-4 md:mt-6 grid grid-cols-2 gap-2 md:gap-4 w-full max-w-sm md:max-w-md px-1">
                    <div className="bg-gray-800/50 p-2 md:p-3 rounded border border-gray-700 backdrop-blur-sm flex flex-col justify-center">
                        <h3 className="text-yellow-400 font-bold text-[10px] md:text-xs uppercase mb-0.5">⚡ Smart AI</h3>
                        <p className="text-gray-400 text-[9px] md:text-[10px] leading-tight">Powered by Gemini. Adapts to your skill.</p>
                    </div>
                    <div className="bg-gray-800/50 p-2 md:p-3 rounded border border-gray-700 backdrop-blur-sm flex flex-col justify-center">
                        <h3 className="text-red-400 font-bold text-[10px] md:text-xs uppercase mb-0.5">🔥 Battle FX</h3>
                        <p className="text-gray-400 text-[9px] md:text-[10px] leading-tight">Dynamic attacks on capture & move.</p>
                    </div>
                    <div className="bg-gray-800/50 p-2 md:p-3 rounded border border-gray-700 backdrop-blur-sm flex flex-col justify-center">
                        <h3 className="text-blue-400 font-bold text-[10px] md:text-xs uppercase mb-0.5">⚔️ PvP Mode</h3>
                        <p className="text-gray-400 text-[9px] md:text-[10px] leading-tight">Local Pass & Play multiplayer.</p>
                    </div>
                    <div className="bg-gray-800/50 p-2 md:p-3 rounded border border-gray-700 backdrop-blur-sm flex flex-col justify-center">
                        <h3 className="text-green-400 font-bold text-[10px] md:text-xs uppercase mb-0.5">🎨 Pixel Art</h3>
                        <p className="text-gray-400 text-[9px] md:text-[10px] leading-tight">Retro visuals & 8-bit sound design.</p>
                    </div>
                </div>
            </div>

        </div>

        {/* Call to Action */}
        <div className="mt-8 md:mt-12 flex flex-col items-center gap-3 pb-8 md:pb-0">
            <button 
                onClick={(e) => { e.stopPropagation(); onEnter(); }}
                className="font-pixel text-white text-lg md:text-2xl animate-blink hover:text-yellow-400 transition-colors drop-shadow-lg px-6 py-2 bg-gray-800/50 md:bg-transparent rounded-full md:rounded-none"
            >
                PRESS START
            </button>
            <p className="text-gray-500 text-[8px] md:text-[10px] font-mono tracking-widest uppercase mt-1 opacity-60 text-center">
                © 2024 Pokemon Company / Nintendo / Game Freak <br/> Fan Game Project
            </p>
        </div>

      </div>

      <style>{`
        .pixelated {
            image-rendering: pixelated;
        }
        @keyframes bounce-slow {
            0%, 100% { transform: scaleX(-1) translateY(0); }
            50% { transform: scaleX(-1) translateY(-10px); }
        }
        .animate-bounce-slow {
            animation: bounce-slow 3s ease-in-out infinite;
        }
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }
        .animate-blink {
            animation: blink 1.2s step-end infinite;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
            animation: fadeIn 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default HeroPage;
