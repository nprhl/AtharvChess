import { Chess } from 'chess.js';
import { StockfishAI } from './stockfish-ai';
import type { Difficulty } from './chess-ai';

export type MoveCategory = 
  | 'brilliant'    // ♔ Only winning move in complex position
  | 'great'        // ⭐ Near-perfect, slight alternatives exist
  | 'best'         // ✓ Optimal or near-optimal
  | 'excellent'    // Very strong move
  | 'good'         // Solid, reasonable move
  | 'book'         // 📖 Theoretical opening move
  | 'inaccuracy'   // ? Suboptimal but not harmful
  | 'mistake'      // ‼ Clear error
  | 'miss'         // Missed significant opportunity
  | 'blunder';     // ⚠ Serious error

export interface MoveClassification {
  category: MoveCategory;
  centipawnLoss: number;
  accuracy: number;
  explanation: string;
  icon: string;
  color: string;
  isOnlyMove?: boolean;
  isBookMove?: boolean;
  alternativeMoves?: string[];
  positionComplexity?: number;
  gamePhase: 'opening' | 'middlegame' | 'endgame';
}

export interface PositionEvaluation {
  fen: string;
  bestMove: string;
  evaluation: number;
  depth: number;
  alternatives: Array<{
    move: string;
    evaluation: number;
    centipawnDiff: number;
  }>;
}

export class MoveClassifier {
  private stockfishAI: StockfishAI;
  private openingBook: Map<string, string[]>;

  constructor() {
    this.stockfishAI = new StockfishAI('advanced');
    this.openingBook = this.initializeOpeningBook();
  }

  /**
   * Classify a move based on engine analysis and position context
   */
  public async classifyMove(
    beforeFen: string,
    afterFen: string,
    playedMove: string,
    moveNumber: number
  ): Promise<MoveClassification> {
    try {
      console.log(`[MoveClassifier] Classifying move: ${playedMove} (move ${moveNumber})`);

      // Determine game phase
      const gamePhase = this.determineGamePhase(beforeFen, moveNumber);
      
      // Check for opening book move first
      if (gamePhase === 'opening' && moveNumber <= 20) {
        const bookClassification = this.checkOpeningBook(beforeFen, playedMove, gamePhase);
        if (bookClassification) {
          console.log(`[MoveClassifier] Move ${playedMove} is from opening book`);
          return bookClassification;
        }
      }

      // Get engine evaluation of the position before the move
      const beforeEval = await this.evaluatePosition(beforeFen);
      const afterEval = await this.evaluatePosition(afterFen);
      
      if (!beforeEval || !afterEval) {
        console.warn('[MoveClassifier] Failed to get engine evaluation');
        return this.createFallbackClassification(playedMove, gamePhase);
      }

      // Calculate centipawn loss
      const centipawnLoss = this.calculateCentipawnLoss(
        beforeEval,
        afterEval,
        playedMove
      );

      // Analyze position complexity
      const positionComplexity = this.analyzePositionComplexity(beforeFen);
      
      // Check if this was the only good move (for brilliant classification)
      const isOnlyMove = this.isOnlyGoodMove(beforeEval, playedMove);

      // Determine category based on centipawn loss and context
      const category = this.determineMoveCategory(
        centipawnLoss,
        positionComplexity,
        isOnlyMove,
        gamePhase,
        moveNumber
      );

      // Calculate accuracy percentage
      const accuracy = this.calculateAccuracy(centipawnLoss, category);

      // Generate explanation
      const explanation = this.generateExplanation(
        category,
        centipawnLoss,
        playedMove,
        beforeEval,
        positionComplexity
      );

      const classification: MoveClassification = {
        category,
        centipawnLoss,
        accuracy,
        explanation,
        icon: this.getCategoryIcon(category),
        color: this.getCategoryColor(category),
        isOnlyMove,
        isBookMove: false,
        alternativeMoves: beforeEval.alternatives.slice(0, 3).map(alt => alt.move),
        positionComplexity,
        gamePhase
      };

      console.log(`[MoveClassifier] Move ${playedMove} classified as: ${category} (${accuracy}% accuracy, ${centipawnLoss}cp loss)`);
      return classification;

    } catch (error) {
      console.error('[MoveClassifier] Classification error:', error);
      return this.createFallbackClassification(playedMove, this.determineGamePhase(beforeFen, moveNumber));
    }
  }

  /**
   * Evaluate position with engine to get best moves and evaluations
   */
  private async evaluatePosition(fen: string): Promise<PositionEvaluation | null> {
    try {
      const chess = new Chess(fen);
      
      // Get primary evaluation
      const result = await this.stockfishAI.getMove(chess);
      if (!result || !result.move) {
        return null;
      }

      // Analyze multiple candidate moves for comparison
      const legalMoves = chess.moves();
      const alternatives: Array<{ move: string; evaluation: number; centipawnDiff: number }> = [];

      // Evaluate top 5 legal moves
      for (let i = 0; i < Math.min(5, legalMoves.length); i++) {
        const move = legalMoves[i];
        const tempChess = new Chess(fen);
        
        try {
          tempChess.move(move);
          const moveEval = await this.stockfishAI.getMove(tempChess);
          
          if (moveEval && moveEval.evaluation !== undefined) {
            const centipawnDiff = Math.abs(result.evaluation - moveEval.evaluation);
            alternatives.push({
              move,
              evaluation: moveEval.evaluation,
              centipawnDiff
            });
          }
        } catch (moveError) {
          // Skip invalid moves
          continue;
        }
      }

      // Sort alternatives by quality (lowest centipawn difference = better)
      alternatives.sort((a, b) => a.centipawnDiff - b.centipawnDiff);

      return {
        fen,
        bestMove: result.move,
        evaluation: result.evaluation,
        depth: 15, // Stockfish depth
        alternatives
      };
    } catch (error) {
      console.error('[MoveClassifier] Position evaluation error:', error);
      return null;
    }
  }

  /**
   * Calculate centipawn loss for a played move
   */
  private calculateCentipawnLoss(
    beforeEval: PositionEvaluation,
    afterEval: PositionEvaluation,
    playedMove: string
  ): number {
    // Find the played move in alternatives
    const playedMoveAlt = beforeEval.alternatives.find(alt => 
      alt.move === playedMove || this.movesAreEquivalent(alt.move, playedMove)
    );

    if (!playedMoveAlt) {
      // If move not in alternatives, estimate centipawn loss from evaluation change
      return Math.max(0, Math.abs(beforeEval.evaluation - afterEval.evaluation));
    }

    // Calculate loss compared to best move
    const bestMoveEval = beforeEval.alternatives[0]?.evaluation || beforeEval.evaluation;
    const centipawnLoss = Math.max(0, Math.abs(bestMoveEval - playedMoveAlt.evaluation));

    return Math.round(centipawnLoss);
  }

  /**
   * Determine move category based on centipawn loss and context
   */
  private determineMoveCategory(
    centipawnLoss: number,
    positionComplexity: number,
    isOnlyMove: boolean,
    gamePhase: 'opening' | 'middlegame' | 'endgame',
    moveNumber: number
  ): MoveCategory {
    // Brilliant: Only winning move in complex position
    if (isOnlyMove && positionComplexity > 70 && centipawnLoss <= 5) {
      return 'brilliant';
    }

    // Adjust thresholds based on game phase
    const threshold = this.getPhaseThresholds(gamePhase);

    if (centipawnLoss <= threshold.best) return 'best';
    if (centipawnLoss <= threshold.great) return 'great';
    if (centipawnLoss <= threshold.excellent) return 'excellent';
    if (centipawnLoss <= threshold.good) return 'good';
    if (centipawnLoss <= threshold.inaccuracy) return 'inaccuracy';
    if (centipawnLoss <= threshold.mistake) return 'mistake';
    if (centipawnLoss <= threshold.miss) return 'miss';
    
    return 'blunder';
  }

  /**
   * Get phase-specific thresholds for move classification
   */
  private getPhaseThresholds(gamePhase: 'opening' | 'middlegame' | 'endgame') {
    switch (gamePhase) {
      case 'opening':
        return {
          best: 15,
          great: 25,
          excellent: 40,
          good: 75,
          inaccuracy: 125,
          mistake: 250,
          miss: 400
        };
      case 'middlegame':
        return {
          best: 10,
          great: 20,
          excellent: 35,
          good: 60,
          inaccuracy: 100,
          mistake: 200,
          miss: 350
        };
      case 'endgame':
        return {
          best: 5,
          great: 15,
          excellent: 25,
          good: 50,
          inaccuracy: 75,
          mistake: 150,
          miss: 300
        };
    }
  }

  /**
   * Calculate accuracy percentage from centipawn loss
   */
  private calculateAccuracy(centipawnLoss: number, category: MoveCategory): number {
    switch (category) {
      case 'brilliant': return 100;
      case 'great': return Math.max(95, 100 - centipawnLoss * 0.2);
      case 'best': return Math.max(90, 100 - centipawnLoss * 0.3);
      case 'excellent': return Math.max(85, 100 - centipawnLoss * 0.4);
      case 'good': return Math.max(70, 100 - centipawnLoss * 0.5);
      case 'book': return 85; // Standard book move accuracy
      case 'inaccuracy': return Math.max(50, 100 - centipawnLoss * 0.6);
      case 'mistake': return Math.max(25, 100 - centipawnLoss * 0.7);
      case 'miss': return Math.max(10, 100 - centipawnLoss * 0.8);
      case 'blunder': return Math.max(0, 100 - centipawnLoss * 0.9);
    }
  }

  /**
   * Analyze position complexity for brilliant move detection
   */
  private analyzePositionComplexity(fen: string): number {
    try {
      const chess = new Chess(fen);
      let complexity = 0;

      // Factor 1: Number of pieces (more pieces = more complex)
      const board = chess.board().flat().filter(piece => piece !== null);
      complexity += Math.min(32, board.length) * 2;

      // Factor 2: Number of legal moves (more options = more complex)
      const legalMoves = chess.moves();
      complexity += Math.min(50, legalMoves.length);

      // Factor 3: Tactical indicators
      const position = fen.split(' ')[0];
      
      // Check for tactical motifs
      if (position.includes('q') && position.includes('Q')) complexity += 15; // Both queens
      if (position.includes('r') && position.includes('R')) complexity += 10; // Rooks active
      if (chess.inCheck()) complexity += 20; // Check increases complexity
      
      // Factor 4: Advanced pieces (pieces not on starting squares)
      const advancedPieces = this.countAdvancedPieces(chess);
      complexity += advancedPieces * 3;

      return Math.min(100, complexity);
    } catch (error) {
      console.error('[MoveClassifier] Complexity analysis error:', error);
      return 50; // Default moderate complexity
    }
  }

  /**
   * Check if move was the only good option (for brilliant classification)
   */
  private isOnlyGoodMove(evaluation: PositionEvaluation, playedMove: string): boolean {
    if (evaluation.alternatives.length < 2) return true;

    const playedMoveAlt = evaluation.alternatives.find(alt => 
      alt.move === playedMove || this.movesAreEquivalent(alt.move, playedMove)
    );

    if (!playedMoveAlt) return false;

    // Check if other moves are significantly worse (>100 centipawn difference)
    const otherMoves = evaluation.alternatives.filter(alt => alt.move !== playedMove);
    const significantlyWorse = otherMoves.filter(alt => alt.centipawnDiff > 100);

    return significantlyWorse.length === otherMoves.length;
  }

  /**
   * Determine game phase based on FEN and move number
   */
  private determineGamePhase(fen: string, moveNumber: number): 'opening' | 'middlegame' | 'endgame' {
    if (moveNumber <= 15) return 'opening';
    
    // Count material to determine if we're in endgame
    const position = fen.split(' ')[0];
    const pieceCount = position.replace(/[^a-zA-Z]/g, '').length;
    
    if (pieceCount <= 12) return 'endgame';
    if (moveNumber <= 40) return 'middlegame';
    
    return 'endgame';
  }

  /**
   * Check if move is from opening book
   */
  private checkOpeningBook(
    fen: string, 
    move: string, 
    gamePhase: 'opening' | 'middlegame' | 'endgame'
  ): MoveClassification | null {
    const bookMoves = this.openingBook.get(fen);
    
    if (bookMoves && bookMoves.includes(move)) {
      return {
        category: 'book',
        centipawnLoss: 0,
        accuracy: 85,
        explanation: `Theoretical opening move from established chess theory`,
        icon: '📖',
        color: '#8B5A2B',
        isBookMove: true,
        gamePhase
      };
    }

    return null;
  }

  /**
   * Initialize basic opening book
   */
  private initializeOpeningBook(): Map<string, string[]> {
    const book = new Map<string, string[]>();
    
    // Starting position
    book.set('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [
      'e4', 'e3', 'd4', 'd3', 'Nf3', 'Nc3', 'c4', 'f4', 'g3', 'b3'
    ]);

    // After 1.e4
    book.set('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', [
      'e5', 'e6', 'c5', 'c6', 'd6', 'd5', 'Nf6', 'Nc6'
    ]);

    // Add more opening positions as needed
    return book;
  }

  /**
   * Generate human-readable explanation for the move classification
   */
  private generateExplanation(
    category: MoveCategory,
    centipawnLoss: number,
    move: string,
    evaluation: PositionEvaluation,
    complexity: number
  ): string {
    const bestMove = evaluation.bestMove;
    const evalDiff = centipawnLoss;

    switch (category) {
      case 'brilliant':
        return `Brilliant! ${move} is the only move that maintains your advantage in this complex position.`;
      
      case 'great':
        return `Great move! ${move} is nearly optimal with minimal loss (${evalDiff}cp).`;
      
      case 'best':
        return evalDiff === 0 
          ? `Perfect! ${move} is the engine's top choice.`
          : `Excellent choice! ${move} is virtually as good as ${bestMove}.`;
      
      case 'excellent':
        return `Very strong move. ${move} maintains a good position with small inaccuracy (${evalDiff}cp loss).`;
      
      case 'good':
        return `Solid move. ${move} is reasonable though ${bestMove} might be slightly better.`;
      
      case 'book':
        return `Theoretical opening move from established chess opening theory.`;
      
      case 'inaccuracy':
        return `Inaccurate. ${move} isn't the best choice here. Consider ${bestMove} instead (${evalDiff}cp better).`;
      
      case 'mistake':
        return `Mistake! ${move} gives away advantage. ${bestMove} was much stronger (${evalDiff}cp better).`;
      
      case 'miss':
        return `Missed opportunity! You overlooked ${bestMove} which would have given you a significant advantage.`;
      
      case 'blunder':
        return `Blunder! ${move} loses material or position. ${bestMove} was critical (${evalDiff}cp swing).`;
      
      default:
        return `Move analyzed: ${move}`;
    }
  }

  /**
   * Get visual icon for move category
   */
  private getCategoryIcon(category: MoveCategory): string {
    const icons = {
      brilliant: '♔',
      great: '⭐',
      best: '✓',
      excellent: '👍',
      good: '✔',
      book: '📖',
      inaccuracy: '?',
      mistake: '‼',
      miss: '⚠',
      blunder: '💥'
    };
    return icons[category] || '?';
  }

  /**
   * Get color coding for move category
   */
  private getCategoryColor(category: MoveCategory): string {
    const colors = {
      brilliant: '#00FF88',    // Bright green
      great: '#4CAF50',       // Green
      best: '#8BC34A',        // Light green
      excellent: '#CDDC39',   // Lime
      good: '#FFEB3B',        // Yellow
      book: '#8B5A2B',        // Brown
      inaccuracy: '#FF9800',  // Orange
      mistake: '#FF5722',     // Red-orange
      miss: '#F44336',        // Red
      blunder: '#D32F2F'      // Dark red
    };
    return colors[category] || '#757575';
  }

  /**
   * Helper methods
   */
  private movesAreEquivalent(move1: string, move2: string): boolean {
    // Basic equivalence check - can be enhanced for different notation formats
    return move1.toLowerCase() === move2.toLowerCase();
  }

  private countAdvancedPieces(chess: Chess): number {
    // Count pieces not on their starting squares
    const board = chess.board();
    let advanced = 0;

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece && this.isPieceAdvanced(piece, rank, file)) {
          advanced++;
        }
      }
    }

    return advanced;
  }

  private isPieceAdvanced(piece: any, rank: number, file: number): boolean {
    const { type, color } = piece;
    
    // Define starting positions
    const whiteStarts = { r: [0, 7], n: [1, 6], b: [2, 5], q: [3], k: [4], p: [1] };
    const blackStarts = { r: [0, 7], n: [1, 6], b: [2, 5], q: [3], k: [4], p: [6] };
    
    const starts = color === 'w' ? whiteStarts : blackStarts;
    const expectedRank = color === 'w' ? (type === 'p' ? 1 : 0) : (type === 'p' ? 6 : 7);
    
    return rank !== expectedRank || !starts[type as keyof typeof starts]?.includes(file);
  }

  /**
   * Create fallback classification when engine analysis fails
   */
  private createFallbackClassification(
    move: string, 
    gamePhase: 'opening' | 'middlegame' | 'endgame'
  ): MoveClassification {
    return {
      category: 'good',
      centipawnLoss: 50,
      accuracy: 75,
      explanation: `Move ${move} analyzed (engine evaluation unavailable)`,
      icon: '✔',
      color: '#FFEB3B',
      gamePhase
    };
  }
}

export const moveClassifier = new MoveClassifier();