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
        completionParams.max_completion_tokens = 150;
        // GPT-5 only supports default temperature (1.0)
      } else {
        completionParams.max_tokens = 150;
        completionParams.temperature = this.getTemperature();
      }

      const response = await this.openai.chat.completions.create(completionParams);

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

  // Educational hint generation for learning
  public async getEducationalHint(fen: string, moveHistory: string[] = []): Promise<{
    hint: string;
    move: { from: string; to: string; promotion?: string | null };
    explanation: string;
    learningTips: string[];
  } | null> {
    try {
      const isAvailable = await this.checkOpenAIAvailability();
      if (!isAvailable) return null;

      const chess = new Chess(fen);
      const possibleMoves = chess.moves({ verbose: true });
      
      if (possibleMoves.length === 0) return null;

      const gameHistoryStr = moveHistory.slice(-6).join(' ');
      const prompt = this.constructEducationalPrompt(fen, possibleMoves, gameHistoryStr, this.difficulty);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: "system",
            content: "You are a friendly chess teacher helping kids learn chess. Be encouraging, educational, and explain concepts simply."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
        temperature: 0.7
      });

      const content = response.choices[0].message.content;
      if (!content) return null;

      const result = JSON.parse(content);
      const bestMove = this.parseAIResponse(result.move, possibleMoves);
      
      if (!bestMove) return null;

      return {
        hint: result.hint || "Try this move to improve your position!",
        move: {
          from: bestMove.from,
          to: bestMove.to,
          promotion: bestMove.promotion || null
        },
        explanation: result.explanation || "This move follows good chess principles.",
        learningTips: result.learningTips || ["Develop your pieces!", "Control the center!", "Keep your king safe!"]
      };
    } catch (error) {
      console.error('Educational hint error:', error);
      return null;
    }
  }

  // Move analysis for blunder detection and learning
  public async analyzeMoveForLearning(fen: string, moveToAnalyze: string, previousFen?: string, userElo: number = 1200): Promise<{
    isBlunder: boolean;
    isGoodMove: boolean;
    feedback: string;
    betterMoves?: string[];
    explanation: string;
    learningPoints: string[];
  }> {
    try {
      const isAvailable = await this.checkOpenAIAvailability();
      if (!isAvailable) {
        return {
          isBlunder: false,
          isGoodMove: true,
          feedback: "Nice move! Keep playing and learning!",
          explanation: "Analysis unavailable, but keep practicing!",
          learningPoints: ["Every move is a learning opportunity!"]
        };
      }

      const prompt = this.constructMoveAnalysisPrompt(fen, moveToAnalyze, previousFen, userElo);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: "system", 
            content: "You are a patient chess teacher analyzing moves for kids. Be encouraging even when pointing out mistakes."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 400,
        temperature: 0.6
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No response content');

      const result = JSON.parse(content);
      
      return {
        isBlunder: result.isBlunder || false,
        isGoodMove: result.isGoodMove || true,
        feedback: result.feedback || "Nice try! Every move teaches us something.",
        betterMoves: result.betterMoves || [],
        explanation: result.explanation || "Chess is about learning from every move!",
        learningPoints: result.learningPoints || ["Practice makes perfect!", "Think about piece safety!", "Look for tactics!"]
      };
    } catch (error) {
      console.error('Move analysis error:', error);
      return {
        isBlunder: false,
        isGoodMove: true,
        feedback: "Keep playing and learning! Every move is progress.",
        explanation: "Analysis unavailable, but you're doing great!",
        learningPoints: ["Stay positive and keep learning!"]
      };
    }
  }

  // Interactive chess conversation
  public async getChessConversationResponse(fen: string, question: string = "", context: string = "", userElo: number = 1200): Promise<{
    answer: string;
    suggestedMoves: string[];
    learningPoints: string[];
    followUpQuestions: string[];
  }> {
    try {
      const isAvailable = await this.checkOpenAIAvailability();
      if (!isAvailable) {
        return {
          answer: "I'd love to help, but I can't analyze the position right now. Keep practicing!",
          suggestedMoves: [],
          learningPoints: ["Practice makes perfect!"],
          followUpQuestions: ["What's your favorite piece?", "Do you like attacking or defending?"]
        };
      }

      const prompt = this.constructConversationPrompt(fen, question, context, userElo);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: "system",
            content: "You are a friendly chess coach talking to kids. Be encouraging, fun, and educational. Use simple language and chess concepts appropriate for children."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
        temperature: 0.8
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No response content');

      const result = JSON.parse(content);
      
      return {
        answer: result.answer || "That's a great question! Keep thinking about chess positions.",
        suggestedMoves: result.suggestedMoves || [],
        learningPoints: result.learningPoints || ["Chess is fun to learn!"],
        followUpQuestions: result.followUpQuestions || ["What would you like to know next?"]
      };
    } catch (error) {
      console.error('Chess conversation error:', error);
      return {
        answer: "I'm having trouble thinking right now, but I love talking about chess with you! Keep asking questions.",
        suggestedMoves: [],
        learningPoints: ["Questions help us learn!"],
        followUpQuestions: ["What's your favorite chess piece?"]
      };
    }
  }

  private constructEducationalPrompt(fen: string, possibleMoves: any[], gameHistory: string, difficulty: Difficulty): string {
    const chess = new Chess(fen);
    const moveList = possibleMoves.map(move => move.san).join(', ');
    const turn = chess.turn() === 'w' ? 'white' : 'black';
    
    return `You are teaching chess to kids. Current position (FEN): ${fen}

It's ${turn}'s turn to move.
Recent moves: ${gameHistory || 'Game just started'}
Legal moves: ${moveList}

Difficulty level: ${difficulty}

Please suggest the best educational move for a ${difficulty} level student and explain it in a kid-friendly way.

Respond with JSON containing:
{
  "move": "best_move_in_algebraic_notation", 
  "hint": "encouraging hint for kids explaining why this move is good",
  "explanation": "simple explanation of what this move accomplishes",
  "learningTips": ["tip1", "tip2", "tip3"] // general chess tips for kids
}

Make it fun and educational! Use simple language and be encouraging.`;
  }

  private constructMoveAnalysisPrompt(fen: string, moveToAnalyze: string, previousFen?: string, userElo: number = 1200): string {
    const chess = new Chess(fen);
    const turn = chess.turn() === 'w' ? 'white' : 'black';
    
    return `Analyze this chess move for a student with ELO ${userElo}:

Current position: ${fen}
Move played: ${moveToAnalyze}
Previous position: ${previousFen || 'Not provided'}
Player: ${turn}

Please analyze if this is a good move, blunder, or somewhere in between. Consider the student's level and be educational but encouraging.

Respond with JSON:
{
  "isBlunder": boolean, // true if major mistake
  "isGoodMove": boolean, // true if solid/good move  
  "feedback": "encouraging feedback for the player",
  "betterMoves": ["alternative1", "alternative2"], // if move was poor
  "explanation": "why this move works or doesn't work",
  "learningPoints": ["lesson1", "lesson2", "lesson3"] // what to learn from this
}

Be supportive and educational for kids!`;
  }

  private constructConversationPrompt(fen: string, question: string, context: string, userElo: number): string {
    const chess = new Chess(fen);
    const turn = chess.turn() === 'w' ? 'white' : 'black';
    const possibleMoves = chess.moves();
    
    return `You're chatting with a young chess student (ELO ~${userElo}) about this position:

Position: ${fen}
Turn: ${turn}
Context: ${context}
Student's question: "${question}"

Available moves: ${possibleMoves.slice(0, 10).join(', ')}${possibleMoves.length > 10 ? '...' : ''}

Have a friendly conversation about chess! Answer their question and provide helpful insights about the position.

Respond with JSON:
{
  "answer": "friendly conversational response to their question",
  "suggestedMoves": ["move1", "move2"], // moves you recommend they consider
  "learningPoints": ["lesson1", "lesson2"], // what they can learn here  
  "followUpQuestions": ["question1", "question2"] // questions to keep conversation going
}

Keep it fun, educational, and appropriate for kids!`;
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