import { Chess, Move, Square } from 'chess.js';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

// Piece values for evaluation
const PIECE_VALUES = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
  P: -100, N: -320, B: -330, R: -500, Q: -900, K: -20000
};

// Positional piece tables for better evaluation
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

export class ChessAI {
  private difficulty: Difficulty;
  private transpositionTable: Map<string, { score: number; depth: number }>;

  constructor(difficulty: Difficulty = 'beginner') {
    this.difficulty = difficulty;
    this.transpositionTable = new Map();
  }

  public getBestMove(fen: string): Move | null {
    const chess = new Chess(fen);
    const possibleMoves = chess.moves({ verbose: true });
    
    if (possibleMoves.length === 0) {
      return null;
    }

    console.log(`ChessAI: Computing ${this.difficulty} move with ${possibleMoves.length} options`);

    // For intermediate and advanced, use proper minimax search
    const searchDepth = this.getSearchDepth();
    const isMaximizing = chess.turn() === 'b'; // AI plays as black, maximize
    
    console.log(`ChessAI: ${this.difficulty} using minimax depth ${searchDepth}`);
    const result = this.minimax(chess, searchDepth, -Infinity, Infinity, isMaximizing);
    
    if (result.bestMove) {
      console.log(`ChessAI: ${this.difficulty} selected ${result.bestMove.san} (score: ${result.score.toFixed(2)})`);
      return result.bestMove;
    }

    // Fallback: For beginner, occasionally play random moves for learning
    if (this.difficulty === 'beginner' && Math.random() < 0.3) {
      // Still check for critical moves first
      const criticalMove = this.findCriticalMove(chess, possibleMoves);
      if (criticalMove) {
        console.log(`ChessAI: Found critical move for beginner: ${criticalMove.san}`);
        return criticalMove;
      }
      
      // Otherwise, bias towards good moves but sometimes play weaker ones
      const scoredMoves = possibleMoves.map(move => {
        chess.move(move);
        const score = this.evaluatePosition(chess) + (Math.random() - 0.5) * 50;
        chess.undo();
        return { move, score };
      });
      
      scoredMoves.sort((a, b) => b.score - a.score);
      // Pick from top 3 moves with some randomness
      const selectedMove = scoredMoves[Math.floor(Math.random() * Math.min(3, scoredMoves.length))].move;
      console.log(`ChessAI: Beginner random selection: ${selectedMove.san}`);
      return selectedMove;
    }
    
    console.log(`ChessAI: ${this.difficulty} fallback to first move: ${possibleMoves[0].san}`);
    return possibleMoves[0];
  }

  private getSearchDepth(): number {
    switch (this.difficulty) {
      case 'beginner': return 2;
      case 'intermediate': return 3;
      case 'advanced': return 5; // Even deeper for stronger play
      default: return 2;
    }
  }

  // Advanced minimax algorithm with alpha-beta pruning
  private minimax(
    chess: Chess, 
    depth: number, 
    alpha: number, 
    beta: number, 
    isMaximizing: boolean
  ): { bestMove: Move | null; score: number } {
    const fen = chess.fen();
    
    // Check transposition table
    if (this.transpositionTable.has(fen)) {
      const entry = this.transpositionTable.get(fen)!;
      if (entry.depth >= depth) {
        return { bestMove: null, score: entry.score };
      }
    }

    if (depth === 0 || chess.isGameOver()) {
      const score = this.evaluatePosition(chess);
      this.transpositionTable.set(fen, { score, depth });
      return { bestMove: null, score };
    }

    const moves = chess.moves({ verbose: true });
    let bestMove: Move | null = null;
    let bestScore = isMaximizing ? -Infinity : Infinity;

    // Order moves for better alpha-beta pruning
    const orderedMoves = this.orderMoves(chess, moves);

    for (const move of orderedMoves) {
      chess.move(move);
      const result = this.minimax(chess, depth - 1, alpha, beta, !isMaximizing);
      chess.undo();

      if (isMaximizing) {
        if (result.score > bestScore) {
          bestScore = result.score;
          bestMove = move;
        }
        alpha = Math.max(alpha, bestScore);
      } else {
        if (result.score < bestScore) {
          bestScore = result.score;
          bestMove = move;
        }
        beta = Math.min(beta, bestScore);
      }

      // Alpha-beta pruning
      if (beta <= alpha) {
        break;
      }
    }

    this.transpositionTable.set(fen, { score: bestScore, depth });
    return { bestMove, score: bestScore };
  }

  // Order moves for better alpha-beta pruning efficiency
  private orderMoves(chess: Chess, moves: Move[]): Move[] {
    return moves.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Prioritize captures
      if (a.captured) scoreA += 100 + (PIECE_VALUES[a.captured as keyof typeof PIECE_VALUES] || 0);
      if (b.captured) scoreB += 100 + (PIECE_VALUES[b.captured as keyof typeof PIECE_VALUES] || 0);

      // Prioritize checks
      chess.move(a);
      if (chess.inCheck()) scoreA += 50;
      chess.undo();

      chess.move(b);
      if (chess.inCheck()) scoreB += 50;
      chess.undo();

      // Prioritize central moves
      const centerBonus = (square: Square) => {
        const file = square.charCodeAt(0) - 97; // a=0, h=7
        const rank = parseInt(square[1]) - 1; // 1=0, 8=7
        const distFromCenter = Math.abs(3.5 - file) + Math.abs(3.5 - rank);
        return 10 - distFromCenter;
      };

      scoreA += centerBonus(a.to);
      scoreB += centerBonus(b.to);

      return scoreB - scoreA;
    });
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

  // Enhanced position evaluation function
  private evaluatePosition(chess: Chess): number {
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? -20000 : 20000;
    }
    
    if (chess.isDraw() || chess.isStalemate()) {
      return 0;
    }

    let score = 0;
    const board = chess.board();

    // Material and positional evaluation
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece) {
          const pieceKey = (piece.type + (piece.color === 'w' ? '' : '')) as keyof typeof PIECE_VALUES;
          const pieceValue = PIECE_VALUES[pieceKey] || 0;
          const positionalValue = this.getPositionalValue(piece, rank, file);
          
          if (piece.color === 'b') {
            score += pieceValue + positionalValue;
          } else {
            score -= pieceValue + positionalValue;
          }
        }
      }
    }

    // Advanced tactical evaluation
    if (this.difficulty === 'advanced' || this.difficulty === 'intermediate') {
      score += this.getTacticalScore(chess);
    }

    return score;
  }

  // Get positional value based on piece type and square
  private getPositionalValue(piece: any, rank: number, file: number): number {
    const isWhite = piece.color === 'w';
    const squareIndex = isWhite ? (7 - rank) * 8 + file : rank * 8 + file;
    
    switch (piece.type) {
      case 'p':
        return PAWN_TABLE[squareIndex] * (isWhite ? -1 : 1);
      case 'n':
        return KNIGHT_TABLE[squareIndex] * (isWhite ? -1 : 1);
      case 'b':
        // Bishops are better on long diagonals
        const diagonalBonus = Math.abs(rank - file) <= 1 ? 10 : 0;
        return diagonalBonus * (isWhite ? -1 : 1);
      case 'r':
        // Rooks prefer open files and 7th rank
        let rookBonus = 0;
        if (rank === (isWhite ? 1 : 6)) rookBonus += 20; // 7th rank
        return rookBonus * (isWhite ? -1 : 1);
      case 'q':
        // Queen prefers central squares
        const queenCenterBonus = (4 - Math.abs(3.5 - file)) + (4 - Math.abs(3.5 - rank));
        return queenCenterBonus * 2 * (isWhite ? -1 : 1);
      case 'k':
        // King safety evaluation (different for opening/endgame)
        const kingBonus = this.getKingSafetyBonus(rank, file, isWhite);
        return kingBonus * (isWhite ? -1 : 1);
      default:
        return 0;
    }
  }

  // Enhanced tactical evaluation
  private getTacticalScore(chess: Chess): number {
    let tacticalScore = 0;
    
    // Check bonus/penalty
    if (chess.inCheck()) {
      tacticalScore += chess.turn() === 'w' ? -30 : 30;
    }
    
    // Mobility (number of legal moves)
    const currentMobility = chess.moves().length;
    tacticalScore += chess.turn() === 'b' ? currentMobility * 1 : -currentMobility * 1;
    
    // Control of center squares
    const centerSquares = ['d4', 'd5', 'e4', 'e5'] as Square[];
    for (const square of centerSquares) {
      const piece = chess.get(square);
      if (piece) {
        if (piece.color === 'b') {
          tacticalScore += piece.type === 'p' ? 10 : 5;
        } else {
          tacticalScore -= piece.type === 'p' ? 10 : 5;
        }
      }
    }

    return tacticalScore;
  }

  // King safety evaluation
  private getKingSafetyBonus(rank: number, file: number, isWhite: boolean): number {
    // In opening/middlegame, king should be castled (corners)
    // In endgame, king should be active (center)
    
    // For now, prefer corners for safety
    if ((file <= 2 || file >= 5) && (rank === (isWhite ? 7 : 0))) {
      return 30; // Castled position bonus
    }
    
    // Penalty for exposed king
    if (rank >= 2 && rank <= 5 && file >= 2 && file <= 5) {
      return -20; // Exposed king penalty
    }
    
    return 0;
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