import { Chess } from 'chess.js';
import { OpenAIChessAI } from './openai-chess-ai';
import type { Difficulty } from './chess-ai';

export interface LearningOpportunity {
  type: 'tactical' | 'strategic' | 'endgame' | 'opening' | 'mistake_analysis';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  position: string; // FEN
  moveContext?: string;
  relatedConcepts: string[];
  suggestedActions: string[];
  estimatedTime: number; // minutes
}

export interface AnalysisContext {
  fen: string;
  lastMove?: string;
  evaluation: number;
  depth: number;
  engine: string;
  gamePhase: 'opening' | 'middlegame' | 'endgame';
  moveNumber: number;
  userElo: number;
  difficulty: Difficulty;
}

export class LearningOpportunityDetector {
  private openai: OpenAIChessAI;
  
  constructor() {
    this.openai = new OpenAIChessAI('intermediate');
  }

  /**
   * Detect learning opportunities from real-time analysis
   */
  public async detectOpportunities(
    analysisContext: AnalysisContext,
    previousEvaluation?: number
  ): Promise<LearningOpportunity[]> {
    const opportunities: LearningOpportunity[] = [];
    
    try {
      // 1. Detect evaluation swings (blunders, missed opportunities)
      if (previousEvaluation !== undefined) {
        const evalSwing = Math.abs(analysisContext.evaluation - previousEvaluation);
        if (evalSwing >= 100) { // Significant swing
          const blunderOpportunity = this.detectBlunderLearning(analysisContext, previousEvaluation);
          if (blunderOpportunity) opportunities.push(blunderOpportunity);
        }
      }

      // 2. Detect tactical patterns
      const tacticalOpportunity = await this.detectTacticalPatterns(analysisContext);
      if (tacticalOpportunity) opportunities.push(tacticalOpportunity);

      // 3. Detect strategic concepts based on position
      const strategicOpportunity = this.detectStrategicConcepts(analysisContext);
      if (strategicOpportunity) opportunities.push(strategicOpportunity);

      // 4. Detect opening principles (first 15 moves)
      if (analysisContext.gamePhase === 'opening') {
        const openingOpportunity = this.detectOpeningPrinciples(analysisContext);
        if (openingOpportunity) opportunities.push(openingOpportunity);
      }

      // 5. Detect endgame learning opportunities  
      if (analysisContext.gamePhase === 'endgame') {
        const endgameOpportunity = this.detectEndgamePrinciples(analysisContext);
        if (endgameOpportunity) opportunities.push(endgameOpportunity);
      }

      // Sort by urgency and relevance
      return opportunities
        .sort((a, b) => this.getUrgencyScore(b.urgency) - this.getUrgencyScore(a.urgency))
        .slice(0, 3); // Limit to 3 most important opportunities
        
    } catch (error) {
      console.error('[LearningDetector] Error detecting opportunities:', error);
      return [];
    }
  }

  private detectBlunderLearning(
    context: AnalysisContext,
    previousEval: number
  ): LearningOpportunity | null {
    const evalChange = context.evaluation - previousEval;
    const isBlunder = Math.abs(evalChange) >= 200;
    
    if (!isBlunder) return null;

    const lostAdvantage = evalChange < -200;
    const missedOpportunity = evalChange > 200;

    return {
      type: 'mistake_analysis',
      urgency: 'critical',
      title: lostAdvantage ? 'Blunder Analysis' : 'Missed Opportunity',
      description: lostAdvantage 
        ? `A significant advantage was lost with the last move (evaluation swing: ${(Math.abs(evalChange)/100).toFixed(1)} points)`
        : `A major tactical opportunity was available in the position`,
      position: context.fen,
      moveContext: context.lastMove,
      relatedConcepts: lostAdvantage 
        ? ['Calculation', 'Tactical vision', 'Time management']
        : ['Pattern recognition', 'Tactical motifs', 'Combination play'],
      suggestedActions: [
        'Review this position with the engine',
        'Practice similar tactical patterns',
        'Analyze what you missed'
      ],
      estimatedTime: 10
    };
  }

  private async detectTacticalPatterns(context: AnalysisContext): Promise<LearningOpportunity | null> {
    try {
      const chess = new Chess(context.fen);
      const position = chess.board();
      
      // Simple heuristics for common tactical patterns
      const patterns = this.identifyTacticalPatterns(position, context);
      
      if (patterns.length === 0) return null;

      return {
        type: 'tactical',
        urgency: context.evaluation > 150 ? 'high' : 'medium',
        title: 'Tactical Pattern Detected',
        description: `This position contains tactical elements: ${patterns.join(', ')}`,
        position: context.fen,
        moveContext: context.lastMove,
        relatedConcepts: patterns,
        suggestedActions: [
          'Look for tactical motifs in this position',
          'Practice similar patterns in puzzle mode',
          'Calculate key variations'
        ],
        estimatedTime: 8
      };
    } catch (error) {
      console.error('Tactical pattern detection error:', error);
      return null;
    }
  }

  private detectStrategicConcepts(context: AnalysisContext): LearningOpportunity | null {
    if (context.gamePhase !== 'middlegame') return null;
    if (Math.abs(context.evaluation) > 300) return null; // Too tactical

    const concepts = this.identifyStrategicThemes(context);
    
    if (concepts.length === 0) return null;

    return {
      type: 'strategic',
      urgency: 'medium',
      title: 'Strategic Concept',
      description: `This position demonstrates important strategic principles`,
      position: context.fen,
      moveContext: context.lastMove,
      relatedConcepts: concepts,
      suggestedActions: [
        'Study the pawn structure',
        'Analyze piece activity',
        'Consider long-term planning'
      ],
      estimatedTime: 12
    };
  }

  private detectOpeningPrinciples(context: AnalysisContext): LearningOpportunity | null {
    if (context.moveNumber > 15) return null;

    const chess = new Chess(context.fen);
    const violations = this.checkOpeningPrinciples(chess, context);

    if (violations.length === 0) return null;

    return {
      type: 'opening',
      urgency: violations.length > 2 ? 'high' : 'medium',
      title: 'Opening Principles',
      description: `Review fundamental opening concepts in this position`,
      position: context.fen,
      moveContext: context.lastMove,
      relatedConcepts: violations,
      suggestedActions: [
        'Focus on piece development',
        'Control the center',
        'Ensure king safety'
      ],
      estimatedTime: 6
    };
  }

  private detectEndgamePrinciples(context: AnalysisContext): LearningOpportunity | null {
    const chess = new Chess(context.fen);
    const pieceCount = this.countPieces(chess);
    
    if (pieceCount > 12) return null; // Not really endgame
    
    const endgameType = this.identifyEndgameType(chess);
    if (!endgameType) return null;

    return {
      type: 'endgame',
      urgency: 'high',
      title: 'Endgame Technique',
      description: `This is a ${endgameType} endgame with specific principles to learn`,
      position: context.fen,
      moveContext: context.lastMove,
      relatedConcepts: ['King activity', 'Pawn promotion', 'Opposition'],
      suggestedActions: [
        'Study key endgame positions',
        'Practice pawn endgames',
        'Learn theoretical positions'
      ],
      estimatedTime: 15
    };
  }

  // Helper methods for pattern recognition
  private identifyTacticalPatterns(board: any, context: AnalysisContext): string[] {
    const patterns: string[] = [];
    
    // Simple heuristics based on evaluation and context
    if (context.evaluation > 200) patterns.push('Winning combination');
    if (context.engine === 'stockfish' && context.depth >= 15) patterns.push('Deep calculation');
    
    // Add more sophisticated pattern detection here
    return patterns;
  }

  private identifyStrategicThemes(context: AnalysisContext): string[] {
    const themes: string[] = [];
    
    if (context.gamePhase === 'middlegame') {
      themes.push('Piece coordination', 'Pawn structure', 'King safety');
    }
    
    return themes;
  }

  private checkOpeningPrinciples(chess: Chess, context: AnalysisContext): string[] {
    const violations: string[] = [];
    
    // Basic opening principle checks
    if (context.moveNumber <= 10) {
      violations.push('Development', 'Center control');
    }
    
    return violations;
  }

  private identifyEndgameType(chess: Chess): string | null {
    const pieceCount = this.countPieces(chess);
    
    if (pieceCount <= 6) return 'King and pawn';
    if (pieceCount <= 8) return 'Minor piece';
    return null;
  }

  private countPieces(chess: Chess): number {
    const board = chess.board();
    let count = 0;
    
    for (const row of board) {
      for (const square of row) {
        if (square) count++;
      }
    }
    
    return count;
  }

  private getUrgencyScore(urgency: string): number {
    switch (urgency) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }
}

export const learningDetector = new LearningOpportunityDetector();