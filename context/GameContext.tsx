import React, { createContext, useContext, useReducer, useRef, useCallback, useEffect, useMemo } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import {
    GameContextValue,
    GameContextState,
    PieceType,
    GameDifficulty,
    GameMode,
    BoardOrientation,
    TeamTheme,
    GameVariant,
    Emote,
    AnimationType,
    BoardEffect,
    StartGameOptions,
    P2PScore
} from '../types';
import { SPECIAL_ATTACKS, MOVE_ANIMATIONS, TEAM_PRESETS, KOTH_SQUARES } from '../constants';
import { getAIMove } from '../services/geminiService';
import { parseVoiceCommand } from '../utils/voiceControl';
import { peerService } from '../utils/peerService';
import {
    playMoveSound, playCheckSound, playWinSound, playStartSound,
    playThunderSound, playFireSound, playPsychicSound, playSlamSound,
    playTeleportSound, playGhostSound, playCritSound, playEmoteSound
} from '../utils/sound';

const INITIAL_TIME = 600;

const DEFAULT_BOARD = new Chess().board();

type GameAction =
    | { type: 'SET_STATE'; payload: Partial<GameContextState> }
    | { type: 'SET_BOARD'; payload: GameContextState['board'] }
    | { type: 'SET_TURN'; payload: GameContextState['turn'] }
    | { type: 'SET_LAST_MOVE'; payload: GameContextState['lastMove'] }
    | { type: 'SET_SELECTED_SQUARE'; payload: GameContextState['selectedSquare'] }
    | { type: 'SET_VALID_DESTINATIONS'; payload: string[] }
    | { type: 'SET_PROMOTION_MOVE'; payload: GameContextState['promotionMove'] }
    | { type: 'SET_BOARD_EFFECT'; payload: GameContextState['boardEffect'] }
    | { type: 'SET_BOARD_ORIENTATION'; payload: BoardOrientation }
    | { type: 'SET_WHITE_TIME'; payload: number }
    | { type: 'SET_BLACK_TIME'; payload: number }
    | { type: 'SET_CAPTURED_WHITE'; payload: PieceType[] }
    | { type: 'SET_CAPTURED_BLACK'; payload: PieceType[] }
    | { type: 'SET_COMMENTARY'; payload: string }
    | { type: 'SET_DIFFICULTY'; payload: GameDifficulty }
    | { type: 'SET_IS_AI_THINKING'; payload: boolean }
    | { type: 'ADD_EMOTE'; payload: Emote }
    | { type: 'REMOVE_EMOTE'; payload: string }
    | { type: 'SET_P2P_SCORE'; payload: P2PScore }
    | { type: 'SET_REPLAY_INDEX'; payload: number }
    | { type: 'SET_GAME_MODE'; payload: GameMode }
    | { type: 'SET_IS_HOST'; payload: boolean }
    | { type: 'SET_GAME_VARIANT'; payload: GameVariant }
    | { type: 'SET_WHITE_THEME'; payload: TeamTheme }
    | { type: 'SET_BLACK_THEME'; payload: TeamTheme }
    | { type: 'RESET_GAME' };

const initialState: GameContextState = {
    board: DEFAULT_BOARD,
    turn: 'w',
    lastMove: null,
    selectedSquare: null,
    validDestinations: [],
    promotionMove: null,
    boardEffect: null,
    boardOrientation: 'white',
    whiteTime: INITIAL_TIME,
    blackTime: INITIAL_TIME,
    capturedWhite: [],
    capturedBlack: [],
    commentary: '',
    difficulty: GameDifficulty.MEDIUM,
    isAiThinking: false,
    emotes: [],
    p2pScore: { white: 0, black: 0 },
    replayIndex: -1,
    gameMode: 'ai',
    isHost: true,
    gameVariant: 'standard',
    whiteTheme: 'classic_hero',
    blackTheme: 'classic_villain',
    status: 'idle'
};

function gameReducer(state: GameContextState, action: GameAction): GameContextState {
    switch (action.type) {
        case 'SET_STATE':
            return { ...state, ...action.payload };
        case 'SET_BOARD':
            return { ...state, board: action.payload };
        case 'SET_TURN':
            return { ...state, turn: action.payload };
        case 'SET_LAST_MOVE':
            return { ...state, lastMove: action.payload };
        case 'SET_SELECTED_SQUARE':
            return { ...state, selectedSquare: action.payload };
        case 'SET_VALID_DESTINATIONS':
            return { ...state, validDestinations: action.payload };
        case 'SET_PROMOTION_MOVE':
            return { ...state, promotionMove: action.payload };
        case 'SET_BOARD_EFFECT':
            return { ...state, boardEffect: action.payload };
        case 'SET_BOARD_ORIENTATION':
            return { ...state, boardOrientation: action.payload };
        case 'SET_WHITE_TIME':
            return { ...state, whiteTime: action.payload };
        case 'SET_BLACK_TIME':
            return { ...state, blackTime: action.payload };
        case 'SET_CAPTURED_WHITE':
            return { ...state, capturedWhite: action.payload };
        case 'SET_CAPTURED_BLACK':
            return { ...state, capturedBlack: action.payload };
        case 'SET_COMMENTARY':
            return { ...state, commentary: action.payload };
        case 'SET_DIFFICULTY':
            return { ...state, difficulty: action.payload };
        case 'SET_IS_AI_THINKING':
            return { ...state, isAiThinking: action.payload };
        case 'ADD_EMOTE':
            return { ...state, emotes: [...state.emotes, action.payload] };
        case 'REMOVE_EMOTE':
            return { ...state, emotes: state.emotes.filter(e => e.id !== action.payload) };
        case 'SET_P2P_SCORE':
            return { ...state, p2pScore: action.payload };
        case 'SET_REPLAY_INDEX':
            return { ...state, replayIndex: action.payload };
        case 'SET_GAME_MODE':
            return { ...state, gameMode: action.payload };
        case 'SET_IS_HOST':
            return { ...state, isHost: action.payload };
        case 'SET_GAME_VARIANT':
            return { ...state, gameVariant: action.payload };
        case 'SET_WHITE_THEME':
            return { ...state, whiteTheme: action.payload };
        case 'SET_BLACK_THEME':
            return { ...state, blackTheme: action.payload };
        case 'RESET_GAME':
            return {
                ...initialState,
                gameMode: state.gameMode,
                isHost: state.isHost,
                boardOrientation: state.boardOrientation,
                difficulty: state.difficulty,
                gameVariant: state.gameVariant,
                whiteTheme: state.whiteTheme,
                blackTheme: state.blackTheme,
                p2pScore: state.p2pScore
            };
        default:
            return state;
    }
}

const GameContext = createContext<GameContextValue | null>(null);

interface GameProviderProps {
    children: React.ReactNode;
    onAddXp?: (amount: number) => void;
    onUpdateMissions?: (payload: { move: Move; inCheck: boolean }) => void;
    onGameComplete?: (payload: {
        winner: 'w' | 'b' | 'draw';
        reason?: string;
        gameMode: GameMode;
        boardOrientation: BoardOrientation;
        isDraw: boolean;
    }) => void;
    onExit?: () => void;
}

export const GameProvider: React.FC<GameProviderProps> = ({
    children,
    onAddXp,
    onUpdateMissions,
    onGameComplete,
    onExit
}) => {
    const [state, dispatch] = useReducer(gameReducer, initialState);
    const chessRef = useRef(new Chess());
    const timerIntervalRef = useRef<number | null>(null);

    const triggerAnimation = useCallback((type: AnimationType | 'crit', targetSquare: string, variant: '1x1' | '3x3') => {
        dispatch({ type: 'SET_BOARD_EFFECT', payload: { type, targetSquare, variant } });
        switch (type) {
            case 'crit': playCritSound(); break;
            case 'thunderbolt': playThunderSound(); break;
            case 'fireblast': playFireSound(); break;
            case 'psychic': case 'shadowball': playPsychicSound(); break;
            case 'slam': case 'rockslide': playSlamSound(); break;
            case 'teleport': playTeleportSound(); break;
            case 'shadow': playGhostSound(); break;
            default: playMoveSound();
        }
        setTimeout(() => dispatch({ type: 'SET_BOARD_EFFECT', payload: null }), 800);
    }, []);

    const handleGameOver = useCallback((winner?: 'w' | 'b' | 'draw', reason?: string) => {
        const game = chessRef.current;
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }

        const actualWinner = winner || (game.turn() === 'w' ? 'b' : 'w');
        const isDraw = winner === 'draw' || game.isDraw();

        if (isDraw) {
            toast(reason ? `Draw: ${reason}` : "It's a Draw!", { icon: '🤝' });
        } else {
            playWinSound();
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            const winText = actualWinner === 'w' ? "White Wins!" : "Black Wins!";
            toast(reason ? `${winText} (${reason})` : winText, { icon: '🏆' });

            if (state.gameMode !== 'ai') {
                dispatch({
                    type: 'SET_P2P_SCORE',
                    payload: {
                        white: actualWinner === 'w' ? state.p2pScore.white + 1 : state.p2pScore.white,
                        black: actualWinner === 'b' ? state.p2pScore.black + 1 : state.p2pScore.black
                    }
                });
            }
        }

        dispatch({ type: 'SET_STATE', payload: { status: 'ended' } });

        if (onGameComplete) {
            onGameComplete({
                winner: isDraw ? 'draw' : actualWinner,
                reason,
                gameMode: state.gameMode,
                boardOrientation: state.boardOrientation,
                isDraw
            });
        }
    }, [state.gameMode, state.p2pScore, state.boardOrientation, onGameComplete]);

    const updateGameState = useCallback((move?: Move, remoteMove = false) => {
        const game = chessRef.current;
        dispatch({ type: 'SET_BOARD', payload: game.board() });
        dispatch({ type: 'SET_TURN', payload: game.turn() });

        const currentPieces: Record<string, number> = {
            wp: 0, wn: 0, wb: 0, wr: 0, wq: 0, wk: 0,
            bp: 0, bn: 0, bb: 0, br: 0, bq: 0, bk: 0
        };
        game.board().flat().forEach(p => {
            if (p) currentPieces[`${p.color}${p.type}`]++;
        });

        const startingCounts: Record<string, number> = {
            wp: 8, wn: 2, wb: 2, wr: 2, wq: 1, wk: 1,
            bp: 8, bn: 2, bb: 2, br: 2, bq: 1, bk: 1
        };

        const newCapturedWhite: PieceType[] = [];
        const newCapturedBlack: PieceType[] = [];
        (['p', 'n', 'b', 'r', 'q'] as PieceType[]).forEach(t => {
            for (let i = 0; i < startingCounts[`w${t}`] - (currentPieces[`w${t}`] || 0); i++) {
                newCapturedWhite.push(t);
            }
            for (let i = 0; i < startingCounts[`b${t}`] - (currentPieces[`b${t}`] || 0); i++) {
                newCapturedBlack.push(t);
            }
        });
        dispatch({ type: 'SET_CAPTURED_WHITE', payload: newCapturedWhite });
        dispatch({ type: 'SET_CAPTURED_BLACK', payload: newCapturedBlack });

        if (move) {
            if (state.gameMode === 'online' && !remoteMove) {
                peerService.send({
                    type: 'move',
                    payload: { from: move.from, to: move.to, promotion: move.promotion }
                });
            }

            if (onUpdateMissions && state.gameMode === 'ai') {
                onUpdateMissions({ move, inCheck: game.inCheck() });
            }

            const isCapture = move.flags.includes('c') || move.flags.includes('e');
            const theme = move.color === 'w' ? state.whiteTheme : state.blackTheme;
            const pokemon = TEAM_PRESETS[theme][move.piece];
            const primaryType = pokemon.types[0];

            if (isCapture) {
                if (Math.random() < 0.15) {
                    triggerAnimation('crit', move.to, '3x3');
                    if (state.gameMode === 'ai' && onAddXp) onAddXp(50);
                } else {
                    const attackType = SPECIAL_ATTACKS[primaryType] || 'rockslide';
                    triggerAnimation(attackType as AnimationType, move.to, '3x3');
                    if (state.gameMode === 'ai' && onAddXp) onAddXp(20);
                }
            } else {
                const moveType = MOVE_ANIMATIONS[primaryType];
                if (moveType) {
                    triggerAnimation(moveType as AnimationType, move.to, '1x1');
                } else {
                    game.inCheck() ? playCheckSound() : playMoveSound();
                }
            }
        }

        if (state.gameVariant === 'koth' && move && move.piece === 'k' && KOTH_SQUARES.includes(move.to)) {
            handleGameOver(move.color, 'King of the Hill');
            return;
        }

        if (game.isGameOver()) {
            handleGameOver();
        }
    }, [handleGameOver, state.whiteTheme, state.blackTheme, state.gameVariant, state.gameMode, onAddXp, onUpdateMissions, triggerAnimation]);

    const startGame = useCallback(async (options: StartGameOptions = {}) => {
        dispatch({ type: 'SET_STATE', payload: { status: 'loading' } });

        if (options.playSound !== false) {
            playStartSound();
        }

        if (options.orientation) {
            dispatch({ type: 'SET_BOARD_ORIENTATION', payload: options.orientation });
        }

        await new Promise(resolve => setTimeout(resolve, 1500));

        chessRef.current = new Chess();
        dispatch({
            type: 'SET_STATE',
            payload: {
                whiteTime: INITIAL_TIME,
                blackTime: INITIAL_TIME,
                lastMove: null,
                selectedSquare: null,
                validDestinations: [],
                commentary: '',
                emotes: [],
                replayIndex: -1,
                board: chessRef.current.board(),
                turn: chessRef.current.turn(),
                status: 'active'
            }
        });

        if (options.resetScores) {
            dispatch({ type: 'SET_P2P_SCORE', payload: { white: 0, black: 0 } });
        }
    }, []);

    const resetGame = useCallback((remote = false) => {
        if (state.gameMode === 'online' && !remote) {
            peerService.send({ type: 'restart', payload: {} });
        }
        dispatch({ type: 'RESET_GAME' });
        startGame({ playSound: true });
    }, [state.gameMode, startGame]);

    const exitGame = useCallback(() => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        dispatch({ type: 'SET_STATE', payload: { status: 'idle' } });
        if (onExit) {
            onExit();
        }
    }, [onExit]);

    const makeAIMove = useCallback(async () => {
        const game = chessRef.current;
        if (game.isGameOver() || game.turn() === 'w') return;

        dispatch({ type: 'SET_IS_AI_THINKING', payload: true });
        try {
            const aiResult = await getAIMove(game.fen(), game.moves(), state.difficulty, game.history());
            const move = game.move(aiResult.move);
            if (move) {
                dispatch({ type: 'SET_LAST_MOVE', payload: { from: move.from, to: move.to } });
                dispatch({ type: 'SET_COMMENTARY', payload: aiResult.commentary });
                updateGameState(move);
            }
        } catch (e) {
            console.error(e);
        } finally {
            dispatch({ type: 'SET_IS_AI_THINKING', payload: false });
        }
    }, [state.difficulty, updateGameState]);

    useEffect(() => {
        if (state.gameMode === 'ai' && state.turn === 'b' && !chessRef.current.isGameOver() && state.status === 'active') {
            const timeout = setTimeout(makeAIMove, 500);
            return () => clearTimeout(timeout);
        }
    }, [state.turn, state.gameMode, state.status, makeAIMove]);

    useEffect(() => {
        if (state.status !== 'active' || chessRef.current.isGameOver()) {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            return;
        }

        timerIntervalRef.current = window.setInterval(() => {
            if (state.turn === 'w') {
                dispatch({
                    type: 'SET_WHITE_TIME',
                    payload: Math.max(0, state.whiteTime - 1)
                });
                if (state.whiteTime <= 1) {
                    handleGameOver('b', 'Timeout');
                }
            } else {
                dispatch({
                    type: 'SET_BLACK_TIME',
                    payload: Math.max(0, state.blackTime - 1)
                });
                if (state.blackTime <= 1) {
                    handleGameOver('w', 'Timeout');
                }
            }
        }, 1000);

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [state.status, state.turn, state.whiteTime, state.blackTime, handleGameOver]);

    const handleSquareClick = useCallback((square: Square) => {
        if (state.replayIndex !== -1 || state.status !== 'active') return;

        const game = chessRef.current;
        if (state.isAiThinking || game.isGameOver() || state.promotionMove) return;

        if (state.gameMode === 'ai' && game.turn() === 'b') return;

        if (state.gameMode === 'online') {
            const myColor = state.isHost ? 'w' : 'b';
            if (game.turn() !== myColor) return;
        }

        if (state.selectedSquare === square) {
            dispatch({ type: 'SET_SELECTED_SQUARE', payload: null });
            dispatch({ type: 'SET_VALID_DESTINATIONS', payload: [] });
            return;
        }

        if (state.selectedSquare) {
            const piece = game.get(state.selectedSquare);
            if (piece?.type === 'p' &&
                ((piece.color === 'w' && square[1] === '8') || (piece.color === 'b' && square[1] === '1'))) {
                if (state.validDestinations.includes(square)) {
                    dispatch({ type: 'SET_PROMOTION_MOVE', payload: { from: state.selectedSquare, to: square } });
                    return;
                }
            }

            try {
                const moveResult = game.move({ from: state.selectedSquare, to: square, promotion: 'q' });
                if (moveResult) {
                    dispatch({ type: 'SET_LAST_MOVE', payload: { from: moveResult.from, to: moveResult.to } });
                    dispatch({ type: 'SET_SELECTED_SQUARE', payload: null });
                    dispatch({ type: 'SET_VALID_DESTINATIONS', payload: [] });
                    updateGameState(moveResult);
                    return;
                }
            } catch { }
        }

        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
            dispatch({ type: 'SET_SELECTED_SQUARE', payload: square });
            dispatch({
                type: 'SET_VALID_DESTINATIONS',
                payload: game.moves({ square, verbose: true }).map(m => m.to)
            });
        } else {
            dispatch({ type: 'SET_SELECTED_SQUARE', payload: null });
            dispatch({ type: 'SET_VALID_DESTINATIONS', payload: [] });
        }
    }, [state.selectedSquare, state.validDestinations, state.isAiThinking, state.promotionMove, state.replayIndex, state.gameMode, state.isHost, state.status, updateGameState]);

    const handlePromotionSelect = useCallback((type: PieceType) => {
        if (!state.promotionMove) return;

        const game = chessRef.current;
        const move = game.move({ from: state.promotionMove.from, to: state.promotionMove.to, promotion: type });
        if (move) {
            dispatch({ type: 'SET_LAST_MOVE', payload: { from: move.from, to: move.to } });
            updateGameState(move);
            playPsychicSound();
        }
        dispatch({ type: 'SET_PROMOTION_MOVE', payload: null });
        dispatch({ type: 'SET_SELECTED_SQUARE', payload: null });
        dispatch({ type: 'SET_VALID_DESTINATIONS', payload: [] });
    }, [state.promotionMove, updateGameState]);

    const undoMove = useCallback(() => {
        if (state.isAiThinking || state.replayIndex !== -1 || state.gameMode === 'online' || state.status !== 'active') return;

        const game = chessRef.current;
        if (game.history().length === 0) return;

        game.undo();
        if (state.gameMode === 'ai') game.undo();

        dispatch({ type: 'SET_LAST_MOVE', payload: null });
        dispatch({ type: 'SET_SELECTED_SQUARE', payload: null });
        dispatch({ type: 'SET_VALID_DESTINATIONS', payload: [] });
        playMoveSound();
        updateGameState();
    }, [state.isAiThinking, state.replayIndex, state.gameMode, state.status, updateGameState]);

    const handleEmote = useCallback((emoji: string, originSquare?: string, remote = false) => {
        const playerColor = state.boardOrientation === 'white' ? 'w' : 'b';

        let kingSquare = originSquare;
        if (!kingSquare) {
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const p = state.board[r][c];
                    if (p && p.type === 'k' && p.color === playerColor) {
                        kingSquare = `${['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][c]}${['8', '7', '6', '5', '4', '3', '2', '1'][r]}`;
                    }
                }
            }
        }

        if (kingSquare) {
            playEmoteSound();
            const id = Date.now().toString();
            dispatch({ type: 'ADD_EMOTE', payload: { id, emoji, square: kingSquare } });
            setTimeout(() => dispatch({ type: 'REMOVE_EMOTE', payload: id }), 2000);

            if (!remote && state.gameMode === 'online') {
                peerService.send({ type: 'emote', payload: { emoji, square: kingSquare } });
            }
        }
    }, [state.boardOrientation, state.board, state.gameMode]);

    const handleVoiceCommand = useCallback((transcript: string) => {
        if (state.isAiThinking || chessRef.current.isGameOver() || state.replayIndex !== -1 || state.status !== 'active') return;

        const parsedMove = parseVoiceCommand(transcript);
        if (parsedMove) {
            try {
                const move = chessRef.current.move(parsedMove);
                if (move) {
                    dispatch({ type: 'SET_LAST_MOVE', payload: { from: move.from, to: move.to } });
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
    }, [state.isAiThinking, state.replayIndex, state.status, updateGameState]);

    const displayedBoard = useMemo(() => {
        if (state.replayIndex === -1) return state.board;

        const tempGame = new Chess();
        const history = chessRef.current.history();
        for (let i = 0; i <= state.replayIndex && i < history.length; i++) {
            tempGame.move(history[i]);
        }
        return tempGame.board();
    }, [state.replayIndex, state.board]);

    useEffect(() => {
        peerService.onData((msg) => {
            if (msg.type === 'move') {
                const moveData = msg.payload;
                const game = chessRef.current;
                try {
                    const move = game.move(moveData);
                    if (move) {
                        dispatch({ type: 'SET_LAST_MOVE', payload: { from: move.from, to: move.to } });
                        updateGameState(move, true);
                        toast.success("Opponent moved!");
                    }
                } catch (e) {
                    console.error("Invalid remote move", e);
                }
            } else if (msg.type === 'config') {
                const { variant, wTheme, bTheme } = msg.payload;
                dispatch({ type: 'SET_GAME_VARIANT', payload: variant });
                dispatch({ type: 'SET_WHITE_THEME', payload: wTheme });
                dispatch({ type: 'SET_BLACK_THEME', payload: bTheme });
                startGame({ playSound: false });
            } else if (msg.type === 'emote') {
                handleEmote(msg.payload.emoji, msg.payload.square, true);
            } else if (msg.type === 'restart') {
                resetGame(true);
                toast("Host restarted the game.");
            }
        });
    }, [updateGameState, startGame, handleEmote, resetGame]);

    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, []);

    const contextValue: GameContextValue = {
        chess: chessRef.current,
        state,
        displayedBoard,
        startGame,
        resetGame,
        exitGame,
        handleSquareClick,
        handlePromotionSelect,
        clearPromotion: () => dispatch({ type: 'SET_PROMOTION_MOVE', payload: null }),
        undoMove,
        handleEmote,
        handleVoiceCommand,
        setDifficulty: (difficulty: GameDifficulty) => dispatch({ type: 'SET_DIFFICULTY', payload: difficulty }),
        setGameMode: (mode: GameMode) => dispatch({ type: 'SET_GAME_MODE', payload: mode }),
        setHostStatus: (isHost: boolean) => dispatch({ type: 'SET_IS_HOST', payload: isHost }),
        setBoardOrientation: (orientation: BoardOrientation) => dispatch({ type: 'SET_BOARD_ORIENTATION', payload: orientation }),
        flipBoard: () => dispatch({ type: 'SET_BOARD_ORIENTATION', payload: state.boardOrientation === 'white' ? 'black' : 'white' }),
        setThemes: (whiteTheme: TeamTheme, blackTheme: TeamTheme) => {
            dispatch({ type: 'SET_WHITE_THEME', payload: whiteTheme });
            dispatch({ type: 'SET_BLACK_THEME', payload: blackTheme });
        },
        setGameVariant: (variant: GameVariant) => dispatch({ type: 'SET_GAME_VARIANT', payload: variant }),
        setReplayIndex: (index: number) => dispatch({ type: 'SET_REPLAY_INDEX', payload: index }),
        updateCommentary: (commentary: string) => dispatch({ type: 'SET_COMMENTARY', payload: commentary })
    };

    return <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>;
};

export const useGameContext = (): GameContextValue => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGameContext must be used within a GameProvider');
    }
    return context;
};
