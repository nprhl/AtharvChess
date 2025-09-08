import { Chess } from 'chess.js';
import { OpenAI } from 'openai';
import { StockfishAI } from './stockfish-ai';
import { enhancedChessAI } from './enhanced-chess-ai';
import { database } from './database';
import { 
  games, 
  gameAnalysis, 
  userSkillAnalytics, 
  gamePhaseAnalysis, 
  openingPerformance,
  userAchievements,
  achievements
} from '../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface GamePhase {
  phase: 'opening' | 'middlegame' | 'endgame';
  startMove: number;
  endMove: number;
  accuracy: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
}

export interface MoveAnalysis {
  moveNumber: number;
  move: string;
  fen: string;
  evaluation: number; // centipawn evaluation
  accuracy: number; // 0-100
  classification: 'brilliant' | 'great' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  phase: 'opening' | 'middlegame' | 'endgame';
  timeSpent?: number;
}

export interface CompleteGameAnalysis {
  gameId: number;
  userId: number;
  phases: GamePhase[];
  moves: MoveAnalysis[];
  overallAccuracy: number;
  openingPerformance: {
    eco: string;
    name: string;
    accuracy: number;
    blunders: number;
  };
  skillMetrics: {
    tactical: number;
    positional: number;
    endgame: number;
    timeManagement: number;
  };
  improvementAreas: string[];
  strengthAreas: string[];
}

export class ProgressAnalyticsService {
  private openai: OpenAI;
  private stockfish: StockfishAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.stockfish = new StockfishAI('advanced');
  }

  /**
   * Analyze a completed game and update all progress tracking metrics
   */
  public async analyzeCompleteGame(gameId: number): Promise<CompleteGameAnalysis | null> {
    try {
      console.log(`[ProgressAnalytics] Starting analysis for game ${gameId}`);

      // Get game data
      const game = await database.select().from(games).where(eq(games.id, gameId)).limit(1);
      if (!game.length) {
        console.error(`Game ${gameId} not found`);
        return null;
      }

      const gameData = game[0];
      const moves = gameData.moves as string[];
      
      // Perform comprehensive analysis
      const analysis = await this.performGameAnalysis(gameData, moves);
      
      // Save analysis to database
      await this.saveAnalysisResults(analysis);
      
      // Update user skill analytics
      await this.updateUserSkillAnalytics(gameData.userId!, analysis);
      
      // Update opening performance
      if (gameData.openingEco) {
        await this.updateOpeningPerformance(gameData.userId!, gameData, analysis);
      }
      
      // Check and update achievements
      await this.checkAchievements(gameData.userId!, analysis);
      
      console.log(`[ProgressAnalytics] Analysis complete for game ${gameId}`);
      return analysis;
      
    } catch (error) {
      console.error(`[ProgressAnalytics] Error analyzing game ${gameId}:`, error);
      return null;
    }
  }

  /**
   * Perform detailed game analysis using AI engines
   */
  private async performGameAnalysis(gameData: any, moves: string[]): Promise<CompleteGameAnalysis> {
    const chess = new Chess();
    const moveAnalyses: MoveAnalysis[] = [];
    const gameFens: string[] = [chess.fen()];
    
    // Replay game and collect positions
    for (const move of moves) {
      chess.move(move);
      gameFens.push(chess.fen());
    }

    // Detect game phases
    const phases = this.detectGamePhases(moves, gameFens);
    
    // Analyze each move with AI
    chess.reset();
    for (let i = 0; i < moves.length; i++) {
      const beforeFen = chess.fen();
      const move = chess.move(moves[i]);
      const afterFen = chess.fen();
      
      const moveAnalysis = await this.analyzeSingleMove(
        move.san,
        beforeFen,
        afterFen,
        i + 1,
        this.getMovePhase(i + 1, phases)
      );
      
      moveAnalyses.push(moveAnalysis);
    }

    // Calculate overall metrics
    const overallAccuracy = this.calculateOverallAccuracy(moveAnalyses);
    const skillMetrics = this.calculateSkillMetrics(moveAnalyses, phases);
    const { improvementAreas, strengthAreas } = this.identifySkillAreas(moveAnalyses, phases);

    // Opening analysis
    const openingMoves = moveAnalyses.filter(m => m.phase === 'opening');
    const openingPerformance = {
      eco: gameData.openingEco || 'Unknown',
      name: gameData.openingName || 'Unknown Opening',
      accuracy: openingMoves.reduce((sum, m) => sum + m.accuracy, 0) / Math.max(openingMoves.length, 1),
      blunders: openingMoves.filter(m => m.classification === 'blunder').length
    };

    return {
      gameId: gameData.id,
      userId: gameData.userId,
      phases,
      moves: moveAnalyses,
      overallAccuracy,
      openingPerformance,
      skillMetrics,
      improvementAreas,
      strengthAreas
    };
  }

  /**
   * Detect game phases based on move count and position characteristics
   */
  private detectGamePhases(moves: string[], fens: string[]): GamePhase[] {
    const phases: GamePhase[] = [];
    
    // Basic phase detection (can be enhanced with AI later)
    const openingEnd = Math.min(Math.max(12, moves.length * 0.25), 20);
    const middlegameEnd = Math.min(Math.max(30, moves.length * 0.75), moves.length - 10);
    
    if (openingEnd > 0) {
      phases.push({
        phase: 'opening',
        startMove: 1,
        endMove: openingEnd,
        accuracy: 0,
        blunders: 0,
        mistakes: 0,
        inaccuracies: 0
      });
    }
    
    if (middlegameEnd > openingEnd) {
      phases.push({
        phase: 'middlegame',
        startMove: openingEnd + 1,
        endMove: middlegameEnd,
        accuracy: 0,
        blunders: 0,
        mistakes: 0,
        inaccuracies: 0
      });
    }
    
    if (moves.length > middlegameEnd) {
      phases.push({
        phase: 'endgame',
        startMove: middlegameEnd + 1,
        endMove: moves.length,
        accuracy: 0,
        blunders: 0,
        mistakes: 0,
        inaccuracies: 0
      });
    }
    
    return phases;
  }

  /**
   * Analyze a single move using AI engines
   */
  private async analyzeSingleMove(
    move: string,
    beforeFen: string,
    afterFen: string,
    moveNumber: number,
    phase: 'opening' | 'middlegame' | 'endgame'
  ): Promise<MoveAnalysis> {
    try {
      // Get engine evaluation
      const evaluation = await this.getPositionEvaluation(afterFen);
      
      // Calculate move accuracy using AI analysis
      const accuracy = await this.calculateMoveAccuracy(move, beforeFen, afterFen);
      
      // Classify move quality
      const classification = this.classifyMoveQuality(accuracy);
      
      return {
        moveNumber,
        move,
        fen: afterFen,
        evaluation,
        accuracy,
        classification,
        phase
      };
      
    } catch (error) {
      console.error(`Error analyzing move ${moveNumber}:`, error);
      return {
        moveNumber,
        move,
        fen: afterFen,
        evaluation: 0,
        accuracy: 75, // Default reasonable accuracy
        classification: 'good',
        phase
      };
    }
  }

  /**
   * Get position evaluation using available engines
   */
  private async getPositionEvaluation(fen: string): Promise<number> {
    try {
      // Try Stockfish first for accurate evaluation
      const evaluation = await this.stockfish.evaluatePosition(fen);
      return evaluation || 0;
    } catch (error) {
      console.log('Stockfish evaluation failed, using fallback');
      return 0;
    }
  }

  /**
   * Calculate move accuracy using AI analysis
   */
  private async calculateMoveAccuracy(move: string, beforeFen: string, afterFen: string): Promise<number> {
    try {
      // Use OpenAI to analyze move quality
      if (process.env.OPENAI_API_KEY) {
        const accuracy = await this.getAIAccuracyRating(move, beforeFen, afterFen);
        return accuracy;
      }
      
      // Fallback: basic accuracy calculation
      return this.calculateBasicAccuracy(move, beforeFen, afterFen);
      
    } catch (error) {
      console.log('AI accuracy calculation failed, using basic method');
      return this.calculateBasicAccuracy(move, beforeFen, afterFen);
    }
  }

  /**
   * Get AI-powered accuracy rating from OpenAI
   */
  private async getAIAccuracyRating(move: string, beforeFen: string, afterFen: string): Promise<number> {
    const prompt = `Analyze this chess move for accuracy:
    
Move: ${move}
Position before: ${beforeFen}
Position after: ${afterFen}

Rate the move accuracy from 0-100 considering:
- Tactical soundness
- Positional principles
- Best alternatives available

Return only a number between 0 and 100.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10,
        temperature: 0.1
      });

      const rating = parseInt(response.choices[0]?.message?.content?.trim() || '75');
      return Math.max(0, Math.min(100, rating));
    } catch (error) {
      console.log('OpenAI accuracy rating failed');
      return 75;
    }
  }

  /**
   * Basic accuracy calculation without AI
   */
  private calculateBasicAccuracy(move: string, beforeFen: string, afterFen: string): number {
    const chess = new Chess(beforeFen);
    const moves = chess.moves({ verbose: true });
    
    // Basic factors that influence accuracy
    let accuracy = 80; // Base accuracy
    
    // Check for captures
    if (move.includes('x')) accuracy += 10;
    
    // Check for checks
    if (move.includes('+')) accuracy += 5;
    
    // Check for castling
    if (move.includes('O-O')) accuracy += 15;
    
    // Penalize if very few legal moves (might indicate forced play)
    if (moves.length < 5) accuracy -= 10;
    
    return Math.max(30, Math.min(100, accuracy));
  }

  /**
   * Classify move quality based on accuracy
   */
  private classifyMoveQuality(accuracy: number): 'brilliant' | 'great' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' {
    if (accuracy >= 95) return 'brilliant';
    if (accuracy >= 85) return 'great';
    if (accuracy >= 75) return 'good';
    if (accuracy >= 60) return 'inaccuracy';
    if (accuracy >= 40) return 'mistake';
    return 'blunder';
  }

  /**
   * Get the phase for a specific move number
   */
  private getMovePhase(moveNumber: number, phases: GamePhase[]): 'opening' | 'middlegame' | 'endgame' {
    for (const phase of phases) {
      if (moveNumber >= phase.startMove && moveNumber <= phase.endMove) {
        return phase.phase;
      }
    }
    return 'middlegame'; // Default fallback
  }

  /**
   * Calculate overall game accuracy
   */
  private calculateOverallAccuracy(moves: MoveAnalysis[]): number {
    if (moves.length === 0) return 0;
    return moves.reduce((sum, move) => sum + move.accuracy, 0) / moves.length;
  }

  /**
   * Calculate skill-specific metrics
   */
  private calculateSkillMetrics(moves: MoveAnalysis[], phases: GamePhase[]): {
    tactical: number;
    positional: number;
    endgame: number;
    timeManagement: number;
  } {
    const tacticalMoves = moves.filter(m => m.move.includes('x') || m.move.includes('+'));
    const endgameMoves = moves.filter(m => m.phase === 'endgame');
    
    return {
      tactical: tacticalMoves.length > 0 ? 
        tacticalMoves.reduce((sum, m) => sum + m.accuracy, 0) / tacticalMoves.length : 75,
      positional: moves.filter(m => m.phase === 'middlegame')
        .reduce((sum, m) => sum + m.accuracy, 0) / Math.max(1, moves.filter(m => m.phase === 'middlegame').length),
      endgame: endgameMoves.length > 0 ?
        endgameMoves.reduce((sum, m) => sum + m.accuracy, 0) / endgameMoves.length : 75,
      timeManagement: 85 // Placeholder - would need actual time data
    };
  }

  /**
   * Identify improvement and strength areas
   */
  private identifySkillAreas(moves: MoveAnalysis[], phases: GamePhase[]): {
    improvementAreas: string[];
    strengthAreas: string[];
  } {
    const improvementAreas: string[] = [];
    const strengthAreas: string[] = [];
    
    // Analyze phase performance
    for (const phase of phases) {
      const phaseMoves = moves.filter(m => m.phase === phase.phase);
      const phaseAccuracy = phaseMoves.reduce((sum, m) => sum + m.accuracy, 0) / Math.max(1, phaseMoves.length);
      
      if (phaseAccuracy < 70) {
        improvementAreas.push(phase.phase);
      } else if (phaseAccuracy > 85) {
        strengthAreas.push(phase.phase);
      }
    }
    
    // Analyze tactical performance
    const tacticalMoves = moves.filter(m => m.move.includes('x') || m.move.includes('+'));
    const tacticalAccuracy = tacticalMoves.length > 0 ?
      tacticalMoves.reduce((sum, m) => sum + m.accuracy, 0) / tacticalMoves.length : 75;
    
    if (tacticalAccuracy < 70) {
      improvementAreas.push('tactics');
    } else if (tacticalAccuracy > 85) {
      strengthAreas.push('tactics');
    }
    
    // Analyze blunder frequency
    const blunders = moves.filter(m => m.classification === 'blunder').length;
    if (blunders > 2) {
      improvementAreas.push('accuracy');
    } else if (blunders === 0) {
      strengthAreas.push('consistency');
    }
    
    return { improvementAreas, strengthAreas };
  }

  /**
   * Save analysis results to database
   */
  private async saveAnalysisResults(analysis: CompleteGameAnalysis): Promise<void> {
    try {
      // Save game analysis
      await database.insert(gameAnalysis).values({
        userId: analysis.userId,
        gameId: analysis.gameId,
        movesAnalyzed: analysis.moves,
        analysisEngine: 'openai-stockfish',
        averageAccuracy: analysis.overallAccuracy.toString(),
        blunders: analysis.moves.filter(m => m.classification === 'blunder').length,
        mistakes: analysis.moves.filter(m => m.classification === 'mistake').length,
        inaccuracies: analysis.moves.filter(m => m.classification === 'inaccuracy').length,
        bestMovePercentage: (analysis.moves.filter(m => 
          m.classification === 'brilliant' || m.classification === 'great'
        ).length / analysis.moves.length * 100).toString(),
        analysisCompleted: true,
        weaknessesFound: analysis.improvementAreas,
        strengthsFound: analysis.strengthAreas
      });

      // Save phase analysis
      for (const phase of analysis.phases) {
        const phaseMoves = analysis.moves.filter(m => m.phase === phase.phase);
        const phaseAccuracy = phaseMoves.reduce((sum, m) => sum + m.accuracy, 0) / Math.max(1, phaseMoves.length);
        
        await database.insert(gamePhaseAnalysis).values({
          gameId: analysis.gameId,
          userId: analysis.userId,
          openingEnd: analysis.phases.find(p => p.phase === 'opening')?.endMove || 12,
          middlegameEnd: analysis.phases.find(p => p.phase === 'middlegame')?.endMove || 30,
          [`${phase.phase}Accuracy`]: phaseAccuracy.toString(),
          [`${phase.phase}Blunders`]: phaseMoves.filter(m => m.classification === 'blunder').length,
          phaseDominance: analysis.phases.reduce((best, p) => {
            const pMoves = analysis.moves.filter(m => m.phase === p.phase);
            const pAcc = pMoves.reduce((sum, m) => sum + m.accuracy, 0) / Math.max(1, pMoves.length);
            return pAcc > (analysis.moves.filter(m => m.phase === best.phase).reduce((sum, m) => sum + m.accuracy, 0) / 
              Math.max(1, analysis.moves.filter(m => m.phase === best.phase).length)) ? p : best;
          }).phase
        });
      }
      
      console.log(`[ProgressAnalytics] Saved analysis for game ${analysis.gameId}`);
    } catch (error) {
      console.error('[ProgressAnalytics] Error saving analysis:', error);
    }
  }

  /**
   * Update user skill analytics based on game analysis
   */
  private async updateUserSkillAnalytics(userId: number, analysis: CompleteGameAnalysis): Promise<void> {
    try {
      // Get or create user skill analytics
      const existing = await database.select()
        .from(userSkillAnalytics)
        .where(eq(userSkillAnalytics.userId, userId))
        .limit(1);

      const phaseAccuracies = {
        opening: analysis.moves.filter(m => m.phase === 'opening').reduce((sum, m) => sum + m.accuracy, 0) / 
          Math.max(1, analysis.moves.filter(m => m.phase === 'opening').length),
        middlegame: analysis.moves.filter(m => m.phase === 'middlegame').reduce((sum, m) => sum + m.accuracy, 0) / 
          Math.max(1, analysis.moves.filter(m => m.phase === 'middlegame').length),
        endgame: analysis.moves.filter(m => m.phase === 'endgame').reduce((sum, m) => sum + m.accuracy, 0) / 
          Math.max(1, analysis.moves.filter(m => m.phase === 'endgame').length)
      };

      if (existing.length === 0) {
        // Create new analytics record
        await database.insert(userSkillAnalytics).values({
          userId,
          openingStrength: Math.round(1200 + (phaseAccuracies.opening - 75) * 10),
          middlegameStrength: Math.round(1200 + (phaseAccuracies.middlegame - 75) * 10),
          endgameStrength: Math.round(1200 + (phaseAccuracies.endgame - 75) * 10),
          tacticalRating: Math.round(1200 + (analysis.skillMetrics.tactical - 75) * 10),
          positionalRating: Math.round(1200 + (analysis.skillMetrics.positional - 75) * 10),
          averageAccuracy: (analysis.overallAccuracy / 100).toString(),
          blunderFrequency: (analysis.moves.filter(m => m.classification === 'blunder').length / analysis.moves.length).toString(),
          gamesAnalyzed: 1
        });
      } else {
        // Update existing analytics (weighted average)
        const current = existing[0];
        const weight = 0.1; // 10% weight for new game
        
        await database.update(userSkillAnalytics)
          .set({
            openingStrength: Math.round(current.openingStrength * (1 - weight) + 
              (1200 + (phaseAccuracies.opening - 75) * 10) * weight),
            middlegameStrength: Math.round(current.middlegameStrength * (1 - weight) + 
              (1200 + (phaseAccuracies.middlegame - 75) * 10) * weight),
            endgameStrength: Math.round(current.endgameStrength * (1 - weight) + 
              (1200 + (phaseAccuracies.endgame - 75) * 10) * weight),
            tacticalRating: Math.round(current.tacticalRating * (1 - weight) + 
              (1200 + (analysis.skillMetrics.tactical - 75) * 10) * weight),
            positionalRating: Math.round(current.positionalRating * (1 - weight) + 
              (1200 + (analysis.skillMetrics.positional - 75) * 10) * weight),
            averageAccuracy: ((parseFloat(current.averageAccuracy) * (1 - weight) + 
              (analysis.overallAccuracy / 100) * weight)).toString(),
            blunderFrequency: ((parseFloat(current.blunderFrequency) * (1 - weight) + 
              (analysis.moves.filter(m => m.classification === 'blunder').length / analysis.moves.length) * weight)).toString(),
            gamesAnalyzed: current.gamesAnalyzed + 1,
            lastUpdated: new Date()
          })
          .where(eq(userSkillAnalytics.userId, userId));
      }
      
      console.log(`[ProgressAnalytics] Updated skill analytics for user ${userId}`);
    } catch (error) {
      console.error('[ProgressAnalytics] Error updating skill analytics:', error);
    }
  }

  /**
   * Update opening performance tracking
   */
  private async updateOpeningPerformance(userId: number, gameData: any, analysis: CompleteGameAnalysis): Promise<void> {
    try {
      const existing = await database.select()
        .from(openingPerformance)
        .where(and(
          eq(openingPerformance.userId, userId),
          eq(openingPerformance.openingEco, gameData.openingEco),
          eq(openingPerformance.colorPlayed, gameData.playerColor)
        ))
        .limit(1);

      const isWin = gameData.result === 'win';
      const isLoss = gameData.result === 'loss';
      const isDraw = gameData.result === 'draw';

      if (existing.length === 0) {
        // Create new opening performance record
        await database.insert(openingPerformance).values({
          userId,
          openingEco: gameData.openingEco,
          openingName: gameData.openingName || 'Unknown Opening',
          colorPlayed: gameData.playerColor,
          gamesPlayed: 1,
          wins: isWin ? 1 : 0,
          losses: isLoss ? 1 : 0,
          draws: isDraw ? 1 : 0,
          winRate: isWin ? '1.00' : isDraw ? '0.50' : '0.00',
          averageAccuracy: (analysis.openingPerformance.accuracy / 100).toString(),
          lastPlayed: new Date()
        });
      } else {
        // Update existing opening performance
        const current = existing[0];
        const newGamesPlayed = current.gamesPlayed + 1;
        const newWins = current.wins + (isWin ? 1 : 0);
        const newLosses = current.losses + (isLoss ? 1 : 0);
        const newDraws = current.draws + (isDraw ? 1 : 0);
        const newWinRate = (newWins + newDraws * 0.5) / newGamesPlayed;
        const newAvgAccuracy = (parseFloat(current.averageAccuracy) * current.gamesPlayed + 
          analysis.openingPerformance.accuracy / 100) / newGamesPlayed;

        await database.update(openingPerformance)
          .set({
            gamesPlayed: newGamesPlayed,
            wins: newWins,
            losses: newLosses,
            draws: newDraws,
            winRate: newWinRate.toString(),
            averageAccuracy: newAvgAccuracy.toString(),
            lastPlayed: new Date(),
            updatedAt: new Date()
          })
          .where(eq(openingPerformance.id, current.id));
      }
      
      console.log(`[ProgressAnalytics] Updated opening performance for ${gameData.openingEco}`);
    } catch (error) {
      console.error('[ProgressAnalytics] Error updating opening performance:', error);
    }
  }

  /**
   * Check and update user achievements
   */
  private async checkAchievements(userId: number, analysis: CompleteGameAnalysis): Promise<void> {
    try {
      // This is a placeholder - would implement comprehensive achievement checking
      // Examples: First win, 10 games played, no blunders in game, etc.
      console.log(`[ProgressAnalytics] Checking achievements for user ${userId} - placeholder`);
    } catch (error) {
      console.error('[ProgressAnalytics] Error checking achievements:', error);
    }
  }
}

// Export singleton instance
export const progressAnalytics = new ProgressAnalyticsService();