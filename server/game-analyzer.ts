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
    // OpenAI analysis suspended - using local engine only
    console.log('OpenAI analysis suspended - using local engine only');
    return null;
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