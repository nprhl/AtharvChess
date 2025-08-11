import axios from 'axios';
import { Chess, Move } from 'chess.js';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export class OllamaChessAI {
  private difficulty: Difficulty;
  private ollamaUrl: string;
  private modelName: string;

  constructor(difficulty: Difficulty = 'beginner', ollamaUrl: string = 'http://localhost:11434') {
    this.difficulty = difficulty;
    this.ollamaUrl = ollamaUrl;
    // Use different models or prompting strategies based on difficulty
    this.modelName = this.getModelForDifficulty(difficulty);
  }

  private getModelForDifficulty(difficulty: Difficulty): string {
    switch (difficulty) {
      case 'beginner': return 'llama3.1:8b'; // Faster, less deep analysis
      case 'intermediate': return 'llama3.1:8b'; // Same model, different prompting
      case 'advanced': return 'llama3.1:70b'; // Larger model for stronger play
      default: return 'llama3.1:8b';
    }
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
      // Check if Ollama is available
      const isAvailable = await this.checkOllamaAvailability();
      if (!isAvailable) {
        console.log('Ollama not available, falling back to traditional engine');
        return this.fallbackMove(chess, possibleMoves);
      }

      const aiMove = await this.getAIMove(fen, possibleMoves);
      return aiMove || this.fallbackMove(chess, possibleMoves);
    } catch (error) {
      console.error('Error getting AI move:', error);
      return this.fallbackMove(chess, possibleMoves);
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

  private async getAIMove(fen: string, possibleMoves: Move[]): Promise<Move | null> {
    const chess = new Chess(fen);
    const gameHistory = this.getGameHistory(chess);
    const moveList = possibleMoves.map(move => move.san).join(', ');

    const prompt = this.constructPrompt(fen, moveList, gameHistory, this.difficulty);

    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt: prompt,
        stream: false,
        options: {
          temperature: this.getTemperature(),
          top_p: 0.9,
          top_k: 40
        }
      }, { timeout: 30000 });

      const aiResponse = response.data.response;
      return this.parseAIResponse(aiResponse, possibleMoves);
    } catch (error) {
      console.error('Ollama API error:', error);
      return null;
    }
  }

  private constructPrompt(fen: string, moveList: string, gameHistory: string, difficulty: Difficulty): string {
    const basePrompt = `You are a chess engine playing as the black pieces. 

Current position (FEN): ${fen}
Game history: ${gameHistory}
Legal moves: ${moveList}

`;

    switch (difficulty) {
      case 'beginner':
        return basePrompt + `Play at a beginner level. Consider basic tactics and piece safety, but occasionally make sub-optimal moves for learning purposes. Focus on:
- Basic piece development
- Simple tactics (forks, pins, skewers)
- King safety
- Avoid obvious blunders

Choose ONE move from the legal moves list above. Respond with ONLY the move in standard algebraic notation (e.g., "Nf3" or "exd5").`;

      case 'intermediate':
        return basePrompt + `Play at an intermediate level with good tactical awareness. Consider:
- Tactical patterns (forks, pins, skewers, discovered attacks)
- Piece activity and coordination
- Basic positional concepts
- King safety and pawn structure
- Simple endgame principles

Choose the BEST move from the legal moves list above. Respond with ONLY the move in standard algebraic notation (e.g., "Nf3" or "exd5").`;

      case 'advanced':
        return basePrompt + `Play at an advanced level with strong strategic and tactical understanding. Consider:
- Complex tactical patterns and combinations
- Advanced positional concepts (weak squares, pawn storms, piece coordination)
- Strategic planning and long-term advantages
- Endgame technique and evaluation
- Opening principles and theory
- Calculate multiple moves ahead

Analyze the position deeply and choose the STRONGEST move from the legal moves list above. Respond with ONLY the move in standard algebraic notation (e.g., "Nf3" or "exd5").`;

      default:
        return basePrompt + `Choose a good move. Respond with ONLY the move in standard algebraic notation.`;
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

    console.log(`Could not parse AI response: "${response}" -> "${cleanResponse}"`);
    return null;
  }

  private fallbackMove(chess: Chess, possibleMoves: Move[]): Move {
    // Simple fallback: prefer captures, then central moves
    const captures = possibleMoves.filter(move => move.captured);
    if (captures.length > 0) {
      return captures[Math.floor(Math.random() * captures.length)];
    }

    // Prefer moves to center squares
    const centerMoves = possibleMoves.filter(move => 
      ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5'].includes(move.to)
    );
    if (centerMoves.length > 0) {
      return centerMoves[Math.floor(Math.random() * centerMoves.length)];
    }

    // Random move as last resort
    return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
  }
}