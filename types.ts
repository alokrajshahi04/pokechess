import type { Chess, Square } from 'chess.js';

export interface PokemonPiece {
  id: number;
  name: string;
  type: PieceType;
  color: PieceColor;
}

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

export interface MoveData {
  from: string;
  to: string;
  promotion?: string;
  san: string; // Standard Algebraic Notation
}

export interface ChessGameState {
  fen: string;
  turn: PieceColor;
  isGameOver: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  history: string[];
  capturedWhite: PieceType[];
  capturedBlack: PieceType[];
}

export interface AIResponse {
  move: string; // SAN
  commentary: string;
}

export enum GameDifficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard'
}

export type GameMode = 'ai' | 'p2p' | 'online';
export type AppView = 'hero' | 'onboarding' | 'landing' | 'loading' | 'game' | 'pokedex' | 'tower';
export type BoardOrientation = 'white' | 'black';

export type GameVariant = 'standard' | 'koth'; // King of the Hill
export type TeamTheme = 'classic_hero' | 'classic_villain' | 'fire' | 'water' | 'grass' | 'psychic' | 'electric';

export interface PokemonDef {
    id: number;
    name: string;
    types: string[]; // e.g. ['fire', 'flying']
}

export type CombatAnimationType = 'thunderbolt' | 'fireblast' | 'hydropump' | 'shadowball' | 'rockslide' | 'psychic';
export type MoveAnimationType = 'spark' | 'flame' | 'teleport' | 'slam' | 'shadow' | 'water_splash' | 'default';

export type AnimationType = CombatAnimationType | MoveAnimationType;

export interface BoardEffect {
  type: AnimationType | 'crit';
  targetSquare: string; 
  variant: '1x1' | '3x3'; // 1x1 for moves, 3x3 for big attacks
}

export interface BoardTheme {
    light: string;
    dark: string;
    accent: string;
}

export interface Emote {
    id: string;
    emoji: string;
    square: string; // e.g., 'e1' (User's King position)
}

export interface XPState {
    current: number;
    level: number;
    max: number;
}

export interface Mission {
    id: string;
    description: string;
    target: number;
    current: number;
    completed: boolean;
    rewardXp: number;
    type: 'capture' | 'move' | 'check' | 'win';
}

export interface TrainerStats {
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    highestStreak: number;
    currentStreak: number;
    rating: number; // Elo-like rating
}

export interface OnlineMessage {
    type: 'move' | 'chat' | 'emote' | 'config' | 'restart';
    payload: any;
}

// --- NEW TYPES ---

export interface League {
    id: string;
    name: string;
    minRating: number;
    color: string;
}

export type ShopCategory = 'theme' | 'item' | 'merch';

export interface ShopItem {
    id: string;
    name: string;
    type: ShopCategory;
    cost: number;
    value: string; // Theme ID or Item ID
    description: string;
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    condition: (stats: TrainerStats) => boolean;
}

export interface Puzzle {
    id: string;
    fen: string;
    solution: string[]; // Sequence of SAN moves
    description: string;
}

export interface PuzzleState {
    currentPuzzleIndex: number;
    score: number;
    timeLeft: number;
    isActive: boolean;
}

export type BoardState = ({ type: PieceType; color: PieceColor } | null)[][];

export interface LastMove {
    from: string;
    to: string;
}

export interface PromotionMove {
    from: string;
    to: string;
}

export interface P2PScore {
    white: number;
    black: number;
}

export type GameStatus = 'idle' | 'loading' | 'active' | 'ended';

export interface GameContextState {
    board: BoardState;
    turn: PieceColor;
    lastMove: LastMove | null;
    selectedSquare: Square | null;
    validDestinations: string[];
    promotionMove: PromotionMove | null;
    boardEffect: BoardEffect | null;
    boardOrientation: BoardOrientation;
    whiteTime: number;
    blackTime: number;
    capturedWhite: PieceType[];
    capturedBlack: PieceType[];
    commentary: string;
    difficulty: GameDifficulty;
    isAiThinking: boolean;
    emotes: Emote[];
    p2pScore: P2PScore;
    replayIndex: number;
    gameMode: GameMode;
    isHost: boolean;
    gameVariant: GameVariant;
    whiteTheme: TeamTheme;
    blackTheme: TeamTheme;
    status: GameStatus;
}

export interface StartGameOptions {
    playSound?: boolean;
    orientation?: BoardOrientation;
    resetScores?: boolean;
}

export interface GameContextValue {
    chess: Chess;
    state: GameContextState;
    displayedBoard: BoardState;
    startGame: (options?: StartGameOptions) => Promise<void>;
    resetGame: (remote?: boolean) => void;
    exitGame: () => void;
    handleSquareClick: (square: Square) => void;
    handlePromotionSelect: (type: PieceType) => void;
    clearPromotion: () => void;
    undoMove: () => void;
    handleEmote: (emoji: string, originSquare?: string, remote?: boolean) => void;
    handleVoiceCommand: (transcript: string) => void;
    setDifficulty: (difficulty: GameDifficulty) => void;
    setGameMode: (mode: GameMode) => void;
    setHostStatus: (isHost: boolean) => void;
    setBoardOrientation: (orientation: BoardOrientation) => void;
    flipBoard: () => void;
    setThemes: (whiteTheme: TeamTheme, blackTheme: TeamTheme) => void;
    setGameVariant: (variant: GameVariant) => void;
    setReplayIndex: (index: number) => void;
    updateCommentary: (commentary: string) => void;
}
