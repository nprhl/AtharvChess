import { storage } from './storage';
import type { User, Puzzle, PuzzleAttempt, InsertPuzzle } from '@shared/schema';

interface EloAssessmentResult {
  estimatedElo: number;
  confidence: number;
  recommendedDifficulty: 'beginner' | 'intermediate' | 'advanced';
}

export class PuzzleService {
  
  // Initialize default puzzles for ELO assessment
  async initializeAssessmentPuzzles() {
    const existingPuzzles = await storage.getAllPuzzles();
    if (existingPuzzles.length > 0) {
      return; // Puzzles already exist
    }

    const assessmentPuzzles: InsertPuzzle[] = [
      // Beginner puzzles (800-1200 rating)
      {
        fen: "8/8/8/8/8/2k5/r7/2K5 w - - 0 1",
        solution: [{ from: 'c1', to: 'b1' }],
        rating: 800,
        tags: ['basic', 'king safety'],
        description: "Move the king to safety"
      },
      {
        fen: "8/8/8/8/8/8/6k1/5Q1K w - - 0 1",
        solution: [{ from: 'f1', to: 'f7' }],
        rating: 900,
        tags: ['checkmate', 'queen'],
        description: "Find checkmate in one move"
      },
      {
        fen: "8/8/8/8/4r3/8/4K1k1/4Q3 w - - 0 1",
        solution: [{ from: 'e1', to: 'e4' }],
        rating: 1000,
        tags: ['capture', 'exchange'],
        description: "Capture the rook"
      },
      
      // Intermediate puzzles (1200-1600 rating)
      {
        fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1",
        solution: [{ from: 'f3', to: 'g5' }, { from: 'd8', to: 'd4' }, { from: 'c4', to: 'f7' }],
        rating: 1300,
        tags: ['tactics', 'fork'],
        description: "Find the winning knight fork"
      },
      {
        fen: "r1bq1rk1/ppp2ppp/2n1bn2/3p4/3P4/2N1PN2/PPP2PPP/R1BQKB1R w KQ - 0 1",
        solution: [{ from: 'c3', to: 'd5' }],
        rating: 1400,
        tags: ['tactics', 'discovery'],
        description: "Play the strong central move"
      },
      {
        fen: "8/1p6/p5p1/5p2/PP1k1K2/8/8/8 w - - 0 1",
        solution: [{ from: 'f4', to: 'e3' }],
        rating: 1500,
        tags: ['endgame', 'king and pawn'],
        description: "Find the winning king move"
      },
      
      // Advanced puzzles (1600+ rating)
      {
        fen: "r2q1rk1/ppp2ppp/2n1bn2/2bpp3/3PP3/2N1BN2/PPPB1PPP/R2Q1RK1 w - - 0 1",
        solution: [{ from: 'e4', to: 'd5' }, { from: 'c6', to: 'd4' }, { from: 'd5', to: 'e6' }],
        rating: 1700,
        tags: ['positional', 'pawn break'],
        description: "Break through in the center"
      },
      {
        fen: "2rq1rk1/1p2bppp/p2p1n2/4p3/4P3/1BP2N2/PP3PPP/R1BQR1K1 w - - 0 1",
        solution: [{ from: 'c3', to: 'd5' }, { from: 'e7', to: 'd8' }, { from: 'd5', to: 'f6' }],
        rating: 1800,
        tags: ['sacrifice', 'attack'],
        description: "Sacrifice for a winning attack"
      },
      {
        fen: "8/2p2k2/3p1p2/1p1P1P2/pP2K3/P7/8/8 w - - 0 1",
        solution: [{ from: 'e4', to: 'd3' }],
        rating: 1900,
        tags: ['endgame', 'zugzwang'],
        description: "Find the precise king move"
      }
    ];

    for (const puzzle of assessmentPuzzles) {
      await storage.createPuzzle(puzzle);
    }
  }

  // Get puzzles for ELO assessment (varies by estimated skill)
  async getAssessmentPuzzles(estimatedElo: number = 1200): Promise<Puzzle[]> {
    await this.initializeAssessmentPuzzles();
    
    // Select puzzles around the estimated ELO range
    const minRating = Math.max(800, estimatedElo - 200);
    const maxRating = Math.min(2000, estimatedElo + 200);
    
    // Note: This is a simplified version - in production you'd want proper range queries
    const allPuzzles = await storage.getAllPuzzles();
    return allPuzzles.filter(puzzle => 
      puzzle.rating >= minRating && puzzle.rating <= maxRating
    ).slice(0, 5); // Return 5 puzzles for assessment
  }

  // Calculate ELO rating based on puzzle performance
  calculateEloFromPuzzles(attempts: PuzzleAttempt[], puzzles: Puzzle[]): EloAssessmentResult {
    if (attempts.length === 0) {
      return {
        estimatedElo: 1200,
        confidence: 0,
        recommendedDifficulty: 'beginner'
      };
    }

    let totalRatingPoints = 0;
    let totalWeight = 0;

    for (const attempt of attempts) {
      const puzzle = puzzles.find(p => p.id === attempt.puzzleId);
      if (!puzzle) continue;

      let weight = 1.0;
      let ratingContribution = puzzle.rating;

      if (attempt.solved) {
        // Solved puzzles contribute positively
        if (attempt.timeSpent && attempt.timeSpent < 30) {
          weight = 1.5; // Quick solve gets bonus
        }
        ratingContribution += 50; // Bonus for solving
      } else {
        // Failed puzzles reduce the contribution
        ratingContribution -= 100;
        weight = 0.8;
      }

      totalRatingPoints += ratingContribution * weight;
      totalWeight += weight;
    }

    const estimatedElo = Math.round(totalRatingPoints / totalWeight);
    const confidence = Math.min(attempts.length / 5, 1); // Max confidence after 5 puzzles
    
    let recommendedDifficulty: 'beginner' | 'intermediate' | 'advanced';
    if (estimatedElo < 1000) {
      recommendedDifficulty = 'beginner';
    } else if (estimatedElo < 1400) {
      recommendedDifficulty = 'intermediate';
    } else {
      recommendedDifficulty = 'advanced';
    }

    return {
      estimatedElo: Math.max(800, Math.min(2000, estimatedElo)),
      confidence,
      recommendedDifficulty
    };
  }

  // Get AI-recommended lessons based on ELO and performance
  async getRecommendedLessons(userId: number, userElo: number): Promise<any[]> {
    const userProgress = await storage.getUserLessonProgress(userId);
    const completedLessonIds = userProgress
      .filter(p => p.completed)
      .map(p => p.lessonId);

    // AI-driven lesson filtering based on ELO rating
    const allLessons = await storage.getAllLessons();
    const skillAnalysis = this.analyzeUserSkillLevel(userElo);
    
    console.log(`User ELO: ${userElo}, Skill Analysis:`, skillAnalysis);
    
    // Filter lessons based on skill level and prerequisites
    const appropriateLessons = allLessons.filter(lesson => {
      // Skip completed lessons
      if (completedLessonIds.includes(lesson.id)) {
        return false;
      }
      
      // Apply AI-driven filtering logic
      return this.isLessonAppropriate(lesson, skillAnalysis, userElo);
    });

    // Sort lessons by priority for user's skill level
    const prioritizedLessons = this.prioritizeLessonsForUser(appropriateLessons, skillAnalysis, userElo);
    
    // Return recommended lessons (limit based on skill level)
    const maxLessons = userElo > 1200 ? 5 : 8; // Advanced players see fewer, focused lessons
    return prioritizedLessons.slice(0, maxLessons);
  }

  // Analyze user's chess skill level based on ELO
  private analyzeUserSkillLevel(elo: number) {
    if (elo < 800) {
      return {
        level: 'absolute_beginner',
        needsBasics: true,
        canHandleComplex: false,
        focus: ['piece_movement', 'basic_rules', 'simple_tactics']
      };
    } else if (elo < 1000) {
      return {
        level: 'beginner',
        needsBasics: true,
        canHandleComplex: false,
        focus: ['piece_coordination', 'basic_tactics', 'simple_endgames']
      };
    } else if (elo < 1200) {
      return {
        level: 'advanced_beginner',
        needsBasics: false,
        canHandleComplex: true,
        focus: ['tactics', 'opening_principles', 'endgame_basics']
      };
    } else if (elo < 1500) {
      return {
        level: 'intermediate',
        needsBasics: false,
        canHandleComplex: true,
        focus: ['advanced_tactics', 'positional_play', 'complex_endgames']
      };
    } else {
      return {
        level: 'advanced',
        needsBasics: false,
        canHandleComplex: true,
        focus: ['strategic_concepts', 'advanced_endgames', 'opening_theory']
      };
    }
  }

  // Check if a lesson is appropriate for the user's skill level
  private isLessonAppropriate(lesson: any, skillAnalysis: any, userElo: number): boolean {
    const title = lesson.title.toLowerCase();
    const description = lesson.description.toLowerCase();
    const difficulty = lesson.difficulty;
    
    // For very basic lessons (ELO > 1000 shouldn't see these)
    const veryBasicTopics = [
      'basic pawn moves', 'how pieces move', 'basic chess pieces', 
      'piece movement', 'setting up the board'
    ];
    
    const isVeryBasic = veryBasicTopics.some(topic => 
      title.includes(topic) || description.includes(topic)
    );
    
    if (isVeryBasic && userElo > 1000) {
      return false; // Skip very basic lessons for experienced players
    }
    
    // For advanced players (ELO > 1200), skip beginner lessons
    if (difficulty === 'beginner' && userElo > 1200) {
      return false;
    }
    
    // For beginners (ELO < 1000), skip advanced lessons
    if (difficulty === 'advanced' && userElo < 1000) {
      return false;
    }
    
    // Check if lesson topics match user's focus areas
    const lessonContent = `${title} ${description}`.toLowerCase();
    const hasRelevantContent = skillAnalysis.focus.some((focus: string) => 
      lessonContent.includes(focus.replace('_', ' '))
    );
    
    return hasRelevantContent || difficulty === 'intermediate'; // Always include intermediate lessons
  }

  // Prioritize lessons based on user's skill level and needs
  private prioritizeLessonsForUser(lessons: any[], skillAnalysis: any, userElo: number): any[] {
    return lessons.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      
      // Priority scoring based on skill analysis
      const contentA = `${a.title} ${a.description}`.toLowerCase();
      const contentB = `${b.title} ${b.description}`.toLowerCase();
      
      // Score based on focus areas
      skillAnalysis.focus.forEach((focus: string, index: number) => {
        const priority = skillAnalysis.focus.length - index; // Higher priority for earlier focus items
        
        if (contentA.includes(focus.replace('_', ' '))) {
          scoreA += priority * 10;
        }
        if (contentB.includes(focus.replace('_', ' '))) {
          scoreB += priority * 10;
        }
      });
      
      // Difficulty-based scoring
      const difficultyPriority = {
        'beginner': userElo < 1000 ? 5 : (userElo < 1200 ? 2 : 0),
        'intermediate': userElo > 800 ? 8 : 3,
        'advanced': userElo > 1200 ? 10 : (userElo > 1000 ? 3 : 0)
      };
      
      scoreA += difficultyPriority[a.difficulty as keyof typeof difficultyPriority] || 0;
      scoreB += difficultyPriority[b.difficulty as keyof typeof difficultyPriority] || 0;
      
      // Tactical lessons get priority for intermediate players
      if (userElo >= 1000 && userElo <= 1400) {
        if (contentA.includes('tactic')) scoreA += 15;
        if (contentB.includes('tactic')) scoreB += 15;
      }
      
      return scoreB - scoreA; // Sort by highest score first
    });
  }

  // Calculate final assessment ELO based on all user's puzzle attempts
  async calculateAssessmentElo(userId: number): Promise<EloAssessmentResult> {
    const allAttempts = await storage.getUserPuzzleAttempts(userId);
    const allPuzzles = await storage.getAllPuzzles();
    
    console.log(`Calculating ELO for user ${userId} with ${allAttempts.length} attempts`);
    
    return this.calculateEloFromPuzzles(allAttempts, allPuzzles);
  }

  // Record puzzle attempt and update user ELO if needed
  async recordPuzzleAttempt(
    userId: number, 
    puzzleId: number, 
    solved: boolean, 
    timeSpent: number,
    attemptedMoves: any[]
  ): Promise<{ attempt: PuzzleAttempt; eloUpdate?: number }> {
    
    const attempt = await storage.createPuzzleAttempt({
      userId,
      puzzleId,
      solved,
      timeSpent,
      attemptedMoves
    });

    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // If user hasn't been calibrated yet, check if we have enough attempts
    if (!user.isEloCalibrated) {
      const allAttempts = await storage.getUserPuzzleAttempts(userId);
      
      if (allAttempts.length >= 5) {
        // Calculate ELO from all attempts
        const allPuzzles = await storage.getAllPuzzles();
        const eloResult = this.calculateEloFromPuzzles(allAttempts, allPuzzles);
        
        // Update user with calculated ELO
        await storage.updateUser(userId, {
          eloRating: eloResult.estimatedElo,
          isEloCalibrated: true
        });

        return { attempt, eloUpdate: eloResult.estimatedElo };
      }
    }

    return { attempt };
  }
}

export const puzzleService = new PuzzleService();