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
      // Try to get available models
      const models = await this.openai.models.list();
      const modelIds = models.data.map(m => m.id);
      
      // Priority order: GPT-5 variants, then GPT-4o variants
      const preferredModels = [
        'gpt-5',
        'gpt-5-turbo', 
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4'
      ];
      
      for (const model of preferredModels) {
        if (modelIds.includes(model)) {
          return model;
        }
      }
      
      // Fallback to gpt-4o (should always be available)
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
        completionParams.max_completion_tokens = 150;
        // GPT-5 only supports default temperature (1.0)
      } else {
        completionParams.max_tokens = 150;
        completionParams.temperature = this.getTemperature();
      }

      const response = await this.openai.chat.completions.create(completionParams);

      const content = response.choices[0].message.content;
      if (!content) return null;

      const result = JSON.parse(content);
      return this.parseAIResponse(result.move || result.best_move || result.recommended_move, possibleMoves);
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