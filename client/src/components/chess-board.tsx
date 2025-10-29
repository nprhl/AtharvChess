import { useState, useRef, useCallback } from "react";
import { Chess, Square } from "chess.js";
import { triggerHapticFeedback } from "../capacitor-init";

interface ChessPiece {
  type: string;
  color: 'w' | 'b';
  square: Square;
}

interface ChessBoardProps {
  game: Chess;
  onMove: (from: Square, to: Square) => boolean;
  getValidMoves: (square: Square) => Square[];
  lastMove?: { from: Square; to: Square } | null;
  disabled?: boolean;
}

const PIECE_SYMBOLS = {
  'wp': '♟︎', 'wr': '♜', 'wn': '♞', 'wb': '♝', 'wq': '♛', 'wk': '♚',
  'bp': '♟︎', 'br': '♜', 'bn': '♞', 'bb': '♝', 'bq': '♛', 'bk': '♚'
};

export default function ChessBoard({ game, onMove, getValidMoves, lastMove, disabled = false }: ChessBoardProps) {
  const [draggedPiece, setDraggedPiece] = useState<{
    piece: ChessPiece;
    square: Square;
  } | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [dragOverSquare, setDragOverSquare] = useState<Square | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const board = game.board();
  
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const getSquareName = (file: number, rank: number): Square => {
    return `${files[file]}${ranks[rank]}` as Square;
  };

  const isLightSquare = (file: number, rank: number) => {
    return (file + rank) % 2 === 0;
  };

  const handleDragStart = useCallback((piece: ChessPiece, square: Square) => {
    if (disabled || piece.color !== game.turn()) return false;
    
    // Haptic feedback on piece selection
    triggerHapticFeedback('light');
    
    setDraggedPiece({ piece, square });
    const moves = getValidMoves(square);
    setValidMoves(moves);
    return true;
  }, [disabled, game, getValidMoves]);

  const handleDragEnd = useCallback(() => {
    setDraggedPiece(null);
    setValidMoves([]);
    setDragOverSquare(null);
  }, []);

  const handleDragOver = useCallback((square: Square) => {
    setDragOverSquare(square);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverSquare(null);
  }, []);

  const handleDrop = useCallback((targetSquare: Square) => {
    if (!draggedPiece) return false;
    
    const success = onMove(draggedPiece.square, targetSquare);
    if (success) {
      // Haptic feedback on successful move
      triggerHapticFeedback('medium');
    }
    handleDragEnd();
    return success;
  }, [draggedPiece, onMove, handleDragEnd]);

  const renderSquare = (file: number, rank: number) => {
    const square = getSquareName(file, rank);
    const piece = board[rank][file];
    const isLight = isLightSquare(file, rank);
    const isValidMove = validMoves.includes(square);
    const isDragOver = dragOverSquare === square;
    const isDragging = draggedPiece?.square === square;
    const isLastMoveFrom = lastMove?.from === square;
    const isLastMoveTo = lastMove?.to === square;

    const squareClasses = [
      "chess-square flex items-center justify-center relative w-full h-full",
      isLight ? "bg-amber-100" : "bg-amber-700", 
      isValidMove && "valid-move",
      isDragOver && validMoves.includes(square) && "drop-zone",
      (isLastMoveFrom || isLastMoveTo) && "last-move-highlight"
    ].filter(Boolean).join(" ");

    const pieceSymbol = piece ? PIECE_SYMBOLS[`${piece.color}${piece.type}` as keyof typeof PIECE_SYMBOLS] : null;
    const pieceColorClass = piece?.color === 'w' ? 'chess-piece-white' : 'chess-piece-black';
    const pieceSizeClass = piece?.type === 'p' ? 'chess-piece-pawn' : 'chess-piece-other';

    return (
      <div
        key={square}
        className={squareClasses}
        data-square={square}
        onDragOver={(e) => {
          e.preventDefault();
          handleDragOver(square);
        }}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          handleDrop(square);
        }}
        onClick={(e) => {
          // Handle click on empty square for move completion or deselection
          if (!piece && draggedPiece && validMoves.includes(square)) {
            handleDrop(square);
          } else if (!piece && draggedPiece) {
            // Clicking on empty square that's not a valid move deselects piece
            handleDragEnd();
          }
        }}
      >
        {/* Square label for learning - positioned in bottom-left corner */}
        <div className="absolute bottom-0 left-0.5 text-[9px] font-semibold opacity-60 pointer-events-none z-10">
          <span className={isLight ? "text-amber-700" : "text-amber-100"}>
            {square}
          </span>
        </div>
        
        {piece && (
          <span
            className={`chess-piece ${pieceColorClass} ${pieceSizeClass} ${isDragging ? 'dragging' : ''}`}
            draggable={!disabled && piece.color === game.turn()}
            onDragStart={(e) => {
              const canDrag = handleDragStart(piece, square);
              if (!canDrag) {
                e.preventDefault();
                return;
              }
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', square);
            }}
            onDragEnd={handleDragEnd}
            onClick={(e) => {
              e.stopPropagation();
              // Handle click-to-move for mobile or as fallback
              if (!draggedPiece && piece.color === game.turn()) {
                // Select this piece
                handleDragStart(piece, square);
              } else if (draggedPiece && draggedPiece.square === square) {
                // Clicking the same piece deselects it
                handleDragEnd();
              } else if (draggedPiece && piece.color === game.turn()) {
                // Clicking a different piece of same color switches selection
                handleDragStart(piece, square);
              } else if (draggedPiece && validMoves.includes(square)) {
                // Capture or move to this square
                handleDrop(square);
              }
            }}
          >
            {pieceSymbol}
          </span>
        )}
      </div>
    );
  };

  return (
    <div 
      ref={boardRef}
      className="grid grid-cols-8 gap-0 w-full aspect-square border-2 border-slate-400 rounded-md overflow-hidden shadow-xl mx-auto"
      style={{ maxWidth: 'min(90vw, 450px)', height: 'auto' }}
    >
      {ranks.map((rank, rankIndex) =>
        files.map((file, fileIndex) => renderSquare(fileIndex, rankIndex))
      )}
    </div>
  );
}
