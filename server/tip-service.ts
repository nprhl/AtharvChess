import { storage } from "./storage";
import OpenAI from "openai";

interface GameAnalysis {
  totalGames: number;
  winRate: number;
  wins: number;
  losses: number;
  draws: number;
  weaknesses: string[];
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export class TipService {
  async getTodaysTipForUser(userId: number): Promise<any> {
    // Get user's difficulty level from settings
    const userSettings = await storage.getUserSettings(userId);
    const difficulty = userSettings?.difficulty || 'beginner';
    
    // Get today's tip based on user's level
    let tip = await storage.getTodaysTip(difficulty);
    
    // If no regular tip available, try to generate a personalized one
    if (!tip) {
      tip = await this.generatePersonalizedTip(userId);
      
      // If personalized tip was generated, store it temporarily
      if (tip && tip.isPersonalized) {
        tip.id = 0; // Temporary ID for personalized tips
      }
    }
    
    if (tip) {
      if (tip.id > 0) {
        // Mark as viewed for database tips
        await storage.markTipAsViewed(userId, tip.id);
        
        // Get user's progress on this tip
        const userProgress = await storage.getUserTipProgress(userId);
        const tipProgress = userProgress.find(p => p.tipId === tip.id);
        
        return {
          ...tip,
          progress: tipProgress || { completed: false, bookmarked: false }
        };
      } else {
        // Return tip with default progress for personalized tips
        return {
          ...tip,
          progress: { completed: false, bookmarked: false }
        };
      }
    }
    
    // Fallback if no tip available
    return await this.getFallbackTip(difficulty);
  }

  async getTipsByCategory(category: string, userId?: number): Promise<any[]> {
    let difficulty = 'beginner';
    
    if (userId) {
      const userSettings = await storage.getUserSettings(userId);
      difficulty = userSettings?.difficulty || 'beginner';
    }
    
    return await storage.getTipsByCategory(category, difficulty);
  }

  async markTipCompleted(userId: number, tipId: number): Promise<void> {
    await storage.markTipAsCompleted(userId, tipId);
    
    // Update user stats - increment lessons completed (tips count as micro-lessons)
    const user = await storage.getUser(userId);
    if (user) {
      await storage.updateUser(userId, {
        lessonsCompleted: user.lessonsCompleted + 1
      });
    }
  }

  async toggleBookmark(userId: number, tipId: number): Promise<boolean> {
    const userProgress = await storage.getUserTipProgress(userId);
    const tipProgress = userProgress.find(p => p.tipId === tipId);
    const newBookmarkState = !tipProgress?.bookmarked;
    
    await storage.bookmarkTip(userId, tipId, newBookmarkState);
    return newBookmarkState;
  }

  async rateTip(userId: number, tipId: number, rating: number): Promise<void> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    await storage.rateTip(userId, tipId, rating);
  }

  async getUserBookmarks(userId: number): Promise<any[]> {
    return await storage.getUserBookmarkedTips(userId);
  }

  async getUserStats(userId: number): Promise<any> {
    const userProgress = await storage.getUserTipProgress(userId);
    const totalViewed = userProgress.length;
    const totalCompleted = userProgress.filter(p => p.completed).length;
    const totalBookmarked = userProgress.filter(p => p.bookmarked).length;
    
    // Calculate completion rate
    const completionRate = totalViewed > 0 ? Math.round((totalCompleted / totalViewed) * 100) : 0;
    
    // Calculate total reading time
    const totalReadingTime = userProgress.reduce((sum, p) => sum + (p.estimatedReadTime || 0), 0);
    
    return {
      totalViewed,
      totalCompleted,
      totalBookmarked,
      completionRate,
      totalReadingTime,
      currentStreak: await this.calculateCurrentStreak(userId)
    };
  }

  private async calculateCurrentStreak(userId: number): Promise<number> {
    const userProgress = await storage.getUserTipProgress(userId);
    const completedTips = userProgress
      .filter(p => p.completed && p.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
    
    if (completedTips.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const tip of completedTips) {
      const completedDate = new Date(tip.completedAt!);
      completedDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  private async getFallbackTip(difficulty: string): Promise<any> {
    // Get a recent tip as fallback
    const recentTips = await storage.getRecentTips(1);
    return recentTips[0] || {
      id: 0,
      title: "Welcome to Chess Tips!",
      content: "Start your chess improvement journey with daily bite-sized tips. Each tip takes less than a minute to read but can make a big difference in your game!",
      category: "general",
      difficulty: difficulty,
      estimatedReadTime: 15,
      tags: ["welcome"],
      progress: { completed: false, bookmarked: false }
    };
  }

  // Generate personalized tip using AI based on user's game history and performance
  async generatePersonalizedTip(userId: number): Promise<any> {
    if (!process.env.OPENAI_API_KEY) {
      return null;
    }

    try {
      // Get user's recent games and performance data
      const user = await storage.getUser(userId);
      const userSettings = await storage.getUserSettings(userId);
      const recentGames = await storage.getGamesByUserId(userId);
      
      if (!user) return null;

      // Analyze recent game patterns
      const gameAnalysis = this.analyzeRecentGames(recentGames.slice(0, 5));
      
      const prompt = `Generate a personalized chess tip for a ${userSettings?.difficulty || 'beginner'} level player with ELO rating ${user.eloRating}.

Player Statistics:
- Current ELO: ${user.eloRating}
- Games Won: ${user.gamesWon}
- Recent Performance: ${gameAnalysis.winRate}% win rate in last ${gameAnalysis.totalGames} games
- Identified Weaknesses: ${gameAnalysis.weaknesses.join(', ') || 'General improvement needed'}

Create a targeted tip that:
1. Addresses their specific skill level and recent performance
2. Takes 25-35 seconds to read
3. Provides actionable advice they can use immediately
4. Is encouraging and specific to their ELO range

Format as JSON:
{
  "title": "Engaging, specific tip title",
  "content": "Detailed, actionable content with chess examples",
  "category": "opening|tactics|endgame|strategy|psychology",
  "estimatedReadTime": seconds,
  "tags": ["relevant", "tags", "based", "on", "analysis"],
  "fen": "optional_chess_position_fen_if_relevant",
  "moves": [{"from": "e2", "to": "e4"}]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert chess coach creating personalized tips based on player performance data. Focus on practical, immediately applicable advice."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
        temperature: 0.8
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        id: 0, // Personalized tips get temporary ID
        title: result.title || "Personalized Chess Insight",
        content: result.content || "Keep practicing and focus on fundamental principles!",
        category: result.category || 'strategy',
        difficulty: userSettings?.difficulty || 'beginner',
        fen: result.fen || null,
        moves: result.moves || [],
        estimatedReadTime: result.estimatedReadTime || 30,
        tags: [...(result.tags || []), 'personalized', 'ai-generated'],
        publishDate: new Date(),
        isPersonalized: true,
        isActive: true
      };

    } catch (error) {
      console.error('Error generating personalized tip:', error);
      return null;
    }
  }

  // Analyze recent games to identify patterns and weaknesses
  private analyzeRecentGames(games: any[]): GameAnalysis {
    if (games.length === 0) {
      return {
        totalGames: 0,
        winRate: 0,
        weaknesses: ['Practice more games to get personalized insights']
      };
    }

    const wins = games.filter(g => g.result === 'win').length;
    const losses = games.filter(g => g.result === 'loss').length;
    const draws = games.filter(g => g.result === 'draw').length;
    
    const winRate = Math.round((wins / games.length) * 100);
    const weaknesses: string[] = [];

    // Analyze patterns based on results and ELO changes
    if (winRate < 40) {
      weaknesses.push('tactical awareness', 'opening principles');
    }
    if (losses > wins) {
      weaknesses.push('endgame technique', 'time management');
    }
    if (draws > wins) {
      weaknesses.push('converting advantages', 'attack coordination');
    }

    return {
      totalGames: games.length,
      winRate,
      wins,
      losses,
      draws,
      weaknesses: weaknesses.length > 0 ? weaknesses : ['general improvement']
    };
  }
}

export const tipService = new TipService();