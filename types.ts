
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

export interface GameState {
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

export interface OnlineScore {
    white: number;
    black: number;
}

export interface OnlineMovePayload {
    from: string;
    to: string;
    promotion?: string;
    fen: string;
    fenHash: string;
    historyLength: number;
}

export interface OnlineSyncSnapshotPayload {
    fen: string;
    fenHash: string;
    historyLength: number;
    whiteTime: number;
    blackTime: number;
    variant: GameVariant;
    whiteTheme: TeamTheme;
    blackTheme: TeamTheme;
    score: OnlineScore;
    reason?: string;
}

export interface OnlineSyncAckPayload extends OnlineSyncSnapshotPayload {
    success: boolean;
    message?: string;
}

export interface OnlineConfigPayload {
    variant: GameVariant;
    wTheme: TeamTheme;
    bTheme: TeamTheme;
}

export interface OnlineEmotePayload {
    emoji: string;
    square?: string;
}

export type OnlineMessage =
    | { type: 'move'; payload: OnlineMovePayload }
    | { type: 'chat'; payload: any }
    | { type: 'emote'; payload: OnlineEmotePayload }
    | { type: 'config'; payload: OnlineConfigPayload }
    | { type: 'restart'; payload: {} }
    | { type: 'state'; payload: OnlineSyncSnapshotPayload }
    | { type: 'syncRequest'; payload: OnlineSyncSnapshotPayload }
    | { type: 'syncAck'; payload: OnlineSyncAckPayload };

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
