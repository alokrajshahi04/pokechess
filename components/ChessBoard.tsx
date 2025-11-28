
import React from 'react';
import { Chess, Square } from 'chess.js';
import BoardSquare from './BoardSquare';
import CombatEffects from './CombatEffects';
import { PieceType, PieceColor, BoardOrientation, BoardEffect, TeamTheme, GameVariant, Emote } from '../types';
import { TEAM_PRESETS, KOTH_SQUARES, BOARD_THEMES } from '../constants';

interface ChessBoardProps {
  game: Chess;
  board: ({ type: PieceType; color: PieceColor } | null)[][];
  selectedSquare: Square | null;
  possibleMoves: string[];
  lastMove: { from: string; to: string } | null;
  onSquareClick: (square: Square) => void;
  orientation: BoardOrientation;
  boardEffect: BoardEffect | null;
  whiteTheme: TeamTheme;
  blackTheme: TeamTheme;
  gameVariant: GameVariant;
  emotes: Emote[]; // Active emotes
}

const ChessBoard: React.FC<ChessBoardProps> = ({ 
  game, 
  board, 
  selectedSquare, 
  possibleMoves, 
  lastMove,
  onSquareClick,
  orientation,
  boardEffect,
  whiteTheme,
  blackTheme,
  gameVariant,
  emotes
}) => {
  const isCheck = game.inCheck();
  const turn = game.turn();
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const getKingSquare = (color: PieceColor): string | null => {
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = board[r][f];
        if (piece && piece.type === 'k' && piece.color === color) {
          return `${files[f]}${ranks[r]}`;
        }
      }
    }
    return null;
  };

  const kingInCheckSquare = isCheck ? getKingSquare(turn) : null;

  const displayRows = orientation === 'white' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const displayCols = orientation === 'white' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  const isBigAttack = boardEffect?.variant === '3x3';
  const isCrit = boardEffect?.type === 'crit';
  
  // Resolve Theme Colors (Biome)
  // Use White's theme to determine the board biome
  const themeColors = BOARD_THEMES[whiteTheme];

  return (
    <div className={`relative w-full max-w-[600px] aspect-square bg-[#3d2f23] p-3 rounded-lg shadow-2xl border-4 border-[#2a2018] ${isBigAttack || isCrit ? 'animate-shake' : ''}`}>
      <div className="w-full h-full grid grid-rows-8 grid-cols-8 border-2 border-[#5c4a3d] relative overflow-hidden">
        {displayRows.map((r) => (
          displayCols.map((f) => {
            const piece = board[r][f];
            const squareLabel = `${files[f]}${ranks[r]}` as Square;
            const isValid = possibleMoves.includes(squareLabel);
            const isSelected = selectedSquare === squareLabel;
            const isLast = lastMove ? (lastMove.from === squareLabel || lastMove.to === squareLabel) : false;
            const isKingInCheck = kingInCheckSquare === squareLabel;

            let pokemonDef;
            if (piece) {
                const theme = piece.color === 'w' ? whiteTheme : blackTheme;
                pokemonDef = TEAM_PRESETS[theme][piece.type];
            }

            const isKoth = gameVariant === 'koth' && KOTH_SQUARES.includes(squareLabel);
            
            // Check for emotes on this square
            const squareEmotes = emotes.filter(e => e.square === squareLabel);

            return (
              <div key={squareLabel} className="relative w-full h-full">
                  <BoardSquare
                    rank={r} 
                    file={f}
                    piece={piece}
                    pokemonDef={pokemonDef}
                    isValidMove={isValid}
                    isSelected={isSelected}
                    isLastMove={isLast}
                    isCheck={isKingInCheck}
                    isKothSquare={isKoth}
                    themeColors={themeColors}
                    onClick={() => onSquareClick(squareLabel)}
                  />
                  {/* Floating Emotes Layer */}
                  {squareEmotes.map(e => (
                      <div key={e.id} className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 animate-float-up text-3xl drop-shadow-md">
                          {e.emoji}
                      </div>
                  ))}
              </div>
            );
          })
        ))}
        
        {/* Animation Overlay (Combat or Move) */}
        {boardEffect && boardEffect.type !== 'crit' && (
            <CombatEffects 
                type={boardEffect.type as any} 
                targetSquare={boardEffect.targetSquare} 
                orientation={orientation}
                variant={boardEffect.variant}
            />
        )}
        
        {/* Critical Hit Overlay */}
        {isCrit && (
             <div className="absolute inset-0 bg-red-500/30 z-50 pointer-events-none animate-pulse flex items-center justify-center">
                 <h1 className="text-6xl font-pixel text-yellow-400 drop-shadow-[4px_4px_0_#000] rotate-[-15deg] animate-bounce">CRITICAL!</h1>
             </div>
        )}
      </div>
      
      <style>{`
        @keyframes float-up {
            0% { transform: translateY(0) scale(0.5); opacity: 0; }
            20% { opacity: 1; transform: translateY(-10px) scale(1.2); }
            100% { transform: translateY(-50px) scale(1); opacity: 0; }
        }
        .animate-float-up {
            animation: float-up 2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ChessBoard;
