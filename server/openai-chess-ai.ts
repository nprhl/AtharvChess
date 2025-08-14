import OpenAI from 'openai';
import { Chess, Move } from 'chess.js';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export class OpenAIChessAI {
  private difficulty: Difficulty;
  private openai: OpenAI;

  constructor(difficulty: Difficulty = 'beginner') {
    this.difficulty = difficulty;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  public async getBestMove(fen: string): Promise<Move | null> {
    const chess = new Chess(fen);
    const possibleMoves = chess.moves({ verbose: true });
    
    if (possibleMoves.length === 0) {
      return null;
    }

    // For single moves or checkmate, return immediately
    if (possibleMoves.length === 1) {
      return possibleMoves[0];
    }

    try {
      // Check if OpenAI is available
      const isAvailable = await this.checkOpenAIAvailability();
      if (!isAvailable) {
        console.log('OpenAI not available: API key missing');
        return null;
      }

      console.log(`OpenAI: Getting ${this.difficulty} move for ${possibleMoves.length} options`);
      const aiMove = await this.getAIMove(fen, possibleMoves);
      return aiMove;
    } catch (error) {
      console.error('Error getting OpenAI move:', (error as Error).message || error);
      return null;
    }
  }

  private async checkOpenAIAvailability(): Promise<boolean> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  private async getBestAvailableModel(): Promise<string> {
    try {
      // For now, let's use gpt-4o which we know works reliably
      // GPT-5 may have response format issues with chess
      return 'gpt-4o';
    } catch (error) {
      console.log('Could not fetch models, using gpt-4o fallback');
      return 'gpt-4o';
    }
  }

  private async getAIMove(fen: string, possibleMoves: Move[]): Promise<Move | null> {
    const chess = new Chess(fen);
    const gameHistory = this.getGameHistory(chess);
    const moveList = possibleMoves.map(move => move.san).join(', ');

    const prompt = this.constructPrompt(fen, moveList, gameHistory, this.difficulty);
    
    // Add timeout for faster response
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI move timeout')), 8000); // 8 second timeout
    });
    
    console.log('OpenAI prompt being sent:', prompt.substring(0, 300) + '...');

    try {
      // Check if GPT-5 is available, fallback to gpt-4o
      const model = await this.getBestAvailableModel();
      console.log(`OpenAI: Using model ${model}`);
      
      const completionParams: any = {
        model: model,
        messages: [
          {
            role: "system",
            content: "You are a chess grandmaster. Analyze the position and return the best move in JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      };

      // GPT-5 has different parameter support
      if (model.startsWith('gpt-5')) {
        completionParams.max_completion_tokens = 50; // Reduced for speed
        // GPT-5 only supports default temperature (1.0)
      } else {
        completionParams.max_tokens = 50; // Reduced for speed
        completionParams.temperature = this.getTemperature();
      }

      const response = await Promise.race([
        this.openai.chat.completions.create(completionParams),
        timeoutPromise
      ]);

      const content = response.choices[0].message.content;
      if (!content) {
        console.log('OpenAI: No content in response');
        return null;
      }

      console.log('OpenAI raw response:', content);
      
      try {
        const result = JSON.parse(content);
        console.log('OpenAI parsed result:', result);
        const move = this.parseAIResponse(result.move || result.best_move || result.recommended_move, possibleMoves);
        console.log('OpenAI final move:', move?.san || 'null');
        return move;
      } catch (parseError) {
        console.log('OpenAI JSON parse error:', parseError);
        console.log('Raw content that failed to parse:', content);
        return null;
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      return null;
    }
  }

  private constructPrompt(fen: string, moveList: string, gameHistory: string, difficulty: Difficulty): string {
    const basePrompt = `You are a chess engine playing as ${new Chess(fen).turn() === 'w' ? 'white' : 'black'}.

Current position (FEN): ${fen}
Game history: ${gameHistory}
Legal moves: ${moveList}

`;

    switch (difficulty) {
      case 'beginner':
        return basePrompt + `Play at a beginner level (1000-1200 ELO). Focus on:
- Basic piece development
- Simple tactics (forks, pins, skewers)  
- King safety
- Avoid obvious blunders
- Occasionally make sub-optimal moves for learning purposes

Respond with JSON: {"move": "your_move", "reasoning": "brief explanation"}
Choose ONE move from the legal moves list above. Use standard algebraic notation (e.g., "Nf3" or "exd5").`;

      case 'intermediate':
        return basePrompt + `Play at an intermediate level (1400-1600 ELO). Consider:
- Tactical patterns (forks, pins, skewers, discovered attacks)
- Piece activity and coordination
- Basic positional concepts
- King safety and pawn structure
- Simple endgame principles

Respond with JSON: {"move": "your_move", "reasoning": "brief explanation"}
Choose the BEST move from the legal moves list above.`;

      case 'advanced':
        return basePrompt + `Play at an advanced level (1800+ ELO) with strong strategic and tactical understanding. Consider:
- Complex tactical patterns and combinations
- Advanced positional concepts (weak squares, pawn storms, piece coordination)
- Strategic planning and long-term advantages
- Endgame technique and evaluation
- Opening principles and theory
- Calculate multiple moves ahead

Respond with JSON: {"move": "your_move", "reasoning": "brief explanation"}
Analyze the position deeply and choose the STRONGEST move from the legal moves list above.`;

      default:
        return basePrompt + `Choose a good move. Respond with JSON: {"move": "your_move", "reasoning": "brief explanation"}`;
    }
  }

  private getTemperature(): number {
    switch (this.difficulty) {
      case 'beginner': return 0.7; // Higher randomness
      case 'intermediate': return 0.3; // Moderate randomness
      case 'advanced': return 0.1; // Very low randomness for consistency
      default: return 0.3;
    }
  }

  private getGameHistory(chess: Chess): string {
    const history = chess.history();
    if (history.length === 0) return "Game start";
    
    // Format as move pairs
    let formatted = "";
    for (let i = 0; i < history.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const white = history[i];
      const black = history[i + 1] || "";
      formatted += `${moveNum}. ${white} ${black} `;
    }
    return formatted.trim();
  }

  private parseAIResponse(response: string, possibleMoves: Move[]): Move | null {
    if (!response) return null;
    
    // Clean up the response
    const cleanResponse = response.trim().replace(/[^a-zA-Z0-9+#=\-]/g, '');
    
    // Try to find a matching move
    for (const move of possibleMoves) {
      if (move.san === cleanResponse || move.lan === cleanResponse) {
        return move;
      }
    }

    // Try partial matching for common variations
    for (const move of possibleMoves) {
      if (cleanResponse.includes(move.san) || move.san.includes(cleanResponse)) {
        return move;
      }
    }

    console.log(`Could not parse OpenAI response: "${response}" -> "${cleanResponse}"`);
    return null;
  }
}