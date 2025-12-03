
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Square, Move } from 'chess.js';
import ChessBoard from './components/ChessBoard';
import GameInfo from './components/GameInfo';
import LandingPage from './components/LandingPage';
import Onboarding from './components/Onboarding';
import HeroPage from './components/HeroPage';
import PromotionModal from './components/PromotionModal';
import TeamSelectionModal from './components/TeamSelectionModal';
import OnlineModal from './components/OnlineModal';
import Pokedex from './components/Pokedex';
import './index.css';
import TrainerTower from './components/TrainerTower'; 
import { getAIMove } from './services/geminiService';
import { 
    GameDifficulty, PieceType, GameMode, AppView, BoardOrientation, BoardEffect, AnimationType,
    TeamTheme, GameVariant, Emote, XPState, Mission, TrainerStats, ShopItem,
    OnlineMovePayload, OnlineSyncSnapshotPayload, OnlineSyncAckPayload, OnlineMessage
} from './types';
import { SPECIAL_ATTACKS, MOVE_ANIMATIONS, TEAM_PRESETS, KOTH_SQUARES, DAILY_MISSIONS, ACHIEVEMENTS } from './constants';
import { parseVoiceCommand } from './utils/voiceControl';
import { peerService } from './utils/peerService';
import { Toaster, toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { 
    playMoveSound, playCheckSound, playWinSound, playStartSound, 
    playThunderSound, playFireSound, playPsychicSound, playSlamSound, playTeleportSound, playGhostSound,
    playCritSound, playLevelUpSound, playEmoteSound
} from './utils/sound';
import { BookOpen } from 'lucide-react';

const INITIAL_TIME = 600;

// Simple hash function for FEN strings
const hashFEN = (fen: string): string => {
    let hash = 0;
    for (let i = 0; i < fen.length; i++) {
        const char = fen.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
};

// Simple Page Transition Wrapper
const PageTransition = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
    <div className={`animate-fade-in w-full h-full ${className}`}>
        {children}
    </div>
);

const App: React.FC = () => {
  const chessRef = useRef(new Chess());
  
  const [view, setView] = useState<AppView>('hero');
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [isHost, setIsHost] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [showPokedex, setShowPokedex] = useState(false);
  const [boardOrientation, setBoardOrientation] = useState<BoardOrientation>('white');
  const [gameVariant, setGameVariant] = useState<GameVariant>('standard');
  const [whiteTheme, setWhiteTheme] = useState<TeamTheme>('classic_hero');
  const [blackTheme, setBlackTheme] = useState<TeamTheme>('classic_villain');

  const [board, setBoard] = useState(chessRef.current.board());
  const [turn, setTurn] = useState(chessRef.current.turn());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validDestinations, setValidDestinations] = useState<string[]>([]);
  const [boardEffect, setBoardEffect] = useState<BoardEffect | null>(null);
  const [promotionMove, setPromotionMove] = useState<{ from: string; to: string } | null>(null);
  
  const [commentary, setCommentary] = useState<string>("");
  const [difficulty, setDifficulty] = useState<GameDifficulty>(GameDifficulty.MEDIUM);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [capturedWhite, setCapturedWhite] = useState<PieceType[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<PieceType[]>([]);
  
  const [whiteTime, setWhiteTime] = useState(INITIAL_TIME);
  const [blackTime, setBlackTime] = useState(INITIAL_TIME);
  const timerIntervalRef = useRef<number | null>(null);
  const whiteTimeRef = useRef(whiteTime);
  const blackTimeRef = useRef(blackTime);
  const isHostRef = useRef(isHost);
  const syncInFlightRef = useRef(false);
  const syncToastIdRef = useRef<string | undefined>(undefined);
  const syncTimeoutRef = useRef<number | undefined>(undefined);

  // Stats & Economy
  const [xpState, setXpState] = useState<XPState>({ current: 0, level: 1, max: 100 });
  const [coins, setCoins] = useState(100); 
  const [inventory, setInventory] = useState<string[]>(['theme_classic_hero', 'theme_classic_villain']); 
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);

  const [p2pScore, setP2pScore] = useState({ white: 0, black: 0 }); 
  const p2pScoreRef = useRef(p2pScore);
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const [missions, setMissions] = useState<Mission[]>(DAILY_MISSIONS);
  const [trainerStats, setTrainerStats] = useState<TrainerStats>({
      gamesPlayed: 0, wins: 0, losses: 0, draws: 0, highestStreak: 0, currentStreak: 0, rating: 1000 
  });
  const [replayIndex, setReplayIndex] = useState(-1);

  // Keep refs in sync with state for async callbacks
  useEffect(() => { whiteTimeRef.current = whiteTime; }, [whiteTime]);
  useEffect(() => { blackTimeRef.current = blackTime; }, [blackTime]);
  useEffect(() => { p2pScoreRef.current = p2pScore; }, [p2pScore]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  const buildSyncSnapshot = useCallback((reason?: string): OnlineSyncSnapshotPayload => {
    const game = chessRef.current;
    const fen = game.fen();
    return {
      fen,
      fenHash: hashFEN(fen),
      historyLength: game.history().length,
      whiteTime: whiteTimeRef.current,
      blackTime: blackTimeRef.current,
      variant: gameVariant,
      whiteTheme,
      blackTheme,
      score: { ...p2pScoreRef.current },
      reason
    };
  }, [gameVariant, whiteTheme, blackTheme]);

  const sendStateSnapshot = useCallback((reason?: string) => {
    if (gameMode !== 'online' || !isHostRef.current) return;
    const snapshot = buildSyncSnapshot(reason);
    peerService.send({ type: 'state', payload: snapshot });
  }, [buildSyncSnapshot, gameMode]);

  const sendSyncRequest = useCallback((reason?: string) => {
    if (gameMode !== 'online') return;

    if (isHostRef.current) {
      toast('Pushing board state to opponent...', { icon: '📤', duration: 2000 });
      sendStateSnapshot(reason);
      return;
    }

    if (syncInFlightRef.current) {
      toast('Sync already in progress', { icon: '⏳', duration: 2000 });
      return;
    }

    syncInFlightRef.current = true;
    const message = reason ? `Requesting sync (${reason})...` : 'Requesting board sync...';
    const toastId = toast.loading(message, { icon: '🔄' });
    syncToastIdRef.current = toastId;

    const snapshot = buildSyncSnapshot(reason);
    peerService.send({ type: 'syncRequest', payload: snapshot });

    // Auto-clear the sync flag after timeout (5 seconds)
    if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = window.setTimeout(() => {
      if (syncInFlightRef.current) {
        syncInFlightRef.current = false;
        if (syncToastIdRef.current) {
          toast.error('Sync request timed out', { id: syncToastIdRef.current });
          syncToastIdRef.current = undefined;
        }
      }
    }, 5000);
  }, [buildSyncSnapshot, gameMode, sendStateSnapshot]);

  const handleSyncDiscrepancy = useCallback((reason: string) => {
    if (gameMode !== 'online') return;

    if (isHostRef.current) {
      toast.error(`Opponent desynced (${reason}). Sending canonical board.`, { duration: 3000 });
      sendStateSnapshot(reason);
    } else {
      sendSyncRequest(reason);
    }
  }, [gameMode, sendStateSnapshot, sendSyncRequest]);

  const handleManualResync = useCallback(() => {
    if (gameMode !== 'online') return;
    sendSyncRequest('Manual resync');
  }, [gameMode, sendSyncRequest]);

  const displayedBoard = React.useMemo(() => {
      if (replayIndex === -1) return board;
      const tempGame = new Chess();
      const history = chessRef.current.history();
      for (let i = 0; i <= replayIndex; i++) {
          tempGame.move(history[i]);
      }
      return tempGame.board();
  }, [replayIndex, board]);

  const handleEmote = (emoji: string, originSquare?: string, remote = false) => {
      const playerColor = boardOrientation === 'white' ? 'w' : 'b'; 
      
      let kingSquare = originSquare;
      if (!kingSquare) {
           for(let r=0; r<8; r++) {
              for(let c=0; c<8; c++) {
                  const p = board[r][c];
                  if(p && p.type === 'k' && p.color === playerColor) kingSquare = `${['a','b','c','d','e','f','g','h'][c]}${['8','7','6','5','4','3','2','1'][r]}`;
              }
          }
      }

      if(kingSquare) {
          playEmoteSound();
          const id = Date.now().toString();
          setEmotes(prev => [...prev, { id, emoji, square: kingSquare! }]);
          setTimeout(() => setEmotes(prev => prev.filter(e => e.id !== id)), 2000);
          
          if (!remote && gameMode === 'online') {
              peerService.send({ type: 'emote', payload: { emoji, square: kingSquare } });
          }
      }
  };

  const addXp = (amount: number) => {
      if (gameMode !== 'ai') return;
      setXpState(prev => {
          let newCurrent = prev.current + amount;
          let newLevel = prev.level;
          let newMax = prev.max;
          if (newCurrent >= newMax) {
              newLevel++;
              newCurrent -= newMax;
              newMax = Math.floor(newMax * 1.2);
              playLevelUpSound();
              toast(`Level Up! You are now Lvl ${newLevel}`, { icon: '🆙', style: { background: '#fbbf24', color: '#000' } });
          }
          return { current: newCurrent, level: newLevel, max: newMax };
      });
  };

  const checkAchievements = () => {
      ACHIEVEMENTS.forEach(ach => {
          if (!unlockedAchievements.includes(ach.id) && ach.condition(trainerStats)) {
              setUnlockedAchievements(prev => [...prev, ach.id]);
              toast(`Achievement Unlocked: ${ach.title}`, { icon: ach.icon });
              setCoins(prev => prev + 100); 
          }
      });
  };

  useEffect(() => {
      checkAchievements();
  }, [trainerStats]);

  const triggerAnimation = (type: AnimationType | 'crit', targetSquare: string, variant: '1x1' | '3x3') => {
      setBoardEffect({ type, targetSquare, variant });
      switch(type) {
          case 'crit': playCritSound(); break;
          case 'thunderbolt': playThunderSound(); break;
          case 'fireblast': playFireSound(); break;
          case 'psychic': case 'shadowball': playPsychicSound(); break;
          case 'slam': case 'rockslide': playSlamSound(); break;
          case 'teleport': playTeleportSound(); break;
          case 'shadow': playGhostSound(); break;
          default: playMoveSound();
      }
      setTimeout(() => setBoardEffect(null), 800);
  };

  const handleGameOver = useCallback((winner?: 'w' | 'b' | 'draw', reason?: string) => {
      const game = chessRef.current;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      
      const actualWinner = winner || (game.turn() === 'w' ? 'b' : 'w');
      const isDraw = winner === 'draw' || game.isDraw();

      if (isDraw) {
          toast(reason ? `Draw: ${reason}` : "It's a Draw!", { icon: '🤝' });
          setTrainerStats(prev => ({...prev, draws: prev.draws + 1, currentStreak: 0, gamesPlayed: prev.gamesPlayed + 1}));
      } else {
          playWinSound();
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          const winText = actualWinner === 'w' ? "White Wins!" : "Black Wins!";
          toast(reason ? `${winText} (${reason})` : winText, { icon: '🏆' });

          if (gameMode !== 'ai') {
              setP2pScore(prev => ({
                  white: actualWinner === 'w' ? prev.white + 1 : prev.white,
                  black: actualWinner === 'b' ? prev.black + 1 : prev.black
              }));
          } else {
              const playerWon = actualWinner === (boardOrientation === 'white' ? 'w' : 'b');
              if (playerWon) {
                   addXp(100);
                   setCoins(prev => prev + 50); 
                   setTrainerStats(prev => ({
                       ...prev, 
                       wins: prev.wins + 1, 
                       currentStreak: prev.currentStreak + 1, 
                       highestStreak: Math.max(prev.highestStreak, prev.currentStreak + 1),
                       gamesPlayed: prev.gamesPlayed + 1,
                       rating: prev.rating + 25 
                   }));
              } else {
                   setTrainerStats(prev => ({
                       ...prev, 
                       losses: prev.losses + 1, 
                       currentStreak: 0, 
                       gamesPlayed: prev.gamesPlayed + 1,
                       rating: Math.max(0, prev.rating - 15) 
                   }));
              }
          }
      }
  }, [boardOrientation, gameMode]);

  useEffect(() => {
    if (view !== 'game' || chessRef.current.isGameOver()) return;
    timerIntervalRef.current = window.setInterval(() => {
        if (turn === 'w') {
            setWhiteTime(prev => prev <= 1 ? (handleGameOver('b', 'Timeout'), 0) : prev - 1);
        } else {
            setBlackTime(prev => prev <= 1 ? (handleGameOver('w', 'Timeout'), 0) : prev - 1);
        }
    }, 1000);
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [view, turn, handleGameOver]);

  const updateGameState = useCallback((move?: Move, remoteMove = false) => {
    const game = chessRef.current;
    setBoard(game.board());
    setTurn(game.turn());
    
    // Captured pieces logic
    const currentPieces: Record<string, number> = { wp:0, wn:0, wb:0, wr:0, wq:0, wk:0, bp:0, bn:0, bb:0, br:0, bq:0, bk:0 };
    game.board().flat().forEach(p => { if (p) currentPieces[`${p.color}${p.type}`]++; });
    const startingCounts: Record<string, number> = { wp:8, wn:2, wb:2, wr:2, wq:1, wk:1, bp:8, bn:2, bb:2, br:2, bq:1, bk:1 };
    const newCapturedWhite: PieceType[] = [];
    const newCapturedBlack: PieceType[] = [];
    (['p','n','b','r','q'] as PieceType[]).forEach(t => {
        for(let i=0; i < startingCounts[`w${t}`] - (currentPieces[`w${t}`] || 0); i++) newCapturedWhite.push(t);
        for(let i=0; i < startingCounts[`b${t}`] - (currentPieces[`b${t}`] || 0); i++) newCapturedBlack.push(t);
    });
    setCapturedWhite(newCapturedWhite);
    setCapturedBlack(newCapturedBlack);

    if (move) {
        if (gameMode === 'online' && !remoteMove) {
            const fen = game.fen();
            peerService.send({
                type: 'move',
                payload: {
                    from: move.from,
                    to: move.to,
                    promotion: move.promotion,
                    fen,
                    fenHash: hashFEN(fen),
                    historyLength: game.history().length
                } as OnlineMovePayload
            });
        }

        if (gameMode === 'ai') {
             setMissions(prev => prev.map(m => {
                if (m.completed) return m;
                let p = 0;
                if (m.type === 'capture' && (move.flags.includes('c') || move.flags.includes('e'))) p=1;
                if (m.type === 'move') p=1;
                if (m.type === 'check' && game.inCheck()) p=1;
                if(p>0) {
                     const nc = m.current + p;
                     if(nc>=m.target) { toast(`Mission: ${m.description}`, {icon: '🎖️'}); addXp(m.rewardXp); setCoins(c=>c+25); return {...m, current:nc, completed:true}; }
                     return {...m, current:nc};
                }
                return m;
            }));
        }

        const isCapture = move.flags.includes('c') || move.flags.includes('e');
        const theme = move.color === 'w' ? whiteTheme : blackTheme;
        const pokemon = TEAM_PRESETS[theme][move.piece];
        const primaryType = pokemon.types[0];

        if (isCapture) {
            if (Math.random() < 0.15) {
                triggerAnimation('crit', move.to, '3x3');
                addXp(50);
            } else {
                const attackType = SPECIAL_ATTACKS[primaryType] || 'rockslide';
                triggerAnimation(attackType, move.to, '3x3');
                addXp(20);
            }
        } else {
            const moveType = MOVE_ANIMATIONS[primaryType];
            if (moveType) triggerAnimation(moveType, move.to, '1x1');
            else game.inCheck() ? playCheckSound() : playMoveSound();
        }
    }
    
    if (gameVariant === 'koth' && move && move.piece === 'k' && KOTH_SQUARES.includes(move.to)) {
         handleGameOver(move.color, 'King of the Hill');
         return;
    }
    if (game.isGameOver()) handleGameOver();

  }, [handleGameOver, whiteTheme, blackTheme, gameVariant, gameMode]);

  const applyRemoteState = useCallback((snapshot: OnlineSyncSnapshotPayload) => {
    try {
      const game = chessRef.current;
      game.load(snapshot.fen);

      whiteTimeRef.current = snapshot.whiteTime;
      blackTimeRef.current = snapshot.blackTime;
      p2pScoreRef.current = snapshot.score;

      setWhiteTime(snapshot.whiteTime);
      setBlackTime(snapshot.blackTime);
      setGameVariant(snapshot.variant);
      setWhiteTheme(snapshot.whiteTheme);
      setBlackTheme(snapshot.blackTheme);
      setP2pScore(snapshot.score);
      setLastMove(null);
      setSelectedSquare(null);
      setValidDestinations([]);
      setPromotionMove(null);
      setBoardEffect(null);
      setReplayIndex(-1);

      updateGameState();

      if (!isHostRef.current) {
        if (syncToastIdRef.current) {
          toast.success('Board synchronized', { id: syncToastIdRef.current });
        } else if (snapshot.reason && snapshot.reason !== 'initial') {
          toast.success('Board synchronized');
        }
        syncInFlightRef.current = false;
        syncToastIdRef.current = undefined;
        if (syncTimeoutRef.current) {
          window.clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = undefined;
        }
      } else if (snapshot.reason && snapshot.reason !== 'initial') {
        toast.success('Applied board state');
      }

      return true;
    } catch (error) {
      console.error('Failed to apply remote state', error);
      if (!isHostRef.current) {
        if (syncToastIdRef.current) {
          toast.error('Failed to apply board sync', { id: syncToastIdRef.current });
        } else {
          toast.error('Failed to apply board sync');
        }
        syncInFlightRef.current = false;
        syncToastIdRef.current = undefined;
        if (syncTimeoutRef.current) {
          window.clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = undefined;
        }
      } else {
        toast.error('Failed to apply remote state');
      }
      return false;
    }
  }, [updateGameState]);

  const handleStateMessage = useCallback((payload: OnlineSyncSnapshotPayload) => {
    const success = applyRemoteState(payload);

    if (!isHostRef.current) {
      const ackSnapshot = buildSyncSnapshot(payload.reason);
      const ackPayload: OnlineSyncAckPayload = {
        ...ackSnapshot,
        success,
        message: success ? 'State applied' : 'Failed to apply state'
      };
      peerService.send({ type: 'syncAck', payload: ackPayload });
    }
  }, [applyRemoteState, buildSyncSnapshot]);

  const handleSyncRequest = useCallback((payload: OnlineSyncSnapshotPayload) => {
    if (!isHostRef.current) {
      console.warn('Received sync request but not host; ignoring.');
      return;
    }
    toast('Peer requested board sync', { icon: '🔄', duration: 2000 });
    sendStateSnapshot(payload.reason ?? 'sync request');
  }, [sendStateSnapshot]);

  const handleSyncAck = useCallback((payload: OnlineSyncAckPayload) => {
    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = undefined;
    }
    if (payload.success) {
      toast.success('Opponent synchronized', { icon: '✅', duration: 2500 });
    } else {
      toast.error(`Opponent failed to sync: ${payload.message ?? 'Unknown error'}`, { icon: '❌', duration: 3000 });
    }
  }, []);

  const handleRemoteMove = useCallback((payload: OnlineMovePayload) => {
    const game = chessRef.current;
    try {
      const moveResult = game.move({ from: payload.from, to: payload.to, promotion: payload.promotion });
      if (!moveResult) {
        throw new Error('Move could not be applied');
      }

      setLastMove({ from: moveResult.from, to: moveResult.to });
      updateGameState(moveResult, true);

      const localFen = game.fen();
      const localHash = hashFEN(localFen);
      const localHistory = game.history().length;

      const fenMismatch = payload.fen && payload.fen !== localFen;
      const hashMismatch = payload.fenHash && payload.fenHash !== localHash;
      const historyMismatch = payload.historyLength !== undefined && payload.historyLength !== localHistory;

      if (fenMismatch || hashMismatch || historyMismatch) {
        const reason = fenMismatch ? 'FEN mismatch' : historyMismatch ? 'History mismatch' : 'Hash mismatch';
        handleSyncDiscrepancy(reason);
      } else {
        toast.success('Opponent moved!');
      }
    } catch (error) {
      console.error('Invalid remote move', error);
      handleSyncDiscrepancy('Invalid move');
    }
  }, [handleSyncDiscrepancy, updateGameState]);

  const handleVoiceCommand = useCallback((transcript: string) => {
      if (isAiThinking || chessRef.current.isGameOver() || replayIndex !== -1) return;
      const parsedMove = parseVoiceCommand(transcript);
      if (parsedMove) {
          try {
              const move = chessRef.current.move(parsedMove); 
              if (move) {
                  setLastMove({ from: move.from, to: move.to });
                  updateGameState(move);
                  toast.success(`Voice Move: ${move.san}`);
              } else {
                  toast.error(`Invalid move: ${parsedMove}`);
              }
          } catch (e) {
              toast.error("Illegal move.");
          }
      } else {
          toast.error("Command not recognized.");
      }
  }, [isAiThinking, updateGameState, replayIndex]); 

  const onStartBtnClick = (mode: GameMode) => { 
      setGameMode(mode); 
      if (mode === 'online') {
          setShowOnlineModal(true);
      } else {
          setShowSetupModal(true); 
      }
  };

  const handleOnlineJoin = (hostStatus: boolean) => {
      setIsHost(hostStatus);
      setShowOnlineModal(false);
      if (hostStatus) {
          setBoardOrientation('white');
          setShowSetupModal(true); 
      } else {
          setBoardOrientation('black');
          toast('You are playing as BLACK - board auto-flipped!', { icon: '♚', duration: 3000 });
          setView('game'); 
      }
  };

  const handleSetupConfirm = (variant: GameVariant, wTheme: TeamTheme, bTheme: TeamTheme) => {
      setGameVariant(variant); setWhiteTheme(wTheme); setBlackTheme(bTheme); setShowSetupModal(false); 
      if (gameMode === 'online') {
          peerService.send({ type: 'config', payload: { variant, wTheme, bTheme } });
      }
      startGame();
  };

  const startGame = (playSound = true) => {
    setView('loading');
    if (gameMode !== 'online') setBoardOrientation('white');
    if (playSound) playStartSound();
    
    setTimeout(() => {
        chessRef.current = new Chess();
        whiteTimeRef.current = INITIAL_TIME;
        blackTimeRef.current = INITIAL_TIME;
        setWhiteTime(INITIAL_TIME); setBlackTime(INITIAL_TIME);
        setLastMove(null); setSelectedSquare(null); setValidDestinations([]);
        setCommentary(""); setEmotes([]); 
        setReplayIndex(-1);
        updateGameState();
        if (gameMode === 'online' && isHostRef.current) {
            sendStateSnapshot('initial');
        }
        setView('game');
    }, 1500);
  };
  
  const resetGame = (remote = false) => {
      if (gameMode === 'online' && !remote) {
          peerService.send({ type: 'restart', payload: {} });
      }
      startGame();
  };
  
  // --- ONLINE MESSAGE HANDLER ---
  useEffect(() => {
    const handleMessage = (msg: OnlineMessage) => {
      if (msg.type === 'move') {
        handleRemoteMove(msg.payload);
      } else if (msg.type === 'config') {
        const { variant, wTheme, bTheme } = msg.payload;
        setGameVariant(variant);
        setWhiteTheme(wTheme);
        setBlackTheme(bTheme);
        startGame(false);
      } else if (msg.type === 'state') {
        handleStateMessage(msg.payload);
      } else if (msg.type === 'syncRequest') {
        handleSyncRequest(msg.payload);
      } else if (msg.type === 'syncAck') {
        handleSyncAck(msg.payload);
      } else if (msg.type === 'emote') {
        handleEmote(msg.payload.emoji, msg.payload.square, true);
      } else if (msg.type === 'restart') {
        resetGame(true);
        toast("Host restarted the game.");
      }
    };

    peerService.onData(handleMessage);
  }, [handleEmote, handleRemoteMove, handleStateMessage, handleSyncAck, handleSyncRequest, resetGame, startGame]);

  const exitToLanding = () => { 
      setView('landing'); 
      if(timerIntervalRef.current) clearInterval(timerIntervalRef.current); 
  };

  const makeAIMove = useCallback(async () => {
    const game = chessRef.current;
    if (game.isGameOver() || game.turn() === 'w') return;
    setIsAiThinking(true);
    try {
        const aiResult = await getAIMove(game.fen(), game.moves(), difficulty, game.history());
        const move = game.move(aiResult.move);
        if (move) {
            setLastMove({ from: move.from, to: move.to });
            setCommentary(aiResult.commentary);
            updateGameState(move);
        }
    } catch (e) { console.error(e); } finally { setIsAiThinking(false); }
  }, [difficulty, updateGameState]);

  useEffect(() => {
    if (gameMode === 'ai' && turn === 'b' && !chessRef.current.isGameOver()) {
        const t = setTimeout(makeAIMove, 500);
        return () => clearTimeout(t);
    }
  }, [turn, makeAIMove, gameMode]);

  const handleSquareClick = useCallback((square: Square) => {
    if (replayIndex !== -1) return;
    const game = chessRef.current;
    if (isAiThinking || game.isGameOver() || promotionMove) return;
    
    if (gameMode === 'ai' && game.turn() === 'b') return;
    
    if (gameMode === 'online') {
        // In online mode: host is white, guest is black
        const myColor = isHost ? 'w' : 'b';
        if (game.turn() !== myColor) return;
    }

    if (selectedSquare === square) { setSelectedSquare(null); setValidDestinations([]); return; }

    if (selectedSquare) {
        const piece = game.get(selectedSquare);
        if (piece?.type === 'p' && ((piece.color === 'w' && square[1] === '8') || (piece.color === 'b' && square[1] === '1'))) {
            if (validDestinations.includes(square)) { setPromotionMove({ from: selectedSquare, to: square }); return; }
        }
        try {
            const moveResult = game.move({ from: selectedSquare, to: square, promotion: 'q' });
            if (moveResult) {
                setLastMove({ from: moveResult.from, to: moveResult.to });
                setSelectedSquare(null); setValidDestinations([]);
                updateGameState(moveResult);
                return;
            }
        } catch {}
    }

    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        setValidDestinations(game.moves({ square, verbose: true }).map(m => m.to));
    } else { setSelectedSquare(null); setValidDestinations([]); }
  }, [boardOrientation, gameMode, isAiThinking, promotionMove, replayIndex, selectedSquare, updateGameState, validDestinations]);

  const handlePromotionSelect = (type: PieceType) => {
      if (!promotionMove) return;
      const game = chessRef.current;
      const move = game.move({ from: promotionMove.from, to: promotionMove.to, promotion: type });
      if (move) { setLastMove({ from: move.from, to: move.to }); updateGameState(move); playPsychicSound(); }
      setPromotionMove(null); setSelectedSquare(null); setValidDestinations([]);
  };

  const undoMove = () => {
    if (isAiThinking || replayIndex !== -1 || gameMode === 'online') return; 
    const game = chessRef.current;
    if(game.history().length === 0) return;
    game.undo();
    if(gameMode === 'ai') game.undo(); 
    setLastMove(null); setSelectedSquare(null); setValidDestinations([]);
    playMoveSound(); updateGameState();
  };

  const handleBuyItem = (item: ShopItem) => {
      if (coins >= item.cost) {
          setCoins(c => c - item.cost);
          setInventory(i => [...i, item.id]);
          toast.success(`Purchased ${item.name}!`);
      } else {
          toast.error("Not enough coins!");
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 lg:p-6 font-sans relative overflow-x-hidden overflow-y-hidden text-slate-50">
      <Toaster position="top-center" toastOptions={{
          style: {
              background: '#1e293b',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          }
      }} />
      {promotionMove && <PromotionModal color={turn} onSelect={handlePromotionSelect} onClose={() => setPromotionMove(null)} />}
      
      {/* Premium Noise Overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-noise opacity-[0.03] mix-blend-overlay"></div>
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-black opacity-90"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-slate-950/0 to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-blue-500/5 via-slate-950/0 to-transparent"></div>
      </div>
      
      {view === 'hero' && (
          <PageTransition className="z-50 flex items-center justify-center relative">
             <HeroPage onEnter={() => { playStartSound(); setView('onboarding'); }} />
          </PageTransition>
      )}

      {view === 'onboarding' && (
          <PageTransition className="z-50 min-h-screen flex items-center justify-center relative">
             <Onboarding onComplete={() => setView('landing')} />
          </PageTransition>
      )}

      {view === 'tower' && (
          <PageTransition className="z-20 min-h-screen w-full relative">
             <TrainerTower onExit={() => setView('landing')} onScore={(s) => { setCoins(c => c + s); setView('landing'); }} />
          </PageTransition>
      )}
      
      {view === 'landing' && (
          <PageTransition className="z-20 w-full h-full flex flex-col relative">
             <button 
                onClick={() => setShowPokedex(true)} 
                className="fixed top-3 right-3 sm:top-6 sm:right-6 bg-red-600/90 backdrop-blur text-white p-2 sm:px-4 sm:py-2 rounded-full font-bold shadow-glass hover:shadow-neon-red hover:bg-red-500 hover:scale-105 active:scale-95 transition-all z-50 flex items-center gap-2 border border-red-400/30"
                aria-label="Open Pokedex"
             >
                 <BookOpen size={20} /> <span className="hidden sm:inline">Pokedex</span>
             </button>
             {showPokedex && <Pokedex onClose={() => setShowPokedex(false)} />}
             {showOnlineModal && <OnlineModal onJoin={handleOnlineJoin} onCancel={() => setShowOnlineModal(false)} />}
             {showSetupModal && <TeamSelectionModal gameMode={gameMode} onConfirm={handleSetupConfirm} onCancel={() => setShowSetupModal(false)} inventory={inventory} />}
             <LandingPage 
                 onStartGame={onStartBtnClick} 
                 xpState={xpState}
                 trainerStats={trainerStats}
                 missions={missions}
                 coins={coins}
                 inventory={inventory}
                 onBuyItem={handleBuyItem}
                 onOpenTower={() => setView('tower')}
             />
          </PageTransition>
      )}

      {view === 'loading' && (
          <div className="min-h-screen flex items-center justify-center z-50 absolute inset-0 bg-slate-950/80 backdrop-blur-md">
             <div className="flex flex-col items-center gap-4">
                 <div className="relative w-16 h-16">
                     <div className="absolute inset-0 border-4 border-slate-700/50 rounded-full"></div>
                     <div className="absolute inset-0 border-4 border-yellow-500 rounded-full border-t-transparent animate-spin shadow-neon-yellow"></div>
                 </div>
                 <p className="text-yellow-400 font-pixel animate-pulse text-sm tracking-widest text-glow">INITIALIZING...</p>
             </div>
          </div>
      )}

      {view === 'game' && (
        <PageTransition className="z-10 flex flex-col lg:flex-row gap-6 items-center lg:items-start justify-center w-full max-w-7xl flex-1 mx-auto my-auto h-full relative">
            {/* Board Container */}
            <div className="w-full lg:flex-grow flex justify-center lg:justify-end order-1">
                <ChessBoard 
                    game={chessRef.current} board={displayedBoard} selectedSquare={selectedSquare}
                    possibleMoves={validDestinations} lastMove={lastMove} onSquareClick={handleSquareClick}
                    orientation={boardOrientation} boardEffect={boardEffect}
                    whiteTheme={whiteTheme} blackTheme={blackTheme} gameVariant={gameVariant}
                    emotes={emotes}
                    isOnFire={trainerStats.currentStreak >= 3}
                />
            </div>

            {/* Info Container */}
            <div className="w-full lg:w-[420px] flex-shrink-0 order-2">
                <GameInfo 
                    game={chessRef.current} capturedWhite={capturedWhite} capturedBlack={capturedBlack}
                    commentary={commentary} difficulty={difficulty} gameMode={gameMode} orientation={boardOrientation}
                    setDifficulty={setDifficulty} resetGame={() => resetGame()} undoMove={undoMove} onFlipBoard={() => setBoardOrientation(p => p === 'white' ? 'black' : 'white')}
                    onExit={exitToLanding} isAiThinking={isAiThinking} whiteTime={whiteTime} blackTime={blackTime}
                    whiteTheme={whiteTheme} blackTheme={blackTheme} xpState={xpState} 
                    missions={missions} trainerStats={trainerStats} isGameOver={chessRef.current.isGameOver()}
                    onEmote={(e) => handleEmote(e, undefined)} onVoiceCommand={handleVoiceCommand}
                    replayIndex={replayIndex} setReplayIndex={setReplayIndex}
                    p2pScore={p2pScore}
                    coins={coins}
                    inventory={inventory}
                    onBuyItem={handleBuyItem}
                    onOpenTower={() => setView('tower')}
                    isHost={isHost}
                    onResyncBoard={gameMode === 'online' ? handleManualResync : undefined}
                />
            </div>
        </PageTransition>
      )}
    </div>
  );
};

export default App;
