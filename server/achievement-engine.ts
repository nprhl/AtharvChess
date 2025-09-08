import { db } from './db';
import { 
  achievements, 
  userAchievements, 
  users, 
  games,
  userSkillAnalytics
} from '../shared/schema';
import { eq, and, count, desc, gte, lte } from 'drizzle-orm';
import type { CompleteGameAnalysis } from './progress-analytics';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: 'milestone' | 'skill' | 'consistency' | 'learning' | 'special';
  type: string;
  requirement: {
    condition: string;
    value: number;
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'all-time';
  };
  points: number;
  iconUrl?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  hidden?: boolean; // Hidden until unlocked
}

export interface AchievementProgress {
  achievementId: number;
  name: string;
  description: string;
  currentValue: number;
  targetValue: number;
  progress: number; // 0-1
  isUnlocked: boolean;
  unlockedAt?: Date;
  category: string;
  rarity: string;
  points: number;
}

export interface AchievementUnlock {
  achievementId: number;
  name: string;
  description: string;
  category: string;
  rarity: string;
  points: number;
  isFirstTime: boolean;
}

export class AchievementEngine {
  private achievementDefinitions: AchievementDefinition[] = [
    // Milestone Achievements
    {
      id: 'first_win',
      name: 'Victory Royale',
      description: 'Win your first chess game',
      category: 'milestone',
      type: 'games_won',
      requirement: { condition: 'gte', value: 1 },
      points: 50,
      rarity: 'common'
    },
    {
      id: 'games_5',
      name: 'Getting Started',
      description: 'Play 5 chess games',
      category: 'milestone',
      type: 'games_played',
      requirement: { condition: 'gte', value: 5 },
      points: 25,
      rarity: 'common'
    },
    {
      id: 'games_25',
      name: 'Chess Enthusiast',
      description: 'Play 25 chess games',
      category: 'milestone',
      type: 'games_played',
      requirement: { condition: 'gte', value: 25 },
      points: 100,
      rarity: 'rare'
    },
    {
      id: 'games_100',
      name: 'Chess Veteran',
      description: 'Play 100 chess games',
      category: 'milestone',
      type: 'games_played',
      requirement: { condition: 'gte', value: 100 },
      points: 250,
      rarity: 'epic'
    },
    {
      id: 'elo_1300',
      name: 'Rising Star',
      description: 'Reach 1300 ELO rating',
      category: 'milestone',
      type: 'elo_rating',
      requirement: { condition: 'gte', value: 1300 },
      points: 100,
      rarity: 'rare'
    },
    {
      id: 'elo_1500',
      name: 'Strong Player',
      description: 'Reach 1500 ELO rating',
      category: 'milestone',
      type: 'elo_rating',
      requirement: { condition: 'gte', value: 1500 },
      points: 200,
      rarity: 'epic'
    },
    {
      id: 'elo_1800',
      name: 'Chess Master',
      description: 'Reach 1800 ELO rating',
      category: 'milestone',
      type: 'elo_rating',
      requirement: { condition: 'gte', value: 1800 },
      points: 500,
      rarity: 'legendary'
    },

    // Skill Achievements
    {
      id: 'no_blunders_game',
      name: 'Flawless Victory',
      description: 'Win a game without any blunders',
      category: 'skill',
      type: 'perfect_game',
      requirement: { condition: 'gte', value: 1 },
      points: 75,
      rarity: 'rare'
    },
    {
      id: 'high_accuracy_game',
      name: 'Precision Master',
      description: 'Achieve 90%+ accuracy in a game',
      category: 'skill',
      type: 'high_accuracy',
      requirement: { condition: 'gte', value: 90 },
      points: 100,
      rarity: 'rare'
    },
    {
      id: 'tactical_genius',
      name: 'Tactical Genius',
      description: 'Win 3 games with brilliant tactical moves',
      category: 'skill',
      type: 'brilliant_moves',
      requirement: { condition: 'gte', value: 3 },
      points: 150,
      rarity: 'epic'
    },
    {
      id: 'opening_expert',
      name: 'Opening Expert',
      description: 'Achieve 85%+ accuracy in opening phase for 5 games',
      category: 'skill',
      type: 'opening_mastery',
      requirement: { condition: 'gte', value: 5 },
      points: 125,
      rarity: 'rare'
    },
    {
      id: 'endgame_wizard',
      name: 'Endgame Wizard',
      description: 'Win 5 games that reached the endgame phase',
      category: 'skill',
      type: 'endgame_wins',
      requirement: { condition: 'gte', value: 5 },
      points: 150,
      rarity: 'epic'
    },

    // Consistency Achievements
    {
      id: 'win_streak_3',
      name: 'Hot Streak',
      description: 'Win 3 games in a row',
      category: 'consistency',
      type: 'win_streak',
      requirement: { condition: 'gte', value: 3 },
      points: 100,
      rarity: 'rare'
    },
    {
      id: 'win_streak_5',
      name: 'Unstoppable',
      description: 'Win 5 games in a row',
      category: 'consistency',
      type: 'win_streak',
      requirement: { condition: 'gte', value: 5 },
      points: 200,
      rarity: 'epic'
    },
    {
      id: 'daily_streak_7',
      name: 'Dedicated Player',
      description: 'Play at least one game for 7 days in a row',
      category: 'consistency',
      type: 'daily_streak',
      requirement: { condition: 'gte', value: 7 },
      points: 150,
      rarity: 'rare'
    },
    {
      id: 'no_blunders_streak_5',
      name: 'Consistency Champion',
      description: 'Play 5 games in a row without any blunders',
      category: 'consistency',
      type: 'no_blunder_streak',
      requirement: { condition: 'gte', value: 5 },
      points: 250,
      rarity: 'epic'
    },

    // Learning Achievements
    {
      id: 'lessons_10',
      name: 'Eager Student',
      description: 'Complete 10 chess lessons',
      category: 'learning',
      type: 'lessons_completed',
      requirement: { condition: 'gte', value: 10 },
      points: 75,
      rarity: 'common'
    },
    {
      id: 'puzzles_50',
      name: 'Puzzle Solver',
      description: 'Solve 50 chess puzzles',
      category: 'learning',
      type: 'puzzles_solved',
      requirement: { condition: 'gte', value: 50 },
      points: 100,
      rarity: 'rare'
    },
    {
      id: 'improvement_velocity',
      name: 'Fast Learner',
      description: 'Improve your rating by 200 points in a month',
      category: 'learning',
      type: 'rating_improvement',
      requirement: { condition: 'gte', value: 200, timeframe: 'monthly' },
      points: 200,
      rarity: 'epic'
    },

    // Special Achievements
    {
      id: 'perfect_opening',
      name: 'Theory Master',
      description: 'Play the perfect opening moves 10 times',
      category: 'special',
      type: 'perfect_opening',
      requirement: { condition: 'gte', value: 10 },
      points: 175,
      rarity: 'epic'
    },
    {
      id: 'checkmate_patterns',
      name: 'Checkmate Artist',
      description: 'Execute 5 different checkmate patterns',
      category: 'special',
      type: 'checkmate_variety',
      requirement: { condition: 'gte', value: 5 },
      points: 200,
      rarity: 'legendary'
    },
    {
      id: 'comeback_king',
      name: 'Comeback King',
      description: 'Win a game after being down significant material',
      category: 'special',
      type: 'comeback_win',
      requirement: { condition: 'gte', value: 1 },
      points: 150,
      rarity: 'epic'
    }
  ];

  constructor() {
    this.initializeAchievements();
  }

  /**
   * Initialize achievement definitions in db
   */
  private async initializeAchievements(): Promise<void> {
    try {
      console.log('[AchievementEngine] Initializing achievements...');
      
      // Check which achievements already exist
      const existingAchievements = await db.select().from(achievements);
      const existingTypes = new Set(existingAchievements.map((a: any) => a.type));
      
      // Insert new achievements
      const newAchievements = this.achievementDefinitions.filter(
        def => !existingTypes.has(def.type)
      );
      
      if (newAchievements.length > 0) {
        await db.insert(achievements).values(
          newAchievements.map(def => ({
            name: def.name,
            description: def.description,
            category: def.category,
            type: def.type,
            requirement: def.requirement,
            points: def.points,
            iconUrl: def.iconUrl,
            rarity: def.rarity,
            isActive: true
          }))
        );
        
        console.log(`[AchievementEngine] Added ${newAchievements.length} new achievements`);
      }
      
    } catch (error) {
      console.error('[AchievementEngine] Error initializing achievements:', error);
    }
  }

  /**
   * Check achievements after a game analysis
   */
  public async checkGameAchievements(userId: number, analysis: CompleteGameAnalysis, gameResult: string): Promise<AchievementUnlock[]> {
    const unlocked: AchievementUnlock[] = [];
    
    try {
      console.log(`[AchievementEngine] Checking achievements for user ${userId}, game ${analysis.gameId}`);
      
      // Get user data
      const userData = await this.getUserData(userId);
      if (!userData) return unlocked;
      
      // Check different types of achievements
      await Promise.all([
        this.checkMilestoneAchievements(userId, userData, unlocked),
        this.checkSkillAchievements(userId, analysis, unlocked),
        this.checkConsistencyAchievements(userId, gameResult, unlocked),
        this.checkSpecialAchievements(userId, analysis, unlocked)
      ]);
      
      // Save any new unlocks
      if (unlocked.length > 0) {
        await this.saveAchievementUnlocks(userId, unlocked);
        console.log(`[AchievementEngine] Unlocked ${unlocked.length} achievements for user ${userId}`);
      }
      
      return unlocked;
      
    } catch (error) {
      console.error('[AchievementEngine] Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Get user progress on all achievements
   */
  public async getUserAchievementProgress(userId: number): Promise<AchievementProgress[]> {
    try {
      const allAchievements = await db.select().from(achievements).where(eq(achievements.isActive, true));
      const userAchievs = await db.select()
        .from(userAchievements)
        .where(eq(userAchievements.userId, userId));
      
      const userAchievMap = new Map(userAchievs.map((ua: any) => [ua.achievementId, ua]));
      const userData = await this.getUserData(userId);
      
      const progress: AchievementProgress[] = [];
      
      for (const achievement of allAchievements) {
        const userAchiev = userAchievMap.get(achievement.id);
        const currentValue = await this.calculateCurrentValue(userId, achievement.type, userData);
        const targetValue = (achievement.requirement as any).value;
        
        progress.push({
          achievementId: achievement.id,
          name: achievement.name,
          description: achievement.description,
          currentValue,
          targetValue,
          progress: Math.min(1, currentValue / targetValue),
          isUnlocked: (userAchiev as any)?.isUnlocked || false,
          unlockedAt: (userAchiev as any)?.unlockedAt || undefined,
          category: achievement.category,
          rarity: achievement.rarity,
          points: achievement.points
        });
      }
      
      return progress.sort((a, b) => {
        // Sort by unlocked status, then by progress
        if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? 1 : -1;
        return b.progress - a.progress;
      });
      
    } catch (error) {
      console.error('[AchievementEngine] Error getting user progress:', error);
      return [];
    }
  }

  /**
   * Get user statistics for achievement calculations
   */
  private async getUserData(userId: number): Promise<any> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) return null;
      
      // Get additional statistics
      const [gameStats] = await db.select({
        totalGames: count(games.id)
      }).from(games).where(eq(games.userId, userId));
      
      const [recentGames] = await db.select().from(games)
        .where(eq(games.userId, userId))
        .orderBy(desc(games.createdAt))
        .limit(10);
        
      return {
        ...user,
        totalGames: gameStats?.totalGames || 0,
        recentGames: recentGames || []
      };
      
    } catch (error) {
      console.error('[AchievementEngine] Error getting user data:', error);
      return null;
    }
  }

  /**
   * Calculate current value for achievement type
   */
  private async calculateCurrentValue(userId: number, achievementType: string, userData: any): Promise<number> {
    try {
      switch (achievementType) {
        case 'games_won':
          return userData.gamesWon || 0;
          
        case 'games_played':
          return userData.totalGames || 0;
          
        case 'elo_rating':
          return userData.eloRating || 1200;
          
        case 'lessons_completed':
          return userData.lessonsCompleted || 0;
          
        case 'puzzles_solved':
          return userData.puzzlesSolved || 0;
          
        case 'perfect_game':
          // Count games with 0 blunders from analysis
          const [perfectGames] = await db.select({ count: count() })
            .from(games)
            .where(eq(games.userId, userId));
          return perfectGames?.count || 0;
          
        case 'high_accuracy':
          // Count games with 90%+ accuracy from analysis
          return 0; // Would need to query game analysis
          
        case 'win_streak':
          return this.calculateWinStreak(userData.recentGames);
          
        default:
          return 0;
      }
    } catch (error) {
      console.error(`Error calculating value for ${achievementType}:`, error);
      return 0;
    }
  }

  /**
   * Calculate current win streak
   */
  private calculateWinStreak(recentGames: any[]): number {
    let streak = 0;
    for (const game of recentGames) {
      if (game.result === 'win') {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  /**
   * Check milestone achievements
   */
  private async checkMilestoneAchievements(userId: number, userData: any, unlocked: AchievementUnlock[]): Promise<void> {
    const milestoneChecks = [
      { type: 'games_won', value: userData.gamesWon },
      { type: 'games_played', value: userData.totalGames },
      { type: 'elo_rating', value: userData.eloRating },
      { type: 'lessons_completed', value: userData.lessonsCompleted },
      { type: 'puzzles_solved', value: userData.puzzlesSolved }
    ];
    
    for (const check of milestoneChecks) {
      await this.checkAchievementType(userId, check.type, check.value, unlocked);
    }
  }

  /**
   * Check skill-based achievements
   */
  private async checkSkillAchievements(userId: number, analysis: CompleteGameAnalysis, unlocked: AchievementUnlock[]): Promise<void> {
    const blunderCount = analysis.moves.filter(m => m.classification === 'blunder').length;
    const brilliantCount = analysis.moves.filter(m => m.classification === 'brilliant').length;
    
    // Check for perfect game (no blunders)
    if (blunderCount === 0) {
      await this.checkAchievementType(userId, 'perfect_game', 1, unlocked);
    }
    
    // Check for high accuracy
    if (analysis.overallAccuracy >= 90) {
      await this.checkAchievementType(userId, 'high_accuracy', 1, unlocked);
    }
    
    // Check for brilliant moves
    if (brilliantCount > 0) {
      await this.checkAchievementType(userId, 'brilliant_moves', brilliantCount, unlocked);
    }
    
    // Check opening accuracy
    const openingMoves = analysis.moves.filter(m => m.phase === 'opening');
    const openingAccuracy = openingMoves.reduce((sum, m) => sum + m.accuracy, 0) / Math.max(1, openingMoves.length);
    if (openingAccuracy >= 85) {
      await this.checkAchievementType(userId, 'opening_mastery', 1, unlocked);
    }
  }

  /**
   * Check consistency achievements
   */
  private async checkConsistencyAchievements(userId: number, gameResult: string, unlocked: AchievementUnlock[]): Promise<void> {
    if (gameResult === 'win') {
      // Get recent games to check win streak
      const recentGames = await db.select()
        .from(games)
        .where(eq(games.userId, userId))
        .orderBy(desc(games.createdAt))
        .limit(10);
        
      const winStreak = this.calculateWinStreak(recentGames);
      await this.checkAchievementType(userId, 'win_streak', winStreak, unlocked);
    }
  }

  /**
   * Check special achievements
   */
  private async checkSpecialAchievements(userId: number, analysis: CompleteGameAnalysis, unlocked: AchievementUnlock[]): Promise<void> {
    // Placeholder for special achievement logic
    // Would implement pattern recognition for checkmates, comebacks, etc.
  }

  /**
   * Check if user qualifies for achievement of specific type
   */
  private async checkAchievementType(userId: number, type: string, currentValue: number, unlocked: AchievementUnlock[]): Promise<void> {
    try {
      const relevantAchievements = await db.select()
        .from(achievements)
        .where(and(eq(achievements.type, type), eq(achievements.isActive, true)));
      
      for (const achievement of relevantAchievements) {
        const requirement = achievement.requirement as any;
        const targetValue = requirement.value;
        
        // Check if user meets requirement
        if (currentValue >= targetValue) {
          // Check if already unlocked
          const existing = await db.select()
            .from(userAchievements)
            .where(and(
              eq(userAchievements.userId, userId),
              eq(userAchievements.achievementId, achievement.id),
              eq(userAchievements.isUnlocked, true)
            ))
            .limit(1);
          
          if (existing.length === 0) {
            // New unlock!
            unlocked.push({
              achievementId: achievement.id,
              name: achievement.name,
              description: achievement.description,
              category: achievement.category,
              rarity: achievement.rarity,
              points: achievement.points,
              isFirstTime: true
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error checking achievement type ${type}:`, error);
    }
  }

  /**
   * Save achievement unlocks to db
   */
  private async saveAchievementUnlocks(userId: number, unlocked: AchievementUnlock[]): Promise<void> {
    try {
      for (const unlock of unlocked) {
        // Check if record exists
        const existing = await db.select()
          .from(userAchievements)
          .where(and(
            eq(userAchievements.userId, userId),
            eq(userAchievements.achievementId, unlock.achievementId)
          ))
          .limit(1);
        
        if (existing.length === 0) {
          // Create new record
          await db.insert(userAchievements).values({
            userId,
            achievementId: unlock.achievementId,
            progress: '1.00',
            isUnlocked: true,
            unlockedAt: new Date(),
            currentValue: 1,
            targetValue: 1
          });
        } else {
          // Update existing record
          await db.update(userAchievements)
            .set({
              progress: '1.00',
              isUnlocked: true,
              unlockedAt: new Date()
            })
            .where(eq(userAchievements.id, existing[0].id));
        }
      }
    } catch (error) {
      console.error('[AchievementEngine] Error saving unlocks:', error);
    }
  }
}

// Export singleton instance
export const achievementEngine = new AchievementEngine();