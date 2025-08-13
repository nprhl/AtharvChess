import { storage } from "./storage";
import { tipService } from "./tip-service";

export class GameIntegrationService {
  // Generate contextual tips based on current game position
  async getContextualTip(userId: number, fen: string, gamePhase: 'opening' | 'middlegame' | 'endgame'): Promise<any> {
    // Get user's skill level
    const userSettings = await storage.getUserSettings(userId);
    const difficulty = userSettings?.difficulty || 'beginner';

    // Get tips relevant to current game phase
    const categoryTips = await storage.getTipsByCategory(gamePhase === 'middlegame' ? 'tactics' : gamePhase, difficulty);
    
    if (categoryTips.length > 0) {
      // Return a random relevant tip
      const randomTip = categoryTips[Math.floor(Math.random() * categoryTips.length)];
      return {
        ...randomTip,
        contextual: true,
        gamePhase,
        message: this.getContextualMessage(gamePhase)
      };
    }

    // Fallback to general strategy tip
    return {
      title: `${gamePhase} Strategy`,
      content: this.getGenericAdvice(gamePhase, difficulty),
      category: gamePhase,
      difficulty,
      estimatedReadTime: 20,
      contextual: true,
      gamePhase,
      message: this.getContextualMessage(gamePhase)
    };
  }

  // Track learning opportunities during gameplay
  async recordLearningMoment(userId: number, momentType: 'blunder' | 'missed_tactic' | 'good_move', fen: string, moveSan: string): Promise<void> {
    // This could trigger personalized tip generation based on the specific mistake
    console.log(`Learning moment recorded for user ${userId}: ${momentType} - ${moveSan} in position ${fen}`);
    
    // Increment user's experience for tip personalization
    const user = await storage.getUser(userId);
    if (user) {
      // Could update user stats or trigger lesson recommendations
      console.log(`User ${userId} had a ${momentType} learning moment`);
    }
  }

  // Suggest tips during game pauses or after moves
  async getSituationalAdvice(userId: number, situation: 'game_start' | 'after_blunder' | 'time_pressure' | 'winning_position' | 'losing_position'): Promise<any> {
    const userSettings = await storage.getUserSettings(userId);
    const difficulty = userSettings?.difficulty || 'beginner';

    const adviceMap: { [key: string]: any } = {
      'game_start': {
        title: "Game Start Focus",
        content: "Take a moment to review your opening plan. Control the center, develop pieces safely, and castle early for king safety.",
        category: "opening",
        estimatedReadTime: 15
      },
      'after_blunder': {
        title: "Recovery Mindset",
        content: "Everyone makes mistakes! Take a deep breath, reassess the position, and look for defensive resources. Often the best response to a blunder is calm, accurate play.",
        category: "psychology",
        estimatedReadTime: 20
      },
      'time_pressure': {
        title: "Time Management",
        content: "When time is running low, focus on key principles: improve your worst piece, create threats, and avoid unnecessary complications.",
        category: "strategy",
        estimatedReadTime: 15
      },
      'winning_position': {
        title: "Converting Advantages",
        content: "You're ahead! Simplify the position by trading pieces, activate your king in the endgame, and avoid giving your opponent counterplay.",
        category: "endgame",
        estimatedReadTime: 20
      },
      'losing_position': {
        title: "Defensive Resources",
        content: "Behind in material? Look for tactical shots, create complications, and force your opponent to find precise moves under pressure.",
        category: "tactics",
        estimatedReadTime: 18
      }
    };

    const advice = adviceMap[situation] || adviceMap['game_start'];
    
    return {
      ...advice,
      difficulty,
      situational: true,
      situation,
      tags: ['situational', 'game-context', situation.replace('_', '-')]
    };
  }

  private getContextualMessage(phase: string): string {
    const messages = {
      'opening': "Here's a tip for the opening phase of your game:",
      'middlegame': "Perfect timing for a tactical tip:",
      'endgame': "Essential endgame knowledge for this position:"
    };
    return messages[phase as keyof typeof messages] || "Here's a contextual chess tip:";
  }

  private getGenericAdvice(phase: string, difficulty: string): string {
    const advice = {
      opening: {
        beginner: "Focus on controlling the center with pawns and developing knights before bishops. Castle early to keep your king safe!",
        intermediate: "Consider your pawn structure and piece coordination. Look for opportunities to gain space while maintaining piece activity.",
        advanced: "Analyze the resulting pawn structures and plan your piece placement accordingly. Consider both tactical and strategic elements."
      },
      middlegame: {
        beginner: "Look for tactics like forks, pins, and discovered attacks. Always check if your pieces are defended before moving.",
        intermediate: "Identify weaknesses in your opponent's position and create plans to exploit them. Coordinate your pieces for maximum effect.",
        advanced: "Evaluate the position dynamically. Consider pawn breaks, piece exchanges, and long-term strategic goals."
      },
      endgame: {
        beginner: "Activate your king and push passed pawns. In king and pawn endings, opposition is crucial for winning.",
        intermediate: "Calculate precisely and use your pieces actively. Look for tactical motifs like skewers and deflection.",
        advanced: "Master key theoretical positions and understand critical zones. Technique and accuracy are paramount."
      }
    };

    return advice[phase as keyof typeof advice]?.[difficulty as keyof typeof advice[keyof typeof advice]] || 
           "Keep practicing and focus on fundamental chess principles!";
  }
}

export const gameIntegration = new GameIntegrationService();