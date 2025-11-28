
import React, { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { PieceType, PieceColor, GameDifficulty, GameMode, BoardOrientation, TeamTheme, XPState, Mission, TrainerStats } from '../types';
import { TEAM_PRESETS } from '../constants';
import PokemonPiece from './PokemonPiece';
import MissionTracker from './MissionTracker';
import TrainerCard from './TrainerCard';
import { Send, Mic, Play, SkipBack, SkipForward, Rewind } from 'lucide-react';
import { getAIChatResponse } from '../services/geminiService';
import { toast } from 'react-hot-toast';

interface GameInfoProps {
  game: Chess;
  capturedWhite: PieceType[];
  capturedBlack: PieceType[];
  commentary: string;
  difficulty: GameDifficulty;
  gameMode: GameMode;
  orientation: BoardOrientation;
  setDifficulty: (d: GameDifficulty) => void;
  resetGame: () => void;
  undoMove: () => void;
  onFlipBoard: () => void;
  onExit: () => void;
  isAiThinking: boolean;
  whiteTime: number;
  blackTime: number;
  whiteTheme: TeamTheme;
  blackTheme: TeamTheme;
  xpState: XPState;
  missions: Mission[];
  trainerStats: TrainerStats;
  isGameOver: boolean;
  onEmote: (emoji: string) => void;
  onVoiceCommand: (transcript: string) => void;
  replayIndex: number;
  setReplayIndex: (index: number) => void;
  p2pScore: { white: number; black: number };
}

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const GameInfo: React.FC<GameInfoProps> = ({ 
  game, capturedWhite, capturedBlack, commentary, difficulty, gameMode,
  orientation, setDifficulty, resetGame, undoMove, onFlipBoard, onExit,
  isAiThinking, whiteTime, blackTime, whiteTheme, blackTheme, xpState, 
  missions, trainerStats, isGameOver, onEmote, onVoiceCommand,
  replayIndex, setReplayIndex, p2pScore
}) => {
  const [activeTab, setActiveTab] = useState<'moves' | 'chat' | 'trainer'>('moves');
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            toast(`Heard: "${transcript}"`, { icon: '🎙️', duration: 2000 });
            onVoiceCommand(transcript);
        };
        recognitionRef.current = recognition;

        return () => {
            if(recognitionRef.current) recognitionRef.current.abort();
        };
    }
  }, [onVoiceCommand]);

  const toggleMic = () => {
      if (recognitionRef.current) {
          if (isListening) recognitionRef.current.stop();
          else recognitionRef.current.start();
      } else {
          toast.error("Voice control not supported in this browser.");
      }
  };

  useEffect(() => {
      if (scrollContainerRef.current) {
          const { scrollHeight, clientHeight } = scrollContainerRef.current;
          if (scrollHeight > clientHeight) {
            scrollContainerRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' });
          }
      }
  }, [chatHistory, game.history().length, activeTab]);

  useEffect(() => {
      if (gameMode === 'ai' && commentary && !commentary.includes("Thinking")) {
          setChatHistory(prev => [...prev, { role: 'model', text: commentary }]);
      }
  }, [commentary, gameMode]);

  const handleSendMessage = async () => {
      if (!chatInput.trim()) return;
      setChatHistory(prev => [...prev, { role: 'user', text: chatInput }]);
      const msg = chatInput;
      setChatInput("");
      const res = await getAIChatResponse(msg, chatHistory as any);
      setChatHistory(prev => [...prev, { role: 'model', text: res }]);
  };

  const history = game.history({ verbose: true });
  const moveList = history.map((move, i) => {
      const pieceName = TEAM_PRESETS[move.color === 'w' ? whiteTheme : blackTheme][move.piece].name;
      let text = `${pieceName} to ${move.to}`;
      if (move.flags.includes('c') || move.flags.includes('e')) text = `${pieceName} attacked!`;
      return { num: Math.floor(i / 2) + 1, white: i % 2 === 0, text, san: move.san };
  });

  const isReplayMode = replayIndex !== -1;
  const currentMoveIndex = isReplayMode ? replayIndex : history.length - 1;

  const isWhiteOrientation = orientation === 'white';
  const bottomColor = isWhiteOrientation ? 'w' : 'b';
  const topColor = isWhiteOrientation ? 'b' : 'w';
  const bottomTime = isWhiteOrientation ? whiteTime : blackTime;
  const topTime = isWhiteOrientation ? blackTime : whiteTime;
  const bottomTheme = isWhiteOrientation ? whiteTheme : blackTheme;
  const topTheme = isWhiteOrientation ? blackTheme : whiteTheme;
  
  const topLabel = gameMode === 'ai' ? 'Rival' : (gameMode === 'online' ? 'Opponent' : 'Player 2');
  const bottomLabel = gameMode === 'ai' ? 'You' : (gameMode === 'online' ? 'You' : 'Player 1');

  return (
    <div className="flex flex-col h-[700px] w-full bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden font-sans">
        
        {/* TOP: XP Bar (AI) OR Scoreboard (P2P/Online) */}
        <div className="bg-gray-900 px-3 py-1 flex items-center justify-between border-b border-gray-700 min-h-[32px]">
            {gameMode === 'ai' ? (
                <>
                    <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Lvl {xpState.level}</span>
                    <div className="flex-grow mx-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 transition-all duration-500"
                             style={{ width: `${(xpState.current / xpState.max) * 100}%` }}></div>
                    </div>
                </>
            ) : (
                <div className="flex-grow flex justify-center gap-8">
                    <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                         <span className="text-xs font-bold text-gray-300">White: {p2pScore.white}</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-red-500"></div>
                         <span className="text-xs font-bold text-gray-300">Black: {p2pScore.black}</span>
                    </div>
                </div>
            )}
        </div>

        {/* OPPONENT CARD */}
        <div className="p-3 bg-gray-800/50 flex items-center justify-between border-b border-gray-700">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-red-500 bg-gray-700 flex items-center justify-center overflow-hidden">
                     <PokemonPiece pokemonDef={TEAM_PRESETS[topTheme]['k']} type='k' color={topColor} />
                </div>
                <div>
                    <div className="text-xs font-bold text-gray-300">{topLabel}</div>
                    <div className="flex gap-1 mt-1">
                        {(isWhiteOrientation ? capturedWhite : capturedBlack).map((p, i) => (
                             <div key={i} className="w-4 h-4"><PokemonPiece pokemonDef={TEAM_PRESETS[isWhiteOrientation ? whiteTheme : blackTheme][p]} type={p} color={isWhiteOrientation ? 'w' : 'b'} /></div>
                        ))}
                    </div>
                </div>
            </div>
            <div className={`text-xl font-mono font-bold ${topTime < 30 ? 'text-red-500 animate-pulse' : 'text-gray-400'} bg-gray-900 px-2 py-1 rounded`}>
                {formatTime(topTime)}
            </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-700 bg-gray-900">
            <button onClick={() => setActiveTab('moves')} className={`flex-1 py-2 text-[10px] md:text-xs font-bold uppercase ${activeTab === 'moves' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500'}`}>Log</button>
            {gameMode === 'ai' && <button onClick={() => setActiveTab('chat')} className={`flex-1 py-2 text-[10px] md:text-xs font-bold uppercase ${activeTab === 'chat' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500'}`}>Chat</button>}
            {gameMode === 'ai' && <button onClick={() => setActiveTab('trainer')} className={`flex-1 py-2 text-[10px] md:text-xs font-bold uppercase ${activeTab === 'trainer' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500'}`}>Profile</button>}
        </div>

        {/* CONTENT AREA */}
        <div ref={scrollContainerRef} className="flex-grow overflow-y-auto bg-[#0f172a] relative scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            
            {activeTab === 'moves' && (
                <div className="p-2 space-y-4">
                     {(isGameOver || isReplayMode) && (
                         <div className="sticky top-0 z-10 bg-gray-800 p-2 rounded border border-gray-600 flex justify-center gap-4 mb-2 shadow-lg">
                             <button onClick={() => setReplayIndex(0)} className="text-gray-300 hover:text-white"><SkipBack size={16}/></button>
                             <button onClick={() => setReplayIndex(Math.max(-1, currentMoveIndex - 1))} className="text-gray-300 hover:text-white"><Rewind size={16}/></button>
                             <span className="text-xs font-mono text-blue-300">{currentMoveIndex + 1} / {history.length}</span>
                             <button onClick={() => setReplayIndex(Math.min(history.length - 1, currentMoveIndex + 1))} className="text-gray-300 hover:text-white"><Play size={16} fill="currentColor" /></button>
                             <button onClick={() => setReplayIndex(history.length - 1)} className="text-gray-300 hover:text-white"><SkipForward size={16}/></button>
                         </div>
                     )}
                     <table className="w-full text-xs text-left text-gray-400">
                        <tbody>
                            {moveList.map((m, i) => (
                                <tr key={i} className={`border-b border-gray-800 transition-colors ${i === currentMoveIndex ? 'bg-blue-900/50 text-white' : 'hover:bg-gray-800/50'}`}>
                                    <td className="py-1 px-2 w-8 text-gray-600">{m.san}</td>
                                    <td className="py-1 px-2">{m.text}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'chat' && gameMode === 'ai' && (
                <div className="flex flex-col h-full p-2">
                    <div className="flex-grow space-y-2 mb-2">
                        {chatHistory.map((m, i) => (
                            <div key={i} className={`p-2 rounded text-xs max-w-[85%] ${m.role === 'user' ? 'self-end bg-blue-600 text-white' : 'self-start bg-gray-700 text-gray-200'}`}>{m.text}</div>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-auto sticky bottom-0 bg-[#0f172a] pt-2">
                        <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} className="flex-grow bg-gray-800 text-white text-xs p-2 rounded border border-gray-600" placeholder="Message Rival..." />
                        <button onClick={handleSendMessage} className="text-blue-400"><Send size={16} /></button>
                    </div>
                </div>
            )}

            {activeTab === 'trainer' && gameMode === 'ai' && (
                <div className="p-4 space-y-4">
                    <TrainerCard stats={trainerStats} xpState={xpState} />
                    <MissionTracker missions={missions} />
                </div>
            )}
        </div>

        {/* PLAYER CARD & CONTROLS */}
        <div className="bg-gray-800/50 flex flex-col border-t border-gray-700">
             <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-blue-500 bg-gray-700 flex items-center justify-center overflow-hidden relative">
                        <PokemonPiece pokemonDef={TEAM_PRESETS[bottomTheme]['k']} type='k' color={bottomColor} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-gray-300">{bottomLabel}</div>
                         <div className="flex gap-1 mt-1">
                            {(isWhiteOrientation ? capturedBlack : capturedWhite).map((p, i) => (
                                <div key={i} className="w-4 h-4"><PokemonPiece pokemonDef={TEAM_PRESETS[isWhiteOrientation ? blackTheme : whiteTheme][p]} type={p} color={isWhiteOrientation ? 'b' : 'w'} /></div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={toggleMic}
                        className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500 animate-pulse text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
                        title="Voice Control"
                    >
                        <Mic size={16} />
                    </button>
                    <div className={`text-xl font-mono font-bold ${bottomTime < 30 ? 'text-red-500 animate-pulse' : 'text-white'} bg-gray-700 px-2 py-1 rounded`}>
                        {formatTime(bottomTime)}
                    </div>
                </div>
            </div>

            <div className="flex gap-2 justify-center py-2 border-t border-gray-700/50 bg-gray-900/30">
                {['🔥', '💀', '🤡', '🥶', '👋', '🤔'].map(emoji => (
                    <button key={emoji} onClick={() => onEmote(emoji)} className="text-lg hover:scale-125 transition-transform active:scale-90">{emoji}</button>
                ))}
            </div>

            <div className="p-2 bg-gray-900 grid grid-cols-3 gap-2">
                <button onClick={undoMove} className="bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-xs font-bold">Undo</button>
                <button onClick={onFlipBoard} className="bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-xs font-bold">Flip</button>
                <button onClick={resetGame} className="bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded text-xs font-bold">New Game</button>
            </div>
        </div>
    </div>
  );
};

export default GameInfo;
