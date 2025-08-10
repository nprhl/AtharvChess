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

  // Get recommended lessons based on ELO and performance
  async getRecommendedLessons(userId: number, userElo: number): Promise<any[]> {
    const userProgress = await storage.getUserLessonProgress(userId);
    const completedLessonIds = userProgress
      .filter(p => p.completed)
      .map(p => p.lessonId);

    let difficulty: string;
    if (userElo < 1000) {
      difficulty = 'beginner';
    } else if (userElo < 1400) {
      difficulty = 'intermediate';
    } else {
      difficulty = 'advanced';
    }

    const lessonsForDifficulty = await storage.getLessonsByDifficulty(difficulty);
    
    // Filter out completed lessons and return next recommendations
    const recommendedLessons = lessonsForDifficulty
      .filter(lesson => !completedLessonIds.includes(lesson.id))
      .slice(0, 3); // Return top 3 recommendations

    return recommendedLessons;
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