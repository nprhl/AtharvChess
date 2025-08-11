import { db } from "./db";
import { gameAnalysis, dynamicLessons, skillProgress, games, users } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GamePattern {
  type: 'blunder' | 'missed_tactic' | 'poor_opening' | 'weak_endgame' | 'positional_error';
  move: string;
  position: string; // FEN
  explanation: string;
  improvement: string;
}

export interface LessonRecommendation {
  title: string;
  description: string;
  priority: number;
  exercises: any[];
  targetWeakness: string;
}

export class LessonGenerator {
  
  async analyzeGameForLearning(userId: number, gameId: number, moves: any[]): Promise<void> {
    try {
      // Analyze the game using OpenAI to find patterns
      const analysis = await this.generateGameAnalysis(moves);
      
      // Store the analysis
      await db.insert(gameAnalysis).values({
        userId,
        gameId,
        movesAnalyzed: moves,
        weaknessesFound: analysis.weaknesses,
        strengthsFound: analysis.strengths,
        suggestedLessons: analysis.suggestedLessons,
      });

      // Update skill progress based on analysis
      await this.updateSkillProgress(userId, analysis.weaknesses, analysis.strengths);

      // Generate personalized lessons
      await this.generatePersonalizedLessons(userId, analysis);

    } catch (error) {
      console.error('Error analyzing game for learning:', error);
    }
  }

  private async generateGameAnalysis(moves: any[]): Promise<{
    weaknesses: string[];
    strengths: string[];
    suggestedLessons: string[];
  }> {
    if (!process.env.OPENAI_API_KEY) {
      return {
        weaknesses: ['tactical_awareness'],
        strengths: ['piece_development'],
        suggestedLessons: ['basic_tactics']
      };
    }

    try {
      const prompt = `Analyze this chess game and identify learning opportunities:

Game moves: ${JSON.stringify(moves)}

Please analyze and provide JSON response with:
{
  "weaknesses": ["tactical_awareness", "endgame_technique", "opening_principles", "positional_understanding"],
  "strengths": ["piece_development", "king_safety", "center_control"],
  "suggestedLessons": ["pin_and_skewer_tactics", "basic_endgames", "opening_development"]
}

Focus on specific, actionable learning areas based on the actual moves played.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a chess coach analyzing games to identify learning opportunities. Provide specific, actionable feedback."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 200,
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        weaknesses: result.weaknesses || ['tactical_awareness'],
        strengths: result.strengths || ['piece_development'],
        suggestedLessons: result.suggestedLessons || ['basic_tactics']
      };

    } catch (error) {
      console.error('Error generating game analysis:', error);
      return {
        weaknesses: ['tactical_awareness'],
        strengths: ['piece_development'],
        suggestedLessons: ['basic_tactics']
      };
    }
  }

  private async updateSkillProgress(userId: number, weaknesses: string[], strengths: string[]): Promise<void> {
    const skillAreas = ['tactics', 'endgame', 'opening', 'positional'];
    
    for (const area of skillAreas) {
      // Check if this skill area needs attention
      const needsWork = weaknesses.some(w => w.includes(area));
      const isStrength = strengths.some(s => s.includes(area));
      
      // Get current progress
      const [currentProgress] = await db
        .select()
        .from(skillProgress)
        .where(and(
          eq(skillProgress.userId, userId),
          eq(skillProgress.skillArea, area)
        ));

      if (currentProgress) {
        // Update existing progress
        const newLevel = needsWork ? 
          Math.max(1, currentProgress.currentLevel - 0.1) :
          isStrength ? Math.min(10, currentProgress.currentLevel + 0.1) :
          currentProgress.currentLevel;

        await db
          .update(skillProgress)
          .set({
            currentLevel: Math.round(newLevel * 10) / 10,
            practiceCount: currentProgress.practiceCount + 1,
            updatedAt: new Date()
          })
          .where(eq(skillProgress.id, currentProgress.id));
      } else {
        // Create new progress entry
        await db.insert(skillProgress).values({
          userId,
          skillArea: area,
          currentLevel: needsWork ? 3 : isStrength ? 6 : 5,
          practiceCount: 1,
          successRate: isStrength ? 75 : needsWork ? 25 : 50
        });
      }
    }
  }

  private async generatePersonalizedLessons(userId: number, analysis: any): Promise<void> {
    // Deactivate old lessons for this user
    await db
      .update(dynamicLessons)
      .set({ isActive: false })
      .where(eq(dynamicLessons.userId, userId));

    // Generate new lessons based on weaknesses
    for (const weakness of analysis.weaknesses) {
      const lesson = await this.createLessonForWeakness(weakness, analysis);
      
      await db.insert(dynamicLessons).values({
        userId,
        title: lesson.title,
        description: lesson.description,
        lessonType: 'mistake_correction',
        targetWeakness: weakness,
        exercises: lesson.exercises,
        priority: this.calculatePriority(weakness, analysis.weaknesses)
      });
    }
  }

  private async createLessonForWeakness(weakness: string, analysis: any): Promise<LessonRecommendation> {
    const lessonTemplates = {
      'tactical_awareness': {
        title: 'Improve Your Tactical Vision',
        description: 'Practice recognizing common tactical patterns like pins, forks, and skewers based on your recent games.',
        priority: 8,
        targetWeakness: weakness,
        exercises: [
          { type: 'pattern_recognition', focus: 'pins_and_skewers' },
          { type: 'tactical_puzzles', difficulty: 'beginner' },
          { type: 'blunder_check', description: 'Before each move, check for tactical threats' }
        ]
      },
      'endgame_technique': {
        title: 'Strengthen Your Endgame',
        description: 'Master essential endgame patterns to convert winning positions.',
        priority: 6,
        targetWeakness: weakness,
        exercises: [
          { type: 'king_and_pawn_endgames', focus: 'basic_techniques' },
          { type: 'piece_coordination', focus: 'rook_endgames' }
        ]
      },
      'opening_principles': {
        title: 'Opening Fundamentals',
        description: 'Learn key opening principles to start your games strongly.',
        priority: 7,
        targetWeakness: weakness,
        exercises: [
          { type: 'development_practice', focus: 'piece_development' },
          { type: 'center_control', focus: 'pawn_structure' }
        ]
      },
      'positional_understanding': {
        title: 'Positional Chess Concepts',
        description: 'Develop your understanding of pawn structure, piece coordination, and strategic planning.',
        priority: 5,
        targetWeakness: weakness,
        exercises: [
          { type: 'pawn_structure_analysis', focus: 'weak_squares' },
          { type: 'piece_activity', focus: 'coordination' }
        ]
      }
    };

    return lessonTemplates[weakness as keyof typeof lessonTemplates] || {
      title: 'General Chess Improvement',
      description: 'Work on fundamental chess skills.',
      priority: 3,
      targetWeakness: weakness,
      exercises: [{ type: 'general_practice', focus: 'all_areas' }]
    };
  }

  private calculatePriority(weakness: string, allWeaknesses: string[]): number {
    // Critical weaknesses get higher priority
    const criticalWeaknesses = ['tactical_awareness', 'king_safety'];
    const isRepeated = allWeaknesses.filter(w => w === weakness).length > 1;
    
    let priority = 5; // Base priority
    
    if (criticalWeaknesses.includes(weakness)) priority += 3;
    if (isRepeated) priority += 2;
    
    return Math.min(10, priority);
  }

  async getUserLessons(userId: number): Promise<any[]> {
    // Get dynamic lessons with current skill progress
    const userLessons = await db
      .select()
      .from(dynamicLessons)
      .where(and(
        eq(dynamicLessons.userId, userId),
        eq(dynamicLessons.isActive, true)
      ))
      .orderBy(desc(dynamicLessons.priority));

    const skillProgressData = await db
      .select()
      .from(skillProgress)
      .where(eq(skillProgress.userId, userId));

    return userLessons.map(lesson => ({
      ...lesson,
      skillProgress: skillProgressData.find(sp => sp.skillArea === lesson.targetWeakness)
    }));
  }
}

export const lessonGenerator = new LessonGenerator();