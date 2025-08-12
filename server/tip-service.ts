import { storage } from "./storage";
import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export class TipService {
  async getTodaysTipForUser(userId: number): Promise<any> {
    // Get user's difficulty level from settings
    const userSettings = await storage.getUserSettings(userId);
    const difficulty = userSettings?.difficulty || 'beginner';
    
    // Get today's tip based on user's level
    const tip = await storage.getTodaysTip(difficulty);
    
    if (tip) {
      // Mark as viewed
      await storage.markTipAsViewed(userId, tip.id);
      
      // Get user's progress on this tip
      const userProgress = await storage.getUserTipProgress(userId);
      const tipProgress = userProgress.find(p => p.tipId === tip.id);
      
      return {
        ...tip,
        progress: tipProgress || { completed: false, bookmarked: false }
      };
    }
    
    // If no tip for today, return a fallback tip
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

  // Generate personalized tip using AI (future enhancement)
  async generatePersonalizedTip(userId: number): Promise<any> {
    if (!process.env.OPENAI_API_KEY) {
      return null;
    }

    try {
      // Get user's recent games and weaknesses
      const user = await storage.getUser(userId);
      const userSettings = await storage.getUserSettings(userId);
      
      if (!user) return null;

      const prompt = `Generate a personalized chess tip for a ${userSettings?.difficulty || 'beginner'} level player with ELO rating ${user.eloRating}. 

Create a concise, actionable tip that:
1. Takes 20-30 seconds to read
2. Provides immediate value
3. Is appropriate for their skill level
4. Includes a specific example or position

Format as JSON:
{
  "title": "Engaging tip title",
  "content": "Clear, actionable content with example",
  "category": "opening|tactics|endgame|strategy|psychology",
  "estimatedReadTime": seconds,
  "tags": ["relevant", "tags"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a chess coach creating personalized daily tips. Keep tips concise, practical, and encouraging."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 200,
        temperature: 0.7
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        title: result.title,
        content: result.content,
        category: result.category || 'general',
        difficulty: userSettings?.difficulty || 'beginner',
        estimatedReadTime: result.estimatedReadTime || 25,
        tags: result.tags || [],
        publishDate: new Date(),
        isPersonalized: true
      };

    } catch (error) {
      console.error('Error generating personalized tip:', error);
      return null;
    }
  }
}

export const tipService = new TipService();