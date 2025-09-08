import { OpenAI } from 'openai';
import { db } from './db';
import { 
  userSkillAnalytics, 
  gameAnalysis, 
  openingPerformance,
  games,
  users
} from '../shared/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import type { CompleteGameAnalysis } from './progress-analytics';

export interface PersonalizedRecommendation {
  id: string;
  category: 'tactical' | 'positional' | 'opening' | 'endgame' | 'time_management' | 'psychology';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionableSteps: string[];
  estimatedImprovementElo: number;
  basedOnData: {
    recentGames: number;
    patternFrequency: number;
    strengthVsWeakness: 'weakness' | 'strength';
  };
  practiceExercises?: {
    puzzleTypes: string[];
    openingsToStudy: string[];
    endgamePositions: string[];
  };
}

export interface SkillAssessment {
  overallRating: number;
  phaseRatings: {
    opening: number;
    middlegame: number;
    endgame: number;
  };
  specificSkills: {
    tactical: number;
    positional: number;
    calculation: number;
    timeManagement: number;
  };
  consistency: number;
  improvementVelocity: number;
  recentForm: 'improving' | 'stable' | 'declining';
}

export interface LearningPath {
  currentLevel: 'beginner' | 'intermediate' | 'advanced';
  nextMilestone: {
    target: string;
    requiredRatingGain: number;
    estimatedTimeframe: string;
  };
  recommendations: PersonalizedRecommendation[];
  focusAreas: string[];
  strengthsToMaintain: string[];
}

export class AIRecommendationEngine {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate comprehensive personalized learning path for user
   */
  public async generateLearningPath(userId: number): Promise<LearningPath | null> {
    try {
      console.log(`[RecommendationEngine] Generating learning path for user ${userId}`);

      // Get user skill assessment
      const skillAssessment = await this.assessUserSkills(userId);
      if (!skillAssessment) return null;

      // Analyze recent performance patterns
      const performancePatterns = await this.analyzePerformancePatterns(userId);
      
      // Generate AI-powered recommendations
      const recommendations = await this.generatePersonalizedRecommendations(userId, skillAssessment, performancePatterns);
      
      // Determine current level and next milestone
      const currentLevel = this.determineSkillLevel(skillAssessment.overallRating);
      const nextMilestone = this.getNextMilestone(skillAssessment.overallRating, currentLevel);
      
      // Identify focus areas and strengths
      const focusAreas = this.identifyFocusAreas(skillAssessment, performancePatterns);
      const strengthsToMaintain = this.identifyStrengths(skillAssessment, performancePatterns);

      const learningPath: LearningPath = {
        currentLevel,
        nextMilestone,
        recommendations: recommendations.slice(0, 6), // Top 6 recommendations
        focusAreas,
        strengthsToMaintain
      };

      console.log(`[RecommendationEngine] Generated ${recommendations.length} recommendations for user ${userId}`);
      return learningPath;

    } catch (error) {
      console.error('[RecommendationEngine] Error generating learning path:', error);
      return null;
    }
  }

  /**
   * Assess user's current skill levels across all areas
   */
  private async assessUserSkills(userId: number): Promise<SkillAssessment | null> {
    try {
      // Get user skill analytics
      const [skillData] = await db.select()
        .from(userSkillAnalytics)
        .where(eq(userSkillAnalytics.userId, userId))
        .limit(1);

      if (!skillData) {
        // Create default assessment for new users
        return this.createDefaultAssessment(userId);
      }

      // Get recent game performance
      const recentGames = await db.select()
        .from(games)
        .where(eq(games.userId, userId))
        .orderBy(desc(games.createdAt))
        .limit(10);

      const recentAnalyses = await db.select()
        .from(gameAnalysis)
        .where(eq(gameAnalysis.userId, userId))
        .orderBy(desc(gameAnalysis.createdAt))
        .limit(10);

      // Calculate consistency from recent performance
      const consistency = this.calculateConsistency(recentAnalyses);
      
      // Calculate improvement velocity
      const improvementVelocity = parseFloat(skillData.improvementVelocity);
      
      // Determine recent form
      const recentForm = this.determineRecentForm(recentGames, recentAnalyses);

      return {
        overallRating: Math.round((skillData.openingStrength + skillData.middlegameStrength + skillData.endgameStrength) / 3),
        phaseRatings: {
          opening: skillData.openingStrength,
          middlegame: skillData.middlegameStrength,
          endgame: skillData.endgameStrength
        },
        specificSkills: {
          tactical: skillData.tacticalRating,
          positional: skillData.positionalRating,
          calculation: skillData.calculationRating,
          timeManagement: parseFloat(skillData.timeManagementScore) * 100
        },
        consistency,
        improvementVelocity,
        recentForm
      };

    } catch (error) {
      console.error('[RecommendationEngine] Error assessing skills:', error);
      return null;
    }
  }

  /**
   * Create default skill assessment for new users
   */
  private async createDefaultAssessment(userId: number): Promise<SkillAssessment> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const baseRating = user?.eloRating || 1200;

    return {
      overallRating: baseRating,
      phaseRatings: {
        opening: baseRating,
        middlegame: baseRating,
        endgame: baseRating
      },
      specificSkills: {
        tactical: baseRating,
        positional: baseRating,
        calculation: baseRating,
        timeManagement: 75
      },
      consistency: 70,
      improvementVelocity: 0,
      recentForm: 'stable'
    };
  }

  /**
   * Analyze user's performance patterns from recent games
   */
  private async analyzePerformancePatterns(userId: number): Promise<any> {
    try {
      // Get recent game analyses
      const recentAnalyses = await db.select()
        .from(gameAnalysis)
        .where(eq(gameAnalysis.userId, userId))
        .orderBy(desc(gameAnalysis.createdAt))
        .limit(20);

      // Get opening performance data
      const openingStats = await db.select()
        .from(openingPerformance)
        .where(eq(openingPerformance.userId, userId))
        .orderBy(desc(openingPerformance.lastPlayed))
        .limit(10);

      // Analyze patterns
      const patterns = {
        commonMistakes: this.identifyCommonMistakes(recentAnalyses),
        weakOpenings: this.identifyWeakOpenings(openingStats),
        timeManagementIssues: this.analyzeTimeManagement(recentAnalyses),
        tacticalBlindSpots: this.identifyTacticalBlindSpots(recentAnalyses),
        positionaltypesStruggles: this.identifyPositionalStruggles(recentAnalyses),
        endgameWeaknesses: this.identifyEndgameWeaknesses(recentAnalyses)
      };

      return patterns;

    } catch (error) {
      console.error('[RecommendationEngine] Error analyzing patterns:', error);
      return {};
    }
  }

  /**
   * Generate AI-powered personalized recommendations
   */
  private async generatePersonalizedRecommendations(
    userId: number, 
    skillAssessment: SkillAssessment, 
    patterns: any
  ): Promise<PersonalizedRecommendation[]> {
    try {
      const recommendations: PersonalizedRecommendation[] = [];

      // Add rule-based recommendations first
      recommendations.push(...this.generateRuleBasedRecommendations(skillAssessment, patterns));

      // Generate AI-enhanced recommendations if OpenAI is available
      if (process.env.OPENAI_API_KEY) {
        const aiRecommendations = await this.generateAIRecommendations(userId, skillAssessment, patterns);
        recommendations.push(...aiRecommendations);
      }

      // Sort by priority and return
      return recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

    } catch (error) {
      console.error('[RecommendationEngine] Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Generate rule-based recommendations
   */
  private generateRuleBasedRecommendations(skillAssessment: SkillAssessment, patterns: any): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];

    // Tactical improvement recommendations
    if (skillAssessment.specificSkills.tactical < skillAssessment.overallRating - 50) {
      recommendations.push({
        id: 'improve_tactics',
        category: 'tactical',
        priority: 'high',
        title: 'Strengthen Tactical Vision',
        description: 'Your tactical rating is below your overall level. Focus on pattern recognition and calculation.',
        actionableSteps: [
          'Solve 20 tactical puzzles daily (15-20 minutes)',
          'Focus on common patterns: pins, forks, skewers',
          'Practice visualization without moving pieces',
          'Review games to spot missed tactical opportunities'
        ],
        estimatedImprovementElo: 75,
        basedOnData: {
          recentGames: 10,
          patternFrequency: 0.3,
          strengthVsWeakness: 'weakness'
        },
        practiceExercises: {
          puzzleTypes: ['tactical', 'combination', 'mate_in_2'],
          openingsToStudy: [],
          endgamePositions: []
        }
      });
    }

    // Opening recommendations
    if (skillAssessment.phaseRatings.opening < skillAssessment.overallRating - 30) {
      recommendations.push({
        id: 'improve_opening',
        category: 'opening',
        priority: 'medium',
        title: 'Master Opening Principles',
        description: 'Your opening play needs improvement. Focus on sound development and central control.',
        actionableSteps: [
          'Study 2-3 opening systems deeply rather than many superficially',
          'Learn opening principles: control center, develop pieces, king safety',
          'Analyze your opening mistakes from recent games',
          'Play the same openings consistently to build familiarity'
        ],
        estimatedImprovementElo: 50,
        basedOnData: {
          recentGames: 10,
          patternFrequency: 0.4,
          strengthVsWeakness: 'weakness'
        },
        practiceExercises: {
          puzzleTypes: [],
          openingsToStudy: ['italian_game', 'queens_gambit', 'sicilian_najdorf'],
          endgamePositions: []
        }
      });
    }

    // Endgame recommendations
    if (skillAssessment.phaseRatings.endgame < skillAssessment.overallRating - 40) {
      recommendations.push({
        id: 'improve_endgame',
        category: 'endgame',
        priority: 'medium',
        title: 'Master Basic Endgames',
        description: 'Strong endgame knowledge will help you convert advantages and save difficult positions.',
        actionableSteps: [
          'Learn key endgame patterns: King and pawn vs King',
          'Practice rook endgames (most common)',
          'Study basic checkmate patterns',
          'Play out endgame positions against engine'
        ],
        estimatedImprovementElo: 60,
        basedOnData: {
          recentGames: 8,
          patternFrequency: 0.25,
          strengthVsWeakness: 'weakness'
        },
        practiceExercises: {
          puzzleTypes: ['endgame'],
          openingsToStudy: [],
          endgamePositions: ['king_pawn_endgame', 'rook_endgame', 'basic_checkmates']
        }
      });
    }

    // Time management
    if (skillAssessment.specificSkills.timeManagement < 70) {
      recommendations.push({
        id: 'improve_time_management',
        category: 'time_management',
        priority: 'medium',
        title: 'Optimize Time Management',
        description: 'Better time management will help you make stronger moves under pressure.',
        actionableSteps: [
          'Spend more time on critical positions',
          'Use increment/delay time wisely',
          'Practice time management in training games',
          'Learn to recognize when to think longer vs move quickly'
        ],
        estimatedImprovementElo: 40,
        basedOnData: {
          recentGames: 10,
          patternFrequency: 0.6,
          strengthVsWeakness: 'weakness'
        }
      });
    }

    return recommendations;
  }

  /**
   * Generate AI-enhanced recommendations using OpenAI
   */
  private async generateAIRecommendations(
    userId: number, 
    skillAssessment: SkillAssessment, 
    patterns: any
  ): Promise<PersonalizedRecommendation[]> {
    try {
      const prompt = this.constructRecommendationPrompt(skillAssessment, patterns);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) return [];

      // Parse AI response into structured recommendations
      return this.parseAIRecommendations(aiResponse);

    } catch (error) {
      console.log('[RecommendationEngine] AI recommendations failed, using rule-based only');
      return [];
    }
  }

  /**
   * Construct prompt for AI recommendation generation
   */
  private constructRecommendationPrompt(skillAssessment: SkillAssessment, patterns: any): string {
    return `Analyze this chess player's profile and suggest 2-3 specific, actionable improvement recommendations:

Player Profile:
- Overall Rating: ${skillAssessment.overallRating}
- Opening: ${skillAssessment.phaseRatings.opening}
- Middlegame: ${skillAssessment.phaseRatings.middlegame}  
- Endgame: ${skillAssessment.phaseRatings.endgame}
- Tactical: ${skillAssessment.specificSkills.tactical}
- Positional: ${skillAssessment.specificSkills.positional}
- Consistency: ${skillAssessment.consistency}%
- Recent Form: ${skillAssessment.recentForm}

Performance Patterns:
- Common mistakes: ${JSON.stringify(patterns.commonMistakes || [])}
- Time management issues: ${patterns.timeManagementIssues || 'none detected'}

For each recommendation, provide:
1. Specific weakness/opportunity identified
2. Concrete action steps (3-4 steps)
3. Expected rating improvement (realistic estimate)
4. Priority level (high/medium/low)

Focus on the biggest gaps first and provide actionable, specific advice. Format as JSON array with fields: category, priority, title, description, actionableSteps, estimatedImprovementElo.`;
  }

  /**
   * Parse AI response into structured recommendations
   */
  private parseAIRecommendations(aiResponse: string): PersonalizedRecommendation[] {
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const recommendations = JSON.parse(jsonMatch[0]);
      
      return recommendations.map((rec: any, index: number) => ({
        id: `ai_rec_${index}`,
        category: rec.category || 'positional',
        priority: rec.priority || 'medium',
        title: rec.title || 'AI Recommendation',
        description: rec.description || '',
        actionableSteps: rec.actionableSteps || [],
        estimatedImprovementElo: rec.estimatedImprovementElo || 30,
        basedOnData: {
          recentGames: 10,
          patternFrequency: 0.5,
          strengthVsWeakness: 'weakness' as const
        }
      }));

    } catch (error) {
      console.log('[RecommendationEngine] Failed to parse AI recommendations');
      return [];
    }
  }

  /**
   * Helper methods for pattern analysis
   */
  private identifyCommonMistakes(analyses: any[]): string[] {
    const mistakes: string[] = [];
    for (const analysis of analyses) {
      if (analysis.blunders > 2) mistakes.push('frequent_blunders');
      if (analysis.mistakes > 3) mistakes.push('calculation_errors');
      if (parseFloat(analysis.averageAccuracy) < 0.7) mistakes.push('poor_move_selection');
    }
    return mistakes.filter((item, index) => mistakes.indexOf(item) === index);
  }

  private identifyWeakOpenings(openingStats: any[]): string[] {
    return openingStats
      .filter(opening => parseFloat(opening.winRate) < 0.4)
      .map(opening => opening.openingEco)
      .slice(0, 3);
  }

  private analyzeTimeManagement(analyses: any[]): string {
    // Placeholder - would analyze time spent per move
    return 'needs_improvement';
  }

  private identifyTacticalBlindSpots(analyses: any[]): string[] {
    // Analyze weaknesses found in games
    const blindSpots: string[] = [];
    for (const analysis of analyses) {
      if (analysis.weaknessesFound) {
        analysis.weaknessesFound.forEach((weakness: string) => {
          if (weakness.includes('tactical') && !blindSpots.includes(weakness)) {
            blindSpots.push(weakness);
          }
        });
      }
    }
    return blindSpots;
  }

  private identifyPositionalStruggles(analyses: any[]): string[] {
    const struggles: string[] = [];
    for (const analysis of analyses) {
      if (analysis.weaknessesFound) {
        analysis.weaknessesFound.forEach((weakness: string) => {
          if (weakness.includes('positional') && !struggles.includes(weakness)) {
            struggles.push(weakness);
          }
        });
      }
    }
    return struggles;
  }

  private identifyEndgameWeaknesses(analyses: any[]): string[] {
    const weaknesses: string[] = [];
    for (const analysis of analyses) {
      if (analysis.weaknessesFound) {
        analysis.weaknessesFound.forEach((weakness: string) => {
          if (weakness.includes('endgame') && !weaknesses.includes(weakness)) {
            weaknesses.push(weakness);
          }
        });
      }
    }
    return weaknesses;
  }

  private calculateConsistency(analyses: any[]): number {
    if (analyses.length === 0) return 70;
    
    const accuracies = analyses.map(a => parseFloat(a.averageAccuracy) || 0.7);
    const mean = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) / accuracies.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower standard deviation = higher consistency
    return Math.max(30, Math.min(100, 100 - (standardDeviation * 200)));
  }

  private determineRecentForm(games: any[], analyses: any[]): 'improving' | 'stable' | 'declining' {
    if (games.length < 5) return 'stable';
    
    const recentWinRate = games.slice(0, 5).filter(g => g.result === 'win').length / 5;
    const olderWinRate = games.slice(5, 10).filter(g => g.result === 'win').length / Math.max(1, games.slice(5, 10).length);
    
    if (recentWinRate > olderWinRate + 0.2) return 'improving';
    if (recentWinRate < olderWinRate - 0.2) return 'declining';
    return 'stable';
  }

  private determineSkillLevel(rating: number): 'beginner' | 'intermediate' | 'advanced' {
    if (rating < 1300) return 'beginner';
    if (rating < 1600) return 'intermediate';
    return 'advanced';
  }

  private getNextMilestone(currentRating: number, level: string): any {
    const milestones = {
      beginner: [
        { rating: 1200, target: 'Learn basic tactics', timeframe: '2-3 months' },
        { rating: 1300, target: 'Master opening principles', timeframe: '3-4 months' }
      ],
      intermediate: [
        { rating: 1400, target: 'Advanced tactical patterns', timeframe: '4-6 months' },
        { rating: 1600, target: 'Positional understanding', timeframe: '6-8 months' }
      ],
      advanced: [
        { rating: 1800, target: 'Expert-level play', timeframe: '8-12 months' },
        { rating: 2000, target: 'Master candidate level', timeframe: '12-18 months' }
      ]
    };

    const levelMilestones = milestones[level as keyof typeof milestones];
    const nextMilestone = levelMilestones.find(m => m.rating > currentRating) || levelMilestones[levelMilestones.length - 1];
    
    return {
      target: nextMilestone.target,
      requiredRatingGain: nextMilestone.rating - currentRating,
      estimatedTimeframe: nextMilestone.timeframe
    };
  }

  private identifyFocusAreas(skillAssessment: SkillAssessment, patterns: any): string[] {
    const areas: string[] = [];
    
    // Identify weakest areas
    const skills = skillAssessment.specificSkills;
    const phases = skillAssessment.phaseRatings;
    
    const allRatings = [
      { name: 'tactical', rating: skills.tactical },
      { name: 'positional', rating: skills.positional },
      { name: 'opening', rating: phases.opening },
      { name: 'middlegame', rating: phases.middlegame },
      { name: 'endgame', rating: phases.endgame }
    ];
    
    // Sort by rating and take the 2-3 weakest
    allRatings.sort((a, b) => a.rating - b.rating);
    areas.push(...allRatings.slice(0, 3).map(skill => skill.name));
    
    return areas;
  }

  private identifyStrengths(skillAssessment: SkillAssessment, patterns: any): string[] {
    const strengths: string[] = [];
    
    const skills = skillAssessment.specificSkills;
    const phases = skillAssessment.phaseRatings;
    const overall = skillAssessment.overallRating;
    
    // Identify areas significantly above average
    if (skills.tactical > overall + 30) strengths.push('tactical');
    if (skills.positional > overall + 30) strengths.push('positional');
    if (phases.opening > overall + 20) strengths.push('opening');
    if (phases.middlegame > overall + 20) strengths.push('middlegame');
    if (phases.endgame > overall + 20) strengths.push('endgame');
    if (skillAssessment.consistency > 85) strengths.push('consistency');
    
    return strengths;
  }
}

// Export singleton instance
export const aiRecommendationEngine = new AIRecommendationEngine();