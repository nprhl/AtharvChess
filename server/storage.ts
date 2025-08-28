import { 
  users, games, lessons, userLessonProgress, settings, puzzles, puzzleAttempts,
  dailyTips, userTipProgress, organizations, userRoles, teams, teamMembers,
  tournaments, tournamentSections, registrations, rounds, pairings, tournamentGames,
  appeals, ratingSnapshots, certificates, notifications,
  type User, type UpsertUser, type InsertUser, type Game, type InsertGame,
  type Lesson, type InsertLesson, type UserLessonProgress, 
  type InsertUserLessonProgress, type Settings, type InsertSettings,
  type Puzzle, type InsertPuzzle, type PuzzleAttempt, type InsertPuzzleAttempt,
  type Organization, type InsertOrganization, type Tournament, type InsertTournament
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Games
  getGamesByUserId(userId: number): Promise<Game[]>;
  createGame(game: InsertGame): Promise<Game>;

  // Lessons
  getAllLessons(): Promise<Lesson[]>;
  getLessonById(id: number): Promise<Lesson | undefined>;
  getLessonsByDifficulty(difficulty: string): Promise<Lesson[]>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;

  // User Lesson Progress
  getUserLessonProgress(userId: number): Promise<UserLessonProgress[]>;
  updateUserLessonProgress(userId: number, lessonId: number, progress: Partial<InsertUserLessonProgress>): Promise<UserLessonProgress>;

  // Puzzles
  getAllPuzzles(): Promise<Puzzle[]>;
  getPuzzlesByRatingRange(minRating: number, maxRating: number): Promise<Puzzle[]>;
  createPuzzle(puzzle: InsertPuzzle): Promise<Puzzle>;

  // Puzzle Attempts
  getUserPuzzleAttempts(userId: number): Promise<PuzzleAttempt[]>;
  createPuzzleAttempt(attempt: InsertPuzzleAttempt): Promise<PuzzleAttempt>;

  // Settings
  getUserSettings(userId: number): Promise<Settings | undefined>;
  updateUserSettings(userId: number, settings: Partial<InsertSettings>): Promise<Settings>;

  // Daily Tips
  getTodaysTip(difficulty?: string): Promise<any>;
  getTipById(id: number): Promise<any>;
  getTipsByCategory(category: string, difficulty?: string): Promise<any[]>;
  getRecentTips(limit?: number): Promise<any[]>;
  markTipAsViewed(userId: number, tipId: number): Promise<void>;
  markTipAsCompleted(userId: number, tipId: number): Promise<void>;
  bookmarkTip(userId: number, tipId: number, bookmarked: boolean): Promise<void>;
  rateTip(userId: number, tipId: number, rating: number): Promise<void>;
  getUserTipProgress(userId: number): Promise<any[]>;
  getUserBookmarkedTips(userId: number): Promise<any[]>;

  // Tournament System
  // Organizations
  createOrganization(data: InsertOrganization): Promise<Organization>;
  getOrganization(id: number): Promise<Organization | undefined>;
  updateOrganization(id: number, updates: Partial<Organization>): Promise<Organization | undefined>;
  getOrganizations(filters?: any): Promise<Organization[]>;

  // User Roles
  assignUserRole(userId: number, role: string, scope?: string, grantedBy?: number): Promise<any>;
  getUserRoles(userId: number): Promise<any[]>;
  revokeUserRole(userId: number, role: string, scope?: string): Promise<boolean>;

  // Tournaments
  createTournament(data: InsertTournament): Promise<Tournament>;
  getTournament(id: number): Promise<Tournament | undefined>;
  updateTournament(id: number, updates: Partial<Tournament>): Promise<Tournament | undefined>;
  getTournaments(filters?: any): Promise<Tournament[]>;
}

export class DatabaseStorage implements IStorage {
  private initialized = false;

  constructor() {
    // Async initialization will be handled separately
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Initialize with default content
      await this.initializeDefaultLessons();
      await this.initializeDefaultTips();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      // Don't rethrow - allow app to start even if initialization fails
    }
  }

  private async initializeDefaultLessons() {
    const existingLessons = await this.getAllLessons();
    if (existingLessons.length > 0) {
      return; // Lessons already exist
    }

    const defaultLessons: InsertLesson[] = [
      {
        title: "Basic Pawn Moves",
        description: "Master pawn movement, captures, and special rules like en passant",
        difficulty: "beginner",
        content: {
          sections: [
            {
              title: "How Pawns Move",
              type: "explanation",
              content: "Pawns are unique pieces that move forward one square at a time. However, on their first move, they can choose to advance two squares forward."
            },
            {
              title: "Pawn Captures",
              type: "explanation", 
              content: "Unlike other pieces, pawns capture differently from how they move. Pawns capture diagonally forward, one square at a time."
            },
            {
              title: "Interactive Practice",
              type: "interactive",
              content: {
                fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                instruction: "Move the white pawn in front of your king two squares forward",
                correctMoves: ["e2e4"],
                hints: ["Pawns can move two squares on their first move", "Look for the pawn in front of the white king"]
              }
            },
            {
              title: "En Passant Rule",
              type: "explanation",
              content: "When an opponent's pawn moves two squares forward and lands next to your pawn, you can capture it 'en passant' - as if it had only moved one square."
            }
          ],
          objectives: [
            "Move pawns forward one or two squares",
            "Capture opponent pieces diagonally",
            "Understand en passant captures"
          ],
          difficulty: 1,
          estimatedTime: "5-8 minutes"
        },
        order: 1
      },
      {
        title: "Rook Power Play",
        description: "Master the rook's linear movement and tactical applications",
        difficulty: "beginner",
        content: {
          sections: [
            {
              title: "Rook Movement Basics",
              type: "explanation",
              content: "Rooks move horizontally and vertically any number of squares. They're powerful pieces that control entire ranks and files when positioned well."
            },
            {
              title: "Rook vs Pieces",
              type: "interactive",
              content: {
                fen: "4k3/8/8/8/3r4/8/8/3RK3 w - - 0 1",
                instruction: "Move your rook to attack the black rook",
                correctMoves: ["d1d4"],
                hints: ["Rooks attack along ranks and files", "Your rook can move vertically to attack"]
              }
            },
            {
              title: "Controlling Open Files",
              type: "explanation",
              content: "Rooks are most powerful on open files (columns with no pawns). They can control the entire file and create threats against the opponent's position."
            },
            {
              title: "Rook Practice",
              type: "interactive",
              content: {
                fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
                instruction: "Move your rook to control the center file",
                correctMoves: ["a1d1", "h1d1"],
                hints: ["Open files give rooks maximum power", "The d-file is completely open"]
              }
            }
          ],
          objectives: [
            "Move rooks along ranks and files", 
            "Control open files and ranks",
            "Attack opponent pieces with rooks"
          ],
          difficulty: 2,
          estimatedTime: "8-12 minutes"
        },
        order: 2
      },
      {
        title: "Bishop Mastery",
        description: "Learn diagonal domination and bishop pair coordination", 
        difficulty: "beginner",
        content: {
          sections: [
            {
              title: "Diagonal Movement",
              type: "explanation",
              content: "Bishops move diagonally any number of squares. Each bishop is restricted to squares of one color throughout the entire game."
            },
            {
              title: "Light vs Dark Bishops",
              type: "explanation",
              content: "You start with one light-squared bishop and one dark-squared bishop. Together, they can control squares of both colors, making the 'bishop pair' very powerful."
            },
            {
              title: "Bishop Positioning",
              type: "interactive", 
              content: {
                fen: "4k3/8/8/8/8/8/8/3BKB2 w - - 0 1",
                instruction: "Move the bishop to control the long diagonal",
                correctMoves: ["d1h5", "f1h3"],
                hints: ["Long diagonals give bishops maximum scope", "Look for diagonals that cut across the board"]
              }
            },
            {
              title: "Bishop vs Knight",
              type: "explanation",
              content: "Bishops are better in open positions with long diagonals, while knights excel in closed positions with lots of pieces."
            }
          ],
          objectives: [
            "Move bishops diagonally",
            "Control long diagonals", 
            "Coordinate bishop pairs effectively"
          ],
          difficulty: 2,
          estimatedTime: "6-10 minutes"
        },
        order: 3
      },
      {
        title: "Knight Tactics",
        description: "Master the knight's unique L-shaped movement and tactical patterns",
        difficulty: "intermediate", 
        content: {
          sections: [
            {
              title: "The Knight's L-Shape",
              type: "explanation",
              content: "Knights move in an L-shape: two squares in one direction, then one square perpendicular. This unique movement allows them to jump over other pieces."
            },
            {
              title: "Knight Jumps",
              type: "interactive",
              content: {
                fen: "4k3/8/8/8/3N4/8/8/4K3 w - - 0 1", 
                instruction: "Move the knight to show its L-shaped movement",
                correctMoves: ["d4c6", "d4e6", "d4f5", "d4f3", "d4e2", "d4c2", "d4b3", "d4b5"],
                hints: ["Knights move in an L: 2+1 or 1+2 squares", "Knights can jump over pieces"]
              }
            },
            {
              title: "Knight Forks",
              type: "explanation",
              content: "A knight fork occurs when a knight attacks two or more enemy pieces simultaneously. This is one of the most powerful knight tactics."
            },
            {
              title: "Fork Practice",
              type: "interactive",
              content: {
                fen: "8/8/8/8/8/5k2/8/3N1K2 w - - 0 1",
                instruction: "Move the knight to fork the king and create a winning position",
                correctMoves: ["d1e3"],
                hints: ["Look for a square where the knight attacks multiple pieces", "Knight forks are devastating tactical weapons"]
              }
            }
          ],
          objectives: [
            "Execute L-shaped knight moves",
            "Jump over pieces with knights",
            "Create knight forks and tactical threats"
          ],
          difficulty: 3,
          estimatedTime: "10-15 minutes"
        },
        order: 4
      },
      {
        title: "Queen Power",
        description: "Unleash the queen's tremendous power and learn proper queen usage",
        difficulty: "intermediate",
        content: {
          sections: [
            {
              title: "Queen Movement",
              type: "explanation", 
              content: "The queen is the most powerful piece, combining the movement of both rook and bishop. She can move any number of squares horizontally, vertically, or diagonally."
            },
            {
              title: "Queen Activity",
              type: "interactive",
              content: {
                fen: "4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1",
                instruction: "Show the queen's versatile movement by moving to different squares",
                correctMoves: ["d4a1", "d4h8", "d4d8", "d4a4", "d4f6"],
                hints: ["Queens combine rook and bishop movements", "Queens can move in 8 directions"]
              }
            },
            {
              title: "Queen Safety",
              type: "explanation",
              content: "While powerful, the queen is also valuable and must be protected. Avoid bringing the queen out too early in the game when she can be attacked by less valuable pieces."
            },
            {
              title: "Queen vs Multiple Pieces",
              type: "interactive",
              content: {
                fen: "4k3/8/8/2r1r3/3Q4/8/8/4K3 w - - 0 1",
                instruction: "Move the queen to a safe square where she's not attacked",
                correctMoves: ["d4a1", "d4h8", "d4b2", "d4f6"],
                hints: ["The queen is attacked by both rooks", "Find a square not on the same rank or file as the rooks"]
              }
            }
          ],
          objectives: [
            "Use queen's combined rook-bishop movement",
            "Keep the queen safe from attacks",
            "Maximize queen activity in middlegame"
          ],
          difficulty: 3,
          estimatedTime: "8-12 minutes"
        },
        order: 5
      },
      {
        title: "King Safety Essentials", 
        description: "Learn king movement, castling, and endgame king activity",
        difficulty: "beginner",
        content: {
          sections: [
            {
              title: "King Movement",
              type: "explanation",
              content: "The king moves one square in any direction: horizontally, vertically, or diagonally. The king is the most important piece - if captured, the game is over."
            },
            {
              title: "Castling Rules",
              type: "explanation",
              content: "Castling is a special move that allows you to move both king and rook simultaneously. It's the only move that allows you to move two pieces at once, and it helps keep your king safe."
            },
            {
              title: "Castling Practice",
              type: "interactive",
              content: {
                fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
                instruction: "Castle your king to safety",
                correctMoves: ["e1g1", "e1c1"],
                hints: ["Castling moves king 2 squares toward rook", "Kingside castling is short castling"]
              }
            },
            {
              title: "King in Endgame",
              type: "explanation",
              content: "In the endgame when few pieces remain, the king becomes an active piece. It should help advance pawns and control key squares."
            }
          ],
          objectives: [
            "Move the king safely one square at a time",
            "Execute castling for king safety", 
            "Activate the king in endgames"
          ],
          difficulty: 2,
          estimatedTime: "7-10 minutes"
        },
        order: 6
      }
    ];

    for (const lesson of defaultLessons) {
      await this.createLesson(lesson);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Note: username field removed for Replit Auth
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();

    // Create default settings for new user
    await db.insert(settings).values({
      userId: parseInt(user.id), // Convert string ID to number for settings
      hintsEnabled: true,
      focusMode: false,
      progressTracking: true,
      dailyPlayTime: 30,
      breakReminders: 15,
      difficulty: 'beginner',
      autoAdjustDifficulty: true
    });

    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: userData,
      })
      .returning();
    return user;
  }

  async getGamesByUserId(userId: number): Promise<Game[]> {
    return await db.select().from(games).where(eq(games.userId, userId));
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const [game] = await db
      .insert(games)
      .values(insertGame)
      .returning();
    return game;
  }

  async getAllLessons(): Promise<Lesson[]> {
    return await db.select().from(lessons).orderBy(lessons.order);
  }

  async getLessonById(id: number): Promise<Lesson | undefined> {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id));
    return lesson || undefined;
  }

  async getLessonsByDifficulty(difficulty: string): Promise<Lesson[]> {
    return await db.select().from(lessons)
      .where(eq(lessons.difficulty, difficulty))
      .orderBy(lessons.order);
  }

  async createLesson(insertLesson: InsertLesson): Promise<Lesson> {
    const [lesson] = await db
      .insert(lessons)
      .values(insertLesson)
      .returning();
    return lesson;
  }

  async getUserLessonProgress(userId: number): Promise<UserLessonProgress[]> {
    return await db.select().from(userLessonProgress).where(eq(userLessonProgress.userId, userId));
  }

  async updateUserLessonProgress(
    userId: number, 
    lessonId: number, 
    progressUpdate: Partial<InsertUserLessonProgress>
  ): Promise<UserLessonProgress> {
    const [existing] = await db
      .select()
      .from(userLessonProgress)
      .where(and(
        eq(userLessonProgress.userId, userId),
        eq(userLessonProgress.lessonId, lessonId)
      ));
    
    if (existing) {
      const updateData: any = { ...progressUpdate };
      if (progressUpdate.completed && !existing.completedAt) {
        updateData.completedAt = new Date();
      }
      
      const [progress] = await db
        .update(userLessonProgress)
        .set(updateData)
        .where(and(
          eq(userLessonProgress.userId, userId),
          eq(userLessonProgress.lessonId, lessonId)
        ))
        .returning();
      return progress;
    } else {
      const insertData: any = {
        userId,
        lessonId,
        completed: false,
        score: null,
        completedAt: null,
        ...progressUpdate
      };
      
      if (progressUpdate.completed && !insertData.completedAt) {
        insertData.completedAt = new Date();
      }
      
      const [progress] = await db
        .insert(userLessonProgress)
        .values(insertData)
        .returning();
      return progress;
    }
  }

  async getUserSettings(userId: number): Promise<Settings | undefined> {
    const [userSettings] = await db.select().from(settings).where(eq(settings.userId, userId));
    return userSettings || undefined;
  }

  async updateUserSettings(userId: number, settingsUpdate: Partial<InsertSettings>): Promise<Settings> {
    const [existing] = await db.select().from(settings).where(eq(settings.userId, userId));
    
    if (existing) {
      const [updatedSettings] = await db
        .update(settings)
        .set(settingsUpdate)
        .where(eq(settings.userId, userId))
        .returning();
      return updatedSettings;
    } else {
      const [newSettings] = await db
        .insert(settings)
        .values({
          userId,
          hintsEnabled: true,
          focusMode: false,
          progressTracking: true,
          dailyPlayTime: 30,
          breakReminders: 15,
          difficulty: 'beginner',
          autoAdjustDifficulty: true,
          ...settingsUpdate
        })
        .returning();
      return newSettings;
    }
  }

  async getAllPuzzles(): Promise<Puzzle[]> {
    return await db.select().from(puzzles).orderBy(puzzles.rating);
  }

  async getPuzzlesByRatingRange(minRating: number, maxRating: number): Promise<Puzzle[]> {
    return await db.select().from(puzzles)
      .where(and(
        eq(puzzles.rating, minRating), // This should be gte when available
        eq(puzzles.rating, maxRating)  // This should be lte when available
      ));
  }

  async createPuzzle(insertPuzzle: InsertPuzzle): Promise<Puzzle> {
    const [puzzle] = await db
      .insert(puzzles)
      .values(insertPuzzle)
      .returning();
    return puzzle;
  }

  async getUserPuzzleAttempts(userId: number): Promise<PuzzleAttempt[]> {
    return await db.select().from(puzzleAttempts)
      .where(eq(puzzleAttempts.userId, userId))
      .orderBy(desc(puzzleAttempts.createdAt));
  }

  async createPuzzleAttempt(insertAttempt: InsertPuzzleAttempt): Promise<PuzzleAttempt> {
    const [attempt] = await db
      .insert(puzzleAttempts)
      .values(insertAttempt)
      .returning();
    return attempt;
  }

  // Daily Tips Implementation
  async getTodaysTip(difficulty?: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let whereConditions = [eq(dailyTips.isActive, true)];
    
    if (difficulty) {
      whereConditions.push(eq(dailyTips.difficulty, difficulty));
    }

    const tips = await db.select()
      .from(dailyTips)
      .where(and(...whereConditions))
      .orderBy(dailyTips.publishDate)
      .limit(1);
      
    return tips[0] || null;
  }

  async getTipById(id: number): Promise<any> {
    const [tip] = await db.select().from(dailyTips).where(eq(dailyTips.id, id));
    return tip || null;
  }

  async getTipsByCategory(category: string, difficulty?: string): Promise<any[]> {
    let whereConditions = [
      eq(dailyTips.category, category),
      eq(dailyTips.isActive, true)
    ];

    if (difficulty) {
      whereConditions.push(eq(dailyTips.difficulty, difficulty));
    }

    return await db.select()
      .from(dailyTips)
      .where(and(...whereConditions))
      .orderBy(desc(dailyTips.publishDate));
  }

  async getRecentTips(limit: number = 10): Promise<any[]> {
    return await db.select()
      .from(dailyTips)
      .where(eq(dailyTips.isActive, true))
      .orderBy(desc(dailyTips.publishDate))
      .limit(limit);
  }

  async markTipAsViewed(userId: number, tipId: number): Promise<void> {
    const [existing] = await db.select()
      .from(userTipProgress)
      .where(and(
        eq(userTipProgress.userId, userId),
        eq(userTipProgress.tipId, tipId)
      ));

    if (!existing) {
      await db.insert(userTipProgress).values({
        userId,
        tipId,
        completed: false,
        bookmarked: false,
      });
    }
  }

  async markTipAsCompleted(userId: number, tipId: number): Promise<void> {
    const [existing] = await db.select()
      .from(userTipProgress)
      .where(and(
        eq(userTipProgress.userId, userId),
        eq(userTipProgress.tipId, tipId)
      ));

    if (existing) {
      await db.update(userTipProgress)
        .set({ 
          completed: true, 
          completedAt: new Date() 
        })
        .where(and(
          eq(userTipProgress.userId, userId),
          eq(userTipProgress.tipId, tipId)
        ));
    } else {
      await db.insert(userTipProgress).values({
        userId,
        tipId,
        completed: true,
        completedAt: new Date(),
        bookmarked: false,
      });
    }
  }

  async bookmarkTip(userId: number, tipId: number, bookmarked: boolean): Promise<void> {
    const [existing] = await db.select()
      .from(userTipProgress)
      .where(and(
        eq(userTipProgress.userId, userId),
        eq(userTipProgress.tipId, tipId)
      ));

    if (existing) {
      await db.update(userTipProgress)
        .set({ bookmarked })
        .where(and(
          eq(userTipProgress.userId, userId),
          eq(userTipProgress.tipId, tipId)
        ));
    } else {
      await db.insert(userTipProgress).values({
        userId,
        tipId,
        completed: false,
        bookmarked,
      });
    }
  }

  async rateTip(userId: number, tipId: number, rating: number): Promise<void> {
    const [existing] = await db.select()
      .from(userTipProgress)
      .where(and(
        eq(userTipProgress.userId, userId),
        eq(userTipProgress.tipId, tipId)
      ));

    if (existing) {
      await db.update(userTipProgress)
        .set({ rating })
        .where(and(
          eq(userTipProgress.userId, userId),
          eq(userTipProgress.tipId, tipId)
        ));
    } else {
      await db.insert(userTipProgress).values({
        userId,
        tipId,
        completed: false,
        bookmarked: false,
        rating,
      });
    }
  }

  async getUserTipProgress(userId: number): Promise<any[]> {
    return await db.select({
      id: userTipProgress.id,
      tipId: userTipProgress.tipId,
      completed: userTipProgress.completed,
      bookmarked: userTipProgress.bookmarked,
      rating: userTipProgress.rating,
      viewedAt: userTipProgress.viewedAt,
      completedAt: userTipProgress.completedAt,
      title: dailyTips.title,
      category: dailyTips.category,
      difficulty: dailyTips.difficulty,
      estimatedReadTime: dailyTips.estimatedReadTime,
    })
    .from(userTipProgress)
    .innerJoin(dailyTips, eq(userTipProgress.tipId, dailyTips.id))
    .where(eq(userTipProgress.userId, userId))
    .orderBy(desc(userTipProgress.viewedAt));
  }

  async getUserBookmarkedTips(userId: number): Promise<any[]> {
    return await db.select({
      id: dailyTips.id,
      title: dailyTips.title,
      content: dailyTips.content,
      category: dailyTips.category,
      difficulty: dailyTips.difficulty,
      fen: dailyTips.fen,
      moves: dailyTips.moves,
      estimatedReadTime: dailyTips.estimatedReadTime,
      tags: dailyTips.tags,
      publishDate: dailyTips.publishDate,
      bookmarkedAt: userTipProgress.viewedAt,
    })
    .from(userTipProgress)
    .innerJoin(dailyTips, eq(userTipProgress.tipId, dailyTips.id))
    .where(and(
      eq(userTipProgress.userId, userId),
      eq(userTipProgress.bookmarked, true)
    ))
    .orderBy(desc(userTipProgress.viewedAt));
  }

  private async initializeDefaultTips() {
    const existingTips = await this.getRecentTips(1);
    if (existingTips.length > 0) {
      return; // Tips already exist
    }

    const defaultTips = [
      {
        title: "Control the Center",
        content: "The center squares (e4, e5, d4, d5) are the most important on the chessboard. Controlling them with pawns and pieces gives you more mobility and attacking chances. Think of the center as the highway of the chessboard - whoever controls it controls the game's tempo.",
        category: "strategy",
        difficulty: "beginner",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        moves: [{"from": "e2", "to": "e4"}, {"from": "e7", "to": "e5"}, {"from": "d2", "to": "d4"}, {"from": "d7", "to": "d6"}],
        estimatedReadTime: 30,
        tags: ["center", "strategy", "opening"],
        publishDate: new Date("2025-08-12"),
      },
      {
        title: "Knight Forks Win Material",
        content: "A knight fork attacks two or more pieces simultaneously. Look for opportunities to place your knight where it can attack the enemy king and another valuable piece. The L-shaped movement of knights makes them perfect for creating these devastating tactical shots.",
        category: "tactics",
        difficulty: "beginner",
        fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1",
        moves: [{"from": "f3", "to": "e5"}, {"from": "c6", "to": "e5"}],
        estimatedReadTime: 25,
        tags: ["tactics", "knight", "fork"],
        publishDate: new Date("2025-08-13"),
      },
      {
        title: "Opposition in King and Pawn Endgames",
        content: "In king and pawn endgames, having the 'opposition' means your king faces the opponent's king with one square between them, and it's their turn to move. This forces their king to give way, allowing you to advance and promote your pawn.",
        category: "endgame",
        difficulty: "intermediate",
        fen: "8/8/8/3k4/3P4/3K4/8/8 w - - 0 1",
        moves: [{"from": "d3", "to": "d2"}],
        estimatedReadTime: 35,
        tags: ["endgame", "opposition", "king"],
        publishDate: new Date("2025-08-14"),
      },
      {
        title: "Develop Knights Before Bishops",
        content: "Knights have only one good square in the opening, while bishops have multiple options. Develop your knights to f3 and c3 (for White) early to control the center and prepare for castling. This principle helps you avoid blocking in your bishops.",
        category: "opening",
        difficulty: "beginner",
        fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        moves: [{"from": "g1", "to": "f3"}, {"from": "b1", "to": "c3"}],
        estimatedReadTime: 28,
        tags: ["opening", "development", "knights"],
        publishDate: new Date("2025-08-15"),
      },
      {
        title: "Think Before You Move",
        content: "Chess is won and lost in the mind. Before each move, ask yourself: What is my opponent threatening? What are my candidate moves? What will happen after I play this move? Taking just 10 extra seconds to think can prevent blunders and find better moves.",
        category: "psychology",
        difficulty: "beginner",
        estimatedReadTime: 20,
        tags: ["thinking", "process", "improvement"],
        publishDate: new Date("2025-08-16"),
      }
    ];

    for (const tip of defaultTips) {
      await db.insert(dailyTips).values(tip);
    }
  }

  // ==================== TOURNAMENT SYSTEM IMPLEMENTATION ====================

  // Organization methods
  async createOrganization(data: InsertOrganization): Promise<Organization> {
    const [organization] = await db
      .insert(organizations)
      .values(data)
      .returning();
    return organization;
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    return organization || undefined;
  }

  async updateOrganization(id: number, updates: Partial<Organization>): Promise<Organization | undefined> {
    const [organization] = await db
      .update(organizations)
      .set(updates)
      .where(eq(organizations.id, id))
      .returning();
    return organization || undefined;
  }

  async getOrganizations(filters: any = {}): Promise<Organization[]> {
    let query = db.select().from(organizations);
    
    if (filters.type) {
      query = query.where(eq(organizations.type, filters.type));
    }
    
    if (filters.isVerified !== undefined) {
      query = query.where(eq(organizations.isVerified, filters.isVerified));
    }
    
    return await query;
  }

  // User role methods
  async assignUserRole(userId: number, role: string, scope?: string, grantedBy?: number): Promise<any> {
    const [userRole] = await db
      .insert(userRoles)
      .values({
        userId,
        role,
        scope: scope || 'global',
        grantedBy,
        isActive: true
      })
      .returning();
    return userRole;
  }

  async getUserRoles(userId: number): Promise<any[]> {
    return await db
      .select()
      .from(userRoles)
      .where(and(
        eq(userRoles.userId, userId),
        eq(userRoles.isActive, true)
      ));
  }

  async revokeUserRole(userId: number, role: string, scope?: string): Promise<boolean> {
    try {
      await db
        .update(userRoles)
        .set({ isActive: false })
        .where(and(
          eq(userRoles.userId, userId),
          eq(userRoles.role, role),
          scope ? eq(userRoles.scope, scope) : eq(userRoles.scope, 'global')
        ));
      return true;
    } catch (error) {
      console.error('Error revoking user role:', error);
      return false;
    }
  }

  // Tournament methods
  async createTournament(data: InsertTournament): Promise<Tournament> {
    const [tournament] = await db
      .insert(tournaments)
      .values(data)
      .returning();
    return tournament;
  }

  async getTournament(id: number): Promise<Tournament | undefined> {
    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id));
    return tournament || undefined;
  }

  async updateTournament(id: number, updates: Partial<Tournament>): Promise<Tournament | undefined> {
    const [tournament] = await db
      .update(tournaments)
      .set(updates)
      .where(eq(tournaments.id, id))
      .returning();
    return tournament || undefined;
  }

  async getTournaments(filters: any = {}): Promise<Tournament[]> {
    let query = db.select().from(tournaments);
    
    if (filters.organizerId) {
      query = query.where(eq(tournaments.organizerId, filters.organizerId));
    }
    
    if (filters.status) {
      query = query.where(eq(tournaments.status, filters.status));
    }
    
    return await query;
  }
}

// Create storage instance
const storageInstance = new DatabaseStorage();

// Initialize storage and export it
export const storage = storageInstance;

// Export initialization function for server startup
export async function initializeStorage(): Promise<void> {
  await storageInstance.initialize();
}
