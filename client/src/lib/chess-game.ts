import { Chess, Square, Move, Piece } from 'chess.js';

export class ChessGameEngine {
  private chess: Chess;
  private moveHistory: Move[];
  public capturedPieces: { white: Piece[], black: Piece[] } = { white: [], black: [] };

  constructor(fen?: string) {
    this.chess = new Chess(fen);
    this.moveHistory = [];
    this.updateCapturedPieces();
  }

  get game(): Chess {
    return this.chess;
  }

  get history(): Move[] {
    return [...this.moveHistory];
  }

  get turn(): 'w' | 'b' {
    return this.chess.turn();
  }

  makeMove(from: Square, to: Square, promotion?: string): boolean {
    try {
      const move = this.chess.move({
        from,
        to,
        promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined
      });

      if (move) {
        this.moveHistory.push(move);
        this.updateCapturedPieces();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Invalid move:', error);
      return false;
    }
  }

  // Check if a move would be a pawn promotion
  isPawnPromotion(from: Square, to: Square): boolean {
    const piece = this.chess.get(from);
    if (!piece || piece.type !== 'p') return false;
    
    const toRank = parseInt(to[1]);
    const isWhitePawn = piece.color === 'w' && toRank === 8;
    const isBlackPawn = piece.color === 'b' && toRank === 1;
    
    return isWhitePawn || isBlackPawn;
  }

  // Check if the move is valid without making it
  isValidMove(from: Square, to: Square): boolean {
    const moves = this.chess.moves({ verbose: true });
    return moves.some(move => move.from === from && move.to === to);
  }

  undoMove(): Move | null {
    const undone = this.chess.undo();
    if (undone) {
      this.moveHistory.pop();
      this.updateCapturedPieces();
      return undone;
    }
    return null;
  }

  getValidMoves(square?: Square): Square[] {
    const moves = this.chess.moves({ 
      square, 
      verbose: true 
    });
    
    return moves.map(move => move.to);
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  isCheck(): boolean {
    return this.chess.inCheck();
  }

  isCheckmate(): boolean {
    return this.chess.isCheckmate();
  }

  isDraw(): boolean {
    return this.chess.isDraw();
  }

  fen(): string {
    return this.chess.fen();
  }

  pgn(): string {
    return this.chess.pgn();
  }

  reset(): void {
    this.chess.reset();
    this.moveHistory = [];
    this.capturedPieces = { white: [], black: [] };
  }

  loadGame(fen: string): boolean {
    try {
      this.chess.load(fen);
      this.moveHistory = [];
      this.updateCapturedPieces();
      return true;
    } catch (error) {
      console.error('Failed to load game:', error);
      return false;
    }
  }

  private updateCapturedPieces(): void {
    // Reset captured pieces
    this.capturedPieces = { white: [], black: [] };
    
    // Count all pieces that should be on the board initially
    const initialPieces = {
      white: { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 },
      black: { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 }
    };
    
    // Count current pieces on the board
    const currentPieces = {
      white: { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0 },
      black: { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0 }
    };
    
    // Count pieces currently on board
    const board = this.chess.board();
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece) {
          if (piece.color === 'w') {
            currentPieces.white[piece.type as keyof typeof currentPieces.white]++;
          } else {
            currentPieces.black[piece.type as keyof typeof currentPieces.black]++;
          }
        }
      }
    }
    
    // Calculate captured pieces (initial - current = captured)
    for (const pieceType of ['p', 'r', 'n', 'b', 'q', 'k'] as const) {
      // White pieces captured by black
      const whiteCaptured = initialPieces.white[pieceType] - currentPieces.white[pieceType];
      for (let i = 0; i < whiteCaptured; i++) {
        this.capturedPieces.black.push({ type: pieceType, color: 'w' });
      }
      
      // Black pieces captured by white
      const blackCaptured = initialPieces.black[pieceType] - currentPieces.black[pieceType];
      for (let i = 0; i < blackCaptured; i++) {
        this.capturedPieces.white.push({ type: pieceType, color: 'b' });
      }
    }
  }
}
