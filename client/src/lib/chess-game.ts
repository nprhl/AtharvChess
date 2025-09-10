import { Chess, Square, Move } from 'chess.js';

export class ChessGameEngine {
  private chess: Chess;
  private moveHistory: Move[];

  constructor(fen?: string) {
    this.chess = new Chess(fen);
    this.moveHistory = [];
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
  }

  loadGame(fen: string, moveHistory?: string[]): boolean {
    try {
      this.chess.load(fen);
      
      // If move history is provided, reconstruct it by replaying moves
      if (moveHistory && moveHistory.length > 0) {
        // Start with a fresh game and replay all moves
        const tempChess = new Chess();
        this.moveHistory = [];
        
        for (const san of moveHistory) {
          const move = tempChess.move(san);
          if (move) {
            this.moveHistory.push(move);
          }
        }
      } else {
        this.moveHistory = [];
      }
      
      return true;
    } catch (error) {
      console.error('Failed to load game:', error);
      return false;
    }
  }
}
