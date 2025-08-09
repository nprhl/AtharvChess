import { 
  users, games, lessons, userLessonProgress, settings,
  type User, type InsertUser, type Game, type InsertGame,
  type Lesson, type InsertLesson, type UserLessonProgress, 
  type InsertUserLessonProgress, type Settings, type InsertSettings
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // Games
  getGamesByUserId(userId: number): Promise<Game[]>;
  createGame(game: InsertGame): Promise<Game>;

  // Lessons
  getAllLessons(): Promise<Lesson[]>;
  getLessonById(id: number): Promise<Lesson | undefined>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;

  // User Lesson Progress
  getUserLessonProgress(userId: number): Promise<UserLessonProgress[]>;
  updateUserLessonProgress(userId: number, lessonId: number, progress: Partial<InsertUserLessonProgress>): Promise<UserLessonProgress>;

  // Settings
  getUserSettings(userId: number): Promise<Settings | undefined>;
  updateUserSettings(userId: number, settings: Partial<InsertSettings>): Promise<Settings>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private games: Map<number, Game> = new Map();
  private lessons: Map<number, Lesson> = new Map();
  private userLessonProgress: Map<string, UserLessonProgress> = new Map();
  private settings: Map<number, Settings> = new Map();
  private currentUserId = 1;
  private currentGameId = 1;
  private currentLessonId = 1;
  private currentProgressId = 1;
  private currentSettingsId = 1;

  constructor() {
    // Initialize with default lessons
    this.initializeDefaultLessons();
  }

  private initializeDefaultLessons() {
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
                fen: "8/8/8/8/3r4/8/8/3R4 w - - 0 1",
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
                fen: "8/8/8/8/8/8/8/3B1B2 w - - 0 1",
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
                fen: "8/8/8/8/3N4/8/8/8 w - - 0 1", 
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
                fen: "8/8/8/8/3Q4/8/8/8 w - - 0 1",
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
                fen: "8/8/8/2r1r3/3Q4/8/8/8 w - - 0 1",
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

    defaultLessons.forEach(lesson => {
      this.createLesson(lesson);
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);

    // Create default settings for new user
    const defaultSettings: Settings = {
      id: this.currentSettingsId++,
      userId: id,
      hintsEnabled: true,
      focusMode: false,
      progressTracking: true,
      dailyPlayTime: 30,
      breakReminders: 15,
      difficulty: 'beginner',
      autoAdjustDifficulty: true
    };
    this.settings.set(id, defaultSettings);

    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getGamesByUserId(userId: number): Promise<Game[]> {
    return Array.from(this.games.values()).filter(game => game.userId === userId);
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = this.currentGameId++;
    const game: Game = { 
      ...insertGame, 
      id,
      createdAt: new Date()
    };
    this.games.set(id, game);
    return game;
  }

  async getAllLessons(): Promise<Lesson[]> {
    return Array.from(this.lessons.values()).sort((a, b) => a.order - b.order);
  }

  async getLessonById(id: number): Promise<Lesson | undefined> {
    return this.lessons.get(id);
  }

  async createLesson(insertLesson: InsertLesson): Promise<Lesson> {
    const id = this.currentLessonId++;
    const lesson: Lesson = { ...insertLesson, id };
    this.lessons.set(id, lesson);
    return lesson;
  }

  async getUserLessonProgress(userId: number): Promise<UserLessonProgress[]> {
    return Array.from(this.userLessonProgress.values())
      .filter(progress => progress.userId === userId);
  }

  async updateUserLessonProgress(
    userId: number, 
    lessonId: number, 
    progressUpdate: Partial<InsertUserLessonProgress>
  ): Promise<UserLessonProgress> {
    const key = `${userId}-${lessonId}`;
    const existing = this.userLessonProgress.get(key);
    
    const progress: UserLessonProgress = existing ? 
      { ...existing, ...progressUpdate } :
      {
        id: this.currentProgressId++,
        userId,
        lessonId,
        completed: false,
        score: null,
        completedAt: null,
        ...progressUpdate
      };

    if (progressUpdate.completed && !progress.completedAt) {
      progress.completedAt = new Date();
    }

    this.userLessonProgress.set(key, progress);
    return progress;
  }

  async getUserSettings(userId: number): Promise<Settings | undefined> {
    return this.settings.get(userId);
  }

  async updateUserSettings(userId: number, settingsUpdate: Partial<InsertSettings>): Promise<Settings> {
    const existing = this.settings.get(userId);
    
    const settings: Settings = existing ?
      { ...existing, ...settingsUpdate } :
      {
        id: this.currentSettingsId++,
        userId,
        hintsEnabled: true,
        focusMode: false,
        progressTracking: true,
        dailyPlayTime: 30,
        breakReminders: 15,
        difficulty: 'beginner',
        autoAdjustDifficulty: true,
        ...settingsUpdate
      };

    this.settings.set(userId, settings);
    return settings;
  }
}

export const storage = new MemStorage();
