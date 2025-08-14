import OpenAI from 'openai';
import { Chess } from 'chess.js';

interface GameMove {
  move: string;
  fen: string;
  player: 'human' | 'ai';
  moveNumber: number;
}

interface GameAnalysisReport {
  gameId: number;
  userId: number;
  overallPerformance: string;
  keyLearningPoints: string[];
  bestMoves: Array<{ move: string; reason: string }>;
  mistakesMade: Array<{ move: string; better: string; explanation: string }>;
  openingAssessment: string;
  middlegameAssessment: string;
  endgameAssessment: string;
  encouragement: string;
  nextStepsForImprovement: string[];
}

export class GameAnalyzer {
  private openai: OpenAI;
  private gameMovesBuffer = new Map<string, GameMove[]>(); // Store moves by gameId

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Collect moves during the game without analysis
  public recordMove(gameId: string, fen: string, move: string, player: 'human' | 'ai'): void {
    if (!this.gameMovesBuffer.has(gameId)) {
      this.gameMovesBuffer.set(gameId, []);
    }
    
    const moves = this.gameMovesBuffer.get(gameId)!;
    moves.push({
      move,
      fen,
      player,
      moveNumber: Math.floor(moves.length / 2) + 1
    });
  }

  // Analyze complete game at the end for educational feedback
  public async analyzeCompleteGame(gameId: string, userId: number, result: string): Promise<GameAnalysisReport | null> {
    if (!process.env.OPENAI_API_KEY) {
      console.log('OpenAI not available for game analysis');
      return null;
    }

    const moves = this.gameMovesBuffer.get(gameId);
    if (!moves || moves.length === 0) {
      console.log('No moves recorded for game analysis');
      return null;
    }

    try {
      const gameHistory = moves.map(m => `${m.moveNumber}. ${m.move} (${m.player})`).join(' ');
      const playerMoves = moves.filter(m => m.player === 'human').map(m => m.move);
      
      const prompt = `Analyze this complete chess game played by a young learner:

Game Result: ${result}
Total Moves: ${moves.length}
Player Moves: ${playerMoves.join(', ')}
Full Game: ${gameHistory}

Provide a comprehensive educational analysis as JSON with:
- overallPerformance: Encouraging assessment of their overall play
- keyLearningPoints: Array of 3-4 key lessons they can learn from this game
- bestMoves: Array of 2-3 best moves they made with reasons
- mistakesMade: Array of 1-2 main mistakes with better alternatives and explanations
- openingAssessment: Brief assessment of opening play
- middlegameAssessment: Brief assessment of middlegame play  
- endgameAssessment: Brief assessment of endgame play (if applicable)
- encouragement: Positive, motivating message for young chess player
- nextStepsForImprovement: Array of 2-3 specific things to practice next

Focus on being educational, encouraging, and age-appropriate for young minds learning chess.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: 'system',
            content: 'You are a patient, encouraging chess coach working with young learners. Provide constructive, positive feedback that builds confidence while teaching important concepts. Return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 600
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      // Clean up the moves buffer for this game
      this.gameMovesBuffer.delete(gameId);
      
      console.log(`Game analysis completed for user ${userId}, game ${gameId}`);
      
      return {
        gameId: parseInt(gameId),
        userId,
        overallPerformance: analysis.overallPerformance || 'Good effort in this game!',
        keyLearningPoints: analysis.keyLearningPoints || [],
        bestMoves: analysis.bestMoves || [],
        mistakesMade: analysis.mistakesMade || [],
        openingAssessment: analysis.openingAssessment || 'Opening play was solid',
        middlegameAssessment: analysis.middlegameAssessment || 'Middlegame showed good thinking',
        endgameAssessment: analysis.endgameAssessment || 'Endgame technique developing',
        encouragement: analysis.encouragement || 'Keep practicing and you\'ll continue to improve!',
        nextStepsForImprovement: analysis.nextStepsForImprovement || []
      };
    } catch (error) {
      console.log('Game analysis error:', error);
      this.gameMovesBuffer.delete(gameId);
      return null;
    }
  }

  // Clear game buffer if game is abandoned
  public clearGameBuffer(gameId: string): void {
    this.gameMovesBuffer.delete(gameId);
  }

  // Get game analysis stats
  public getBufferedGamesCount(): number {
    return this.gameMovesBuffer.size;
  }
}

export const gameAnalyzer = new GameAnalyzer();