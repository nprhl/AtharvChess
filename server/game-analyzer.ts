import OpenAI from 'openai';
import { Chess } from 'chess.js';

interface GameAnalysis {
  position: string;
  playerMove?: string;
  aiMove?: string;
  phase: 'opening' | 'middlegame' | 'endgame';
  feedback: string;
  suggestions: string[];
  blunderDetected: boolean;
  goodMove: boolean;
}

export class GameAnalyzer {
  private openai: OpenAI;
  private analysisQueue: Array<{ fen: string; lastMove: string; player: 'human' | 'ai' }> = [];
  private processing = false;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Queue analysis without blocking game moves
  public queueAnalysis(fen: string, lastMove: string, player: 'human' | 'ai'): void {
    this.analysisQueue.push({ fen, lastMove, player });
    
    // Process queue asynchronously without blocking
    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.analysisQueue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const analysis = this.analysisQueue.shift();
    if (!analysis) return;

    try {
      await this.analyzePosition(analysis.fen, analysis.lastMove, analysis.player);
    } catch (error) {
      console.log('Background analysis failed:', error);
    }

    // Continue processing queue
    setTimeout(() => this.processQueue(), 100);
  }

  private async analyzePosition(fen: string, lastMove: string, player: 'human' | 'ai'): Promise<GameAnalysis | null> {
    if (!process.env.OPENAI_API_KEY) {
      return null;
    }

    try {
      const chess = new Chess(fen);
      const gamePhase = this.determineGamePhase(chess);
      
      const prompt = `Analyze this chess position after ${player === 'human' ? 'player' : 'computer'} played ${lastMove}:

Position (FEN): ${fen}
Last move: ${lastMove}
Game phase: ${gamePhase}
Player: ${player}

Provide analysis as JSON with:
- feedback: Brief assessment of the move quality
- suggestions: Array of 1-2 improvement suggestions for the player
- blunderDetected: boolean if this was a serious mistake
- goodMove: boolean if this was a strong move
- phase: opening/middlegame/endgame

Focus on educational value for chess learning.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a chess coach providing educational feedback. Return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 200
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      // Store analysis for later retrieval (could use database)
      console.log(`Background analysis complete: ${lastMove} - ${analysis.feedback}`);
      
      return {
        position: fen,
        playerMove: player === 'human' ? lastMove : undefined,
        aiMove: player === 'ai' ? lastMove : undefined,
        phase: analysis.phase || gamePhase,
        feedback: analysis.feedback || '',
        suggestions: analysis.suggestions || [],
        blunderDetected: analysis.blunderDetected || false,
        goodMove: analysis.goodMove || false
      };
    } catch (error) {
      console.log('OpenAI analysis error:', error);
      return null;
    }
  }

  private determineGamePhase(chess: Chess): 'opening' | 'middlegame' | 'endgame' {
    const history = chess.history();
    const pieces = chess.board().flat().filter(p => p !== null);
    
    if (history.length < 20) return 'opening';
    if (pieces.length < 12) return 'endgame';
    return 'middlegame';
  }

  // Get recent analysis for a position (for UI display)
  public async getPositionFeedback(fen: string): Promise<string | null> {
    // In a real implementation, this would query stored analysis
    // For now, return null since analysis is background-only
    return null;
  }
}

export const gameAnalyzer = new GameAnalyzer();