import { Chess, Move } from 'chess.js';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

interface MoveEvaluation {
  move: Move;
  score: number;
}

export class ChessAI {
  private difficulty: Difficulty;
  private maxDepth: number;

  constructor(difficulty: Difficulty = 'beginner') {
    this.difficulty = difficulty;
    this.maxDepth = this.getDepthForDifficulty(difficulty);
  }

  private getDepthForDifficulty(difficulty: Difficulty): number {
    switch (difficulty) {
      case 'beginner': return 2;
      case 'intermediate': return 3;
      case 'advanced': return 4;
      default: return 2;
    }
  }

  public getBestMove(fen: string): Move | null {
    const chess = new Chess(fen);
    const possibleMoves = chess.moves({ verbose: true });
    
    if (possibleMoves.length === 0) {
      return null;
    }

    // For beginner difficulty, add some randomness
    if (this.difficulty === 'beginner' && Math.random() < 0.3) {
      return this.getRandomMove(possibleMoves);
    }

    const bestMove = this.minimax(chess, this.maxDepth, -Infinity, Infinity, false);
    return bestMove.move;
  }

  private getRandomMove(moves: Move[]): Move {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  private minimax(
    chess: Chess,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): MoveEvaluation {
    if (depth === 0 || chess.isGameOver()) {
      return {
        move: null as any,
        score: this.evaluatePosition(chess)
      };
    }

    const moves = chess.moves({ verbose: true });
    let bestMove: Move = moves[0];

    if (isMaximizing) {
      let maxScore = -Infinity;
      
      for (const move of moves) {
        chess.move(move);
        const evaluation = this.minimax(chess, depth - 1, alpha, beta, false);
        chess.undo();

        if (evaluation.score > maxScore) {
          maxScore = evaluation.score;
          bestMove = move;
        }

        alpha = Math.max(alpha, evaluation.score);
        if (beta <= alpha) {
          break; // Alpha-beta pruning
        }
      }

      return { move: bestMove, score: maxScore };
    } else {
      let minScore = Infinity;
      
      for (const move of moves) {
        chess.move(move);
        const evaluation = this.minimax(chess, depth - 1, alpha, beta, true);
        chess.undo();

        if (evaluation.score < minScore) {
          minScore = evaluation.score;
          bestMove = move;
        }

        beta = Math.min(beta, evaluation.score);
        if (beta <= alpha) {
          break; // Alpha-beta pruning
        }
      }

      return { move: bestMove, score: minScore };
    }
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

    // Position bonus tables (simplified)
    const pawnTable = [
      [0,  0,  0,  0,  0,  0,  0,  0],
      [50, 50, 50, 50, 50, 50, 50, 50],
      [10, 10, 20, 30, 30, 20, 10, 10],
      [5,  5, 10, 25, 25, 10,  5,  5],
      [0,  0,  0, 20, 20,  0,  0,  0],
      [5, -5,-10,  0,  0,-10, -5,  5],
      [5, 10, 10,-20,-20, 10, 10,  5],
      [0,  0,  0,  0,  0,  0,  0,  0]
    ];

    const knightTable = [
      [-50,-40,-30,-30,-30,-30,-40,-50],
      [-40,-20,  0,  0,  0,  0,-20,-40],
      [-30,  0, 10, 15, 15, 10,  0,-30],
      [-30,  5, 15, 20, 20, 15,  5,-30],
      [-30,  0, 15, 20, 20, 15,  0,-30],
      [-30,  5, 10, 15, 15, 10,  5,-30],
      [-40,-20,  0,  5,  5,  0,-20,-40],
      [-50,-40,-30,-30,-30,-30,-40,-50]
    ];

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece) {
          const pieceValue = pieceValues[piece.type as keyof typeof pieceValues];
          let positionBonus = 0;

          // Add position bonuses
          if (piece.type === 'p') {
            positionBonus = pawnTable[piece.color === 'w' ? rank : 7 - rank][file];
          } else if (piece.type === 'n') {
            positionBonus = knightTable[piece.color === 'w' ? rank : 7 - rank][file];
          }

          const pieceScore = pieceValue + positionBonus;
          score += piece.color === 'w' ? pieceScore : -pieceScore;
        }
      }
    }

    // Bonus for castling rights
    if (chess.getCastlingRights('w').k) score += 30;
    if (chess.getCastlingRights('w').q) score += 20;
    if (chess.getCastlingRights('b').k) score -= 30;
    if (chess.getCastlingRights('b').q) score -= 20;

    // Mobility bonus
    const whiteMoves = chess.turn() === 'w' ? chess.moves().length : 0;
    chess.load(chess.fen().replace(' w ', ' b '));
    const blackMoves = chess.moves().length;
    chess.load(chess.fen().replace(' b ', ' w '));
    
    score += (whiteMoves - blackMoves) * 2;

    return chess.turn() === 'w' ? score : -score;
  }
}