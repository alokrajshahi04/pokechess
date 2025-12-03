
import React, { useState, useEffect, useCallback } from 'react';
import { Move } from 'chess.js';
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
import { GameMode, AppView, TeamTheme, GameVariant, XPState, Mission, TrainerStats, ShopItem } from './types';
import { DAILY_MISSIONS, ACHIEVEMENTS } from './constants';
import { GameProvider, useGameContext } from './context/GameContext';
import { Toaster, toast } from 'react-hot-toast';
import { playStartSound, playLevelUpSound } from './utils/sound';
import { BookOpen } from 'lucide-react';
import { peerService } from './utils/peerService';

const PageTransition = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
    <div className={`animate-fade-in w-full h-full ${className}`}>
        {children}
    </div>
);

const GameContent: React.FC = () => {
    const gameContext = useGameContext();
    const [view, setView] = useState<AppView>('hero');
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [showOnlineModal, setShowOnlineModal] = useState(false);
    const [showPokedex, setShowPokedex] = useState(false);

    const [xpState, setXpState] = useState<XPState>({ current: 0, level: 1, max: 100 });
    const [coins, setCoins] = useState(100);
    const [inventory, setInventory] = useState<string[]>(['theme_classic_hero', 'theme_classic_villain']);
    const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);

    const [missions, setMissions] = useState<Mission[]>(DAILY_MISSIONS);
    const [trainerStats, setTrainerStats] = useState<TrainerStats>({
        gamesPlayed: 0, wins: 0, losses: 0, draws: 0, highestStreak: 0, currentStreak: 0, rating: 1000
    });

    const addXp = useCallback((amount: number) => {
        if (gameContext.state.gameMode !== 'ai') return;
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
    }, [gameContext.state.gameMode]);

    const handleUpdateMissions = useCallback((payload: { move: Move; inCheck: boolean }) => {
        const { move, inCheck } = payload;
        setMissions(prev => prev.map(m => {
            if (m.completed) return m;
            let p = 0;
            if (m.type === 'capture' && (move.flags.includes('c') || move.flags.includes('e'))) p = 1;
            if (m.type === 'move') p = 1;
            if (m.type === 'check' && inCheck) p = 1;
            if (p > 0) {
                const nc = m.current + p;
                if (nc >= m.target) {
                    toast(`Mission: ${m.description}`, { icon: '🎖️' });
                    addXp(m.rewardXp);
                    setCoins(c => c + 25);
                    return { ...m, current: nc, completed: true };
                }
                return { ...m, current: nc };
            }
            return m;
        }));
    }, [addXp]);

    const handleGameComplete = useCallback((payload: {
        winner: 'w' | 'b' | 'draw';
        reason?: string;
        gameMode: GameMode;
        boardOrientation: 'white' | 'black';
        isDraw: boolean;
    }) => {
        const { winner, gameMode, boardOrientation, isDraw } = payload;

        if (isDraw) {
            setTrainerStats(prev => ({
                ...prev,
                draws: prev.draws + 1,
                currentStreak: 0,
                gamesPlayed: prev.gamesPlayed + 1
            }));
        } else if (gameMode === 'ai') {
            const playerWon = winner === (boardOrientation === 'white' ? 'w' : 'b');
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
        } else {
            setTrainerStats(prev => ({ ...prev, gamesPlayed: prev.gamesPlayed + 1 }));
        }
    }, [addXp]);

    const checkAchievements = useCallback(() => {
        ACHIEVEMENTS.forEach(ach => {
            if (!unlockedAchievements.includes(ach.id) && ach.condition(trainerStats)) {
                setUnlockedAchievements(prev => [...prev, ach.id]);
                toast(`Achievement Unlocked: ${ach.title}`, { icon: ach.icon });
                setCoins(prev => prev + 100);
            }
        });
    }, [trainerStats, unlockedAchievements]);

    useEffect(() => {
        checkAchievements();
    }, [checkAchievements]);

    const onStartBtnClick = (mode: GameMode) => {
        gameContext.setGameMode(mode);
        if (mode === 'online') {
            setShowOnlineModal(true);
        } else {
            setShowSetupModal(true);
        }
    };

    const handleOnlineJoin = (hostStatus: boolean) => {
        gameContext.setHostStatus(hostStatus);
        setShowOnlineModal(false);
        if (hostStatus) {
            gameContext.setBoardOrientation('white');
            setShowSetupModal(true);
        } else {
            gameContext.setBoardOrientation('black');
            toast('You are playing as BLACK - board auto-flipped!', { icon: '♚', duration: 3000 });
            gameContext.startGame({ playSound: true, orientation: 'black' }).then(() => {
                setView('game');
            });
        }
    };

    const handleSetupConfirm = async (variant: GameVariant, wTheme: TeamTheme, bTheme: TeamTheme) => {
        gameContext.setGameVariant(variant);
        gameContext.setThemes(wTheme, bTheme);
        setShowSetupModal(false);

        if (gameContext.state.gameMode === 'online') {
            peerService.send({
                type: 'config',
                payload: { variant, wTheme, bTheme }
            });
        }

        await gameContext.startGame({ playSound: true });
        setView('game');
    };

    const exitToLanding = () => {
        gameContext.exitGame();
        setView('landing');
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

            {gameContext.state.promotionMove && (
                <PromotionModal
                    color={gameContext.state.turn}
                    onSelect={gameContext.handlePromotionSelect}
                    onClose={gameContext.clearPromotion}
                />
            )}

            <div className="pointer-events-none fixed inset-0 z-0 bg-noise opacity-[0.03] mix-blend-overlay"></div>

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
                    {showSetupModal && (
                        <TeamSelectionModal
                            gameMode={gameContext.state.gameMode}
                            onConfirm={handleSetupConfirm}
                            onCancel={() => setShowSetupModal(false)}
                            inventory={inventory}
                        />
                    )}
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
                    <div className="w-full lg:flex-grow flex justify-center lg:justify-end order-1">
                        <ChessBoard
                            game={gameContext.chess}
                            board={gameContext.displayedBoard}
                            selectedSquare={gameContext.state.selectedSquare}
                            possibleMoves={gameContext.state.validDestinations}
                            lastMove={gameContext.state.lastMove}
                            onSquareClick={gameContext.handleSquareClick}
                            orientation={gameContext.state.boardOrientation}
                            boardEffect={gameContext.state.boardEffect}
                            whiteTheme={gameContext.state.whiteTheme}
                            blackTheme={gameContext.state.blackTheme}
                            gameVariant={gameContext.state.gameVariant}
                            emotes={gameContext.state.emotes}
                            isOnFire={trainerStats.currentStreak >= 3}
                        />
                    </div>

                    <div className="w-full lg:w-[420px] flex-shrink-0 order-2">
                        <GameInfo
                            game={gameContext.chess}
                            capturedWhite={gameContext.state.capturedWhite}
                            capturedBlack={gameContext.state.capturedBlack}
                            commentary={gameContext.state.commentary}
                            difficulty={gameContext.state.difficulty}
                            gameMode={gameContext.state.gameMode}
                            orientation={gameContext.state.boardOrientation}
                            setDifficulty={gameContext.setDifficulty}
                            resetGame={() => gameContext.resetGame()}
                            undoMove={gameContext.undoMove}
                            onFlipBoard={gameContext.flipBoard}
                            onExit={exitToLanding}
                            isAiThinking={gameContext.state.isAiThinking}
                            whiteTime={gameContext.state.whiteTime}
                            blackTime={gameContext.state.blackTime}
                            whiteTheme={gameContext.state.whiteTheme}
                            blackTheme={gameContext.state.blackTheme}
                            xpState={xpState}
                            missions={missions}
                            trainerStats={trainerStats}
                            isGameOver={gameContext.chess.isGameOver()}
                            onEmote={(e) => gameContext.handleEmote(e, undefined)}
                            onVoiceCommand={gameContext.handleVoiceCommand}
                            replayIndex={gameContext.state.replayIndex}
                            setReplayIndex={gameContext.setReplayIndex}
                            p2pScore={gameContext.state.p2pScore}
                            coins={coins}
                            inventory={inventory}
                            onBuyItem={handleBuyItem}
                            onOpenTower={() => setView('tower')}
                            isHost={gameContext.state.isHost}
                        />
                    </div>
                </PageTransition>
            )}
        </div>
    );
};

const AppContainer: React.FC = () => {
    const [callbacks] = useState({
        onAddXp: (amount: number) => { },
        onUpdateMissions: (payload: { move: Move; inCheck: boolean }) => { },
        onGameComplete: (payload: any) => { }
    });

    return (
        <GameProvider
            onAddXp={callbacks.onAddXp}
            onUpdateMissions={callbacks.onUpdateMissions}
            onGameComplete={callbacks.onGameComplete}
        >
            <GameContent />
        </GameProvider>
    );
};

const App: React.FC = () => {
    return <AppContainer />;
};

export default App;
