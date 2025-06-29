import { useState, useRef, useCallback } from "react";
import { Chess, Square } from "chess.js";

interface ChessPiece {
  type: string;
  color: 'w' | 'b';
  square: Square;
}

interface ChessBoardProps {
  game: Chess;
  onMove: (from: Square, to: Square) => boolean;
  getValidMoves: (square: Square) => Square[];
  disabled?: boolean;
}

const PIECE_SYMBOLS = {
  'wp': '♙', 'wr': '♖', 'wn': '♘', 'wb': '♗', 'wq': '♕', 'wk': '♔',
  'bp': '♟', 'br': '♜', 'bn': '♞', 'bb': '♝', 'bq': '♛', 'bk': '♚'
};

export default function ChessBoard({ game, onMove, getValidMoves, disabled = false }: ChessBoardProps) {
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

    const squareClasses = [
      "chess-square flex items-center justify-center aspect-square relative",
      isLight ? "bg-board-light" : "bg-board-dark",
      isValidMove && "valid-move",
      isDragOver && validMoves.includes(square) && "drop-zone"
    ].filter(Boolean).join(" ");

    const pieceSymbol = piece ? PIECE_SYMBOLS[`${piece.color}${piece.type}` as keyof typeof PIECE_SYMBOLS] : null;
    const pieceColor = piece?.color === 'w' ? 'text-white' : 'text-slate-800';

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
      >
        {piece && (
          <span
            className={`chess-piece ${pieceColor} ${isDragging ? 'dragging' : ''}`}
            draggable={!disabled && piece.color === game.turn()}
            onDragStart={(e) => {
              const canDrag = handleDragStart(piece, square);
              if (!canDrag) {
                e.preventDefault();
              }
            }}
            onDragEnd={handleDragEnd}
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
      className="grid grid-cols-8 gap-0 aspect-square border-2 border-slate-500 rounded-lg overflow-hidden"
    >
      {ranks.map((rank, rankIndex) =>
        files.map((file, fileIndex) => renderSquare(fileIndex, rankIndex))
      )}
    </div>
  );
}
