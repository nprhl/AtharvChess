import { Chess, Move } from 'chess.js';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export class ChessAI {
  private difficulty: Difficulty;

  constructor(difficulty: Difficulty = 'beginner') {
    this.difficulty = difficulty;
  }

  public getBestMove(fen: string): Move | null {
    const chess = new Chess(fen);
    const possibleMoves = chess.moves({ verbose: true });
    
    if (possibleMoves.length === 0) {
      return null;
    }

    // For beginner difficulty, add more randomness
    if (this.difficulty === 'beginner' && Math.random() < 0.7) {
      return this.getRandomMove(possibleMoves);
    }

    // Use simple position evaluation
    let bestMove = possibleMoves[0];
    let bestScore = -Infinity;

    for (const move of possibleMoves) {
      try {
        chess.move(move);
        let score = this.evaluatePosition(chess);
        
        // Add some randomness for non-advanced difficulty
        if (this.difficulty !== 'advanced') {
          score += (Math.random() - 0.5) * 50;
        }
        
        chess.undo();

        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      } catch (error) {
        // Skip invalid moves
        continue;
      }
    }

    return bestMove;
  }

  private getRandomMove(moves: Move[]): Move {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  private evaluatePosition(chess: Chess): number {
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? -9999 : 9999;
    }

    if (chess.isDraw()) {
      return 0;
    }

    let score = 0;
    const board = chess.board();

    // Piece values
    const pieceValues = {
      'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000
    };

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece) {
          const pieceValue = pieceValues[piece.type as keyof typeof pieceValues];
          score += piece.color === 'w' ? pieceValue : -pieceValue;
        }
      }
    }

    // Simple position bonuses
    const moves = chess.moves();
    score += moves.length * 5; // Mobility bonus

    return chess.turn() === 'w' ? score : -score;
  }
}