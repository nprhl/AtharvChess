import axios from 'axios';
import { Chess } from 'chess.js';

export interface MoveEvaluation {
  message: string;
  moveType: 'brilliant' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  explanation: string;
  tactical: string[];
  strategic: string[];
  rating: number; // 1-10 scale
}

export class MoveEvaluator {
  private ollamaUrl: string;
  private modelName: string;

  constructor(ollamaUrl: string = 'http://localhost:11434') {
    this.ollamaUrl = ollamaUrl;
    this.modelName = 'llama3.1:8b'; // Good balance of speed and analysis quality
  }

  public async evaluateMove(
    moveSan: string, 
    fenBefore: string, 
    fenAfter: string, 
    gameHistory: string,
    userElo: number = 1200
  ): Promise<MoveEvaluation> {
    try {
      const isOllamaAvailable = await this.checkOllamaAvailability();
      
      if (!isOllamaAvailable) {
        return this.fallbackEvaluation(moveSan, fenBefore, fenAfter);
      }

      const chessAnalysis = this.analyzePosition(fenBefore, fenAfter, moveSan);
      const prompt = this.constructEvaluationPrompt(
        moveSan, 
        fenBefore, 
        fenAfter, 
        gameHistory, 
        chessAnalysis,
        userElo
      );

      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7, // More conversational
          top_p: 0.9
        }
      }, { timeout: 15000 });

      return this.parseEvaluationResponse(response.data.response, chessAnalysis);
    } catch (error) {
      console.error('Move evaluation error:', error);
      return this.fallbackEvaluation(moveSan, fenBefore, fenAfter);
    }
  }

  private async checkOllamaAvailability(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 2000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private analyzePosition(fenBefore: string, fenAfter: string, moveSan: string): any {
    const chessBefore = new Chess(fenBefore);
    const chessAfter = new Chess(fenAfter);
    
    // Basic position analysis
    const analysis = {
      moveSan,
      isCapture: moveSan.includes('x'),
      isCheck: moveSan.includes('+') || moveSan.includes('#'),
      isCheckmate: moveSan.includes('#'),
      isCastling: moveSan.includes('O-O'),
      isPromotion: moveSan.includes('='),
      
      // Material change
      materialBefore: this.calculateMaterial(chessBefore),
      materialAfter: this.calculateMaterial(chessAfter),
      
      // Mobility change  
      mobilityBefore: chessBefore.moves().length,
      mobilityAfter: chessAfter.moves().length,
      
      // Center control
      centerControlBefore: this.evaluateCenterControl(chessBefore),
      centerControlAfter: this.evaluateCenterControl(chessAfter),
      
      // King safety
      kingSafetyBefore: this.evaluateKingSafety(chessBefore),
      kingSafetyAfter: this.evaluateKingSafety(chessAfter),

      // Opening detection
      isOpeningMove: this.detectOpeningMove(moveSan, chessBefore.history().length),
      
      // Piece development
      developmentMove: this.isDevelpmentMove(moveSan, chessBefore)
    };

    return analysis;
  }

  private calculateMaterial(chess: Chess): number {
    const board = chess.board();
    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let material = 0;
    
    board.forEach(row => {
      row.forEach(piece => {
        if (piece && piece.color === 'w') {
          material += pieceValues[piece.type as keyof typeof pieceValues];
        }
      });
    });
    
    return material;
  }

  private evaluateCenterControl(chess: Chess): number {
    const centerSquares = ['d4', 'd5', 'e4', 'e5'];
    let control = 0;
    
    centerSquares.forEach(square => {
      const piece = chess.get(square as any);
      if (piece && piece.color === 'w') {
        control += piece.type === 'p' ? 2 : 1;
      }
    });
    
    return control;
  }

  private evaluateKingSafety(chess: Chess): number {
    if (chess.inCheck()) return -2;
    
    // Simple king safety: prefer castled positions
    const king = chess.board().flat().find(p => p && p.type === 'k' && p.color === 'w');
    if (!king) return 0;
    
    // Check if king is castled (rough estimate)
    return chess.getCastlingRights('w').k || chess.getCastlingRights('w').q ? 1 : 0;
  }

  private detectOpeningMove(moveSan: string, moveNumber: number): string | null {
    if (moveNumber > 10) return null;
    
    // Common opening detection
    const openings = {
      'e4': 'King\'s Pawn Opening',
      'd4': 'Queen\'s Pawn Opening', 
      'Nf3': 'Réti Opening',
      'c4': 'English Opening',
      'f4': 'King\'s Gambit',
      'Nc3': 'Van\'t Kruijs Opening',
      'b3': 'Nimzowitsch-Larsen Attack'
    };

    return openings[moveSan as keyof typeof openings] || null;
  }

  private isDevelpmentMove(moveSan: string, chess: Chess): boolean {
    // Check if moving a piece from back rank
    return (moveSan.startsWith('N') || moveSan.startsWith('B')) && 
           chess.history().length < 10;
  }

  private constructEvaluationPrompt(
    moveSan: string, 
    fenBefore: string, 
    fenAfter: string, 
    gameHistory: string,
    analysis: any,
    userElo: number
  ): string {
    const eloLevel = userElo < 1000 ? 'beginner' : userElo < 1500 ? 'intermediate' : 'advanced';
    
    return `You are a friendly chess coach analyzing a move. Be conversational and encouraging.

Player's move: ${moveSan}
Player's ELO: ${userElo} (${eloLevel} level)
Game history: ${gameHistory || 'Opening'}

Position analysis:
- ${analysis.isCapture ? 'This is a capture' : 'No capture'}
- ${analysis.isCheck ? 'Gives check' : 'No check'}
- ${analysis.isCastling ? 'Castling move' : 'Regular move'}
- ${analysis.isOpeningMove ? `Part of ${analysis.isOpeningMove}` : 'Middle/endgame move'}
- Material change: ${analysis.materialAfter - analysis.materialBefore}
- Mobility change: ${analysis.mobilityAfter - analysis.mobilityBefore} moves
- Center control change: ${analysis.centerControlAfter - analysis.centerControlBefore}

Respond in JSON format:
{
  "message": "Conversational 1-2 sentence reaction to the move",
  "moveType": "brilliant|excellent|good|inaccuracy|mistake|blunder", 
  "explanation": "Why this move is good/bad in simple terms",
  "tactical": ["list", "of", "tactical", "themes"],
  "strategic": ["list", "of", "strategic", "concepts"],
  "rating": 1-10
}

Examples of good responses:
- "Nice development! You're following solid opening principles."
- "Interesting gambit! You're sacrificing material for quick development."
- "Oops, that move hangs your queen. Always check for hanging pieces!"
- "Excellent tactical shot! That fork wins material."

Keep it ${eloLevel === 'beginner' ? 'simple and encouraging' : eloLevel === 'intermediate' ? 'tactical and educational' : 'deep and analytical'}.`;
  }

  private parseEvaluationResponse(response: string, analysis: any): MoveEvaluation {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          message: parsed.message || "Interesting move!",
          moveType: parsed.moveType || 'good',
          explanation: parsed.explanation || "Keep playing!",
          tactical: parsed.tactical || [],
          strategic: parsed.strategic || [],
          rating: parsed.rating || 5
        };
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
    }

    // Fallback parsing
    return this.fallbackEvaluation(analysis.moveSan, '', '');
  }

  private fallbackEvaluation(moveSan: string, fenBefore: string, fenAfter: string): MoveEvaluation {
    // Simple rule-based evaluation
    let message = "Keep it up!";
    let moveType: MoveEvaluation['moveType'] = 'good';
    let rating = 6;

    if (moveSan.includes('x')) {
      message = "Good capture! You're winning material.";
      moveType = 'good';
      rating = 7;
    }
    
    if (moveSan.includes('+')) {
      message = "Nice check! Putting pressure on the opponent.";
      moveType = 'good';  
      rating = 7;
    }

    if (moveSan.includes('#')) {
      message = "Checkmate! Brilliant finish!";
      moveType = 'brilliant';
      rating = 10;
    }

    if (moveSan.includes('O-O')) {
      message = "Smart castling! Keeping your king safe.";
      moveType = 'good';
      rating = 7;
    }

    return {
      message,
      moveType,
      explanation: "Traditional chess analysis suggests this is a reasonable move.",
      tactical: moveSan.includes('x') ? ['Capture'] : [],
      strategic: moveSan.includes('O-O') ? ['King Safety'] : ['Development'],
      rating
    };
  }
}