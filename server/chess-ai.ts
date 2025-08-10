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

    // First, check for critical moves that should always be played
    const criticalMove = this.findCriticalMove(chess, possibleMoves);
    if (criticalMove) {
      return criticalMove;
    }

    // Evaluate all moves and pick the best one
    const searchDepth = this.getSearchDepth();
    let bestMove = possibleMoves[0];
    let bestScore = -Infinity;

    for (const move of possibleMoves) {
      try {
        chess.move(move);
        let score = this.evaluatePosition(chess, searchDepth);
        
        // Add difficulty-based randomness to scoring (much less than before)
        if (this.difficulty === 'beginner') {
          score += (Math.random() - 0.5) * 20; // Reduced randomness
        } else if (this.difficulty === 'intermediate') {
          score += (Math.random() - 0.5) * 10; // Small randomness
        }
        // Advanced has no randomness
        
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

  private getSearchDepth(): number {
    switch (this.difficulty) {
      case 'beginner': return 1;
      case 'intermediate': return 2;
      case 'advanced': return 3;
      default: return 1;
    }
  }

  private getRandomMove(moves: Move[]): Move {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  private findCriticalMove(chess: Chess, moves: Move[]): Move | null {
    // Check for checkmate in one
    for (const move of moves) {
      chess.move(move);
      if (chess.isCheckmate()) {
        chess.undo();
        return move;
      }
      chess.undo();
    }

    // Check for captures of valuable pieces
    const captures = moves.filter(move => move.captured);
    if (captures.length > 0) {
      // Sort captures by piece value
      captures.sort((a, b) => {
        const pieceValues = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };
        const valueA = pieceValues[a.captured as keyof typeof pieceValues] || 0;
        const valueB = pieceValues[b.captured as keyof typeof pieceValues] || 0;
        return valueB - valueA;
      });
      
      // Always take the most valuable piece
      if (captures[0].captured !== 'p' || this.difficulty !== 'beginner') {
        return captures[0];
      }
    }

    // Check if we're in check - must get out of check
    if (chess.inCheck()) {
      // Return any move that gets out of check (first valid one)
      for (const move of moves) {
        chess.move(move);
        const stillInCheck = chess.inCheck();
        chess.undo();
        if (!stillInCheck) {
          return move;
        }
      }
    }

    return null; // No critical move found
  }

  private evaluatePosition(chess: Chess, depth: number = 1): number {
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

    // Count material
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece) {
          let pieceValue = pieceValues[piece.type as keyof typeof pieceValues];
          
          // Advanced difficulty considers positional bonuses
          if (this.difficulty === 'advanced') {
            pieceValue += this.getPositionalBonus(piece, rank, file);
          }
          
          score += piece.color === 'w' ? pieceValue : -pieceValue;
        }
      }
    }

    // Basic tactical awareness for all levels
    const moves = chess.moves();
    score += moves.length * (this.difficulty === 'beginner' ? 2 : 5); // Mobility bonus
    
    // Check for tactical threats
    if (chess.inCheck()) {
      score += chess.turn() === 'w' ? -50 : 50;
    }
    
    // Encourage development and basic principles for beginners
    if (this.difficulty === 'beginner') {
      score += this.getBeginnerBonus(chess);
    }

    // Simple recursion for higher difficulties
    if (depth > 1 && this.difficulty === 'advanced') {
      const moves = chess.moves({ verbose: true });
      let bestResponseScore = chess.turn() === 'w' ? Infinity : -Infinity;
      
      for (let i = 0; i < Math.min(moves.length, 5); i++) { // Limit to top 5 moves for performance
        chess.move(moves[i]);
        const responseScore = this.evaluatePosition(chess, depth - 1);
        chess.undo();
        
        if (chess.turn() === 'w' && responseScore < bestResponseScore) {
          bestResponseScore = responseScore;
        } else if (chess.turn() === 'b' && responseScore > bestResponseScore) {
          bestResponseScore = responseScore;
        }
      }
      
      score = bestResponseScore;
    }

    return chess.turn() === 'w' ? score : -score;
  }

  private getBeginnerBonus(chess: Chess): number {
    let bonus = 0;
    const board = chess.board();
    
    // Encourage piece development
    let developedPieces = 0;
    
    // Count developed minor pieces
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece && (piece.type === 'n' || piece.type === 'b')) {
          // Check if piece has moved from starting position
          const isWhite = piece.color === 'w';
          const startingRank = isWhite ? 7 : 0;
          
          if (rank !== startingRank) {
            developedPieces++;
          }
        }
      }
    }
    
    bonus += developedPieces * 15; // Reward development
    
    // Discourage moving the same piece multiple times in opening
    // This is a simplified heuristic
    
    return bonus;
  }

  private getPositionalBonus(piece: any, rank: number, file: number): number {
    const centerFiles = [3, 4];
    const centerRanks = [3, 4];
    
    let bonus = 0;
    
    // Center control bonus
    if (centerFiles.includes(file) && centerRanks.includes(rank)) {
      bonus += 10;
    }
    
    // Piece-specific positional bonuses
    switch (piece.type) {
      case 'p':
        // Pawns are better when advanced
        bonus += piece.color === 'w' ? (7 - rank) * 2 : rank * 2;
        break;
      case 'n':
        // Knights are better in the center
        if (centerFiles.includes(file) && centerRanks.includes(rank)) {
          bonus += 20;
        }
        break;
      case 'b':
        // Bishops are better on long diagonals
        bonus += 5;
        break;
    }
    
    return bonus;
  }
}