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

  loadGame(fen: string): boolean {
    try {
      this.chess.load(fen);
      this.moveHistory = [];
      return true;
    } catch (error) {
      console.error('Failed to load game:', error);
      return false;
    }
  }
}
