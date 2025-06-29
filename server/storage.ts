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
        description: "Learn how pawns move and capture pieces",
        difficulty: "beginner",
        content: {
          steps: [
            "Pawns move forward one square",
            "On first move, pawns can move two squares",
            "Pawns capture diagonally"
          ]
        },
        order: 1
      },
      {
        title: "Rook Movements",
        description: "Master the rook's horizontal and vertical movement",
        difficulty: "beginner",
        content: {
          steps: [
            "Rooks move horizontally and vertically",
            "Rooks can move any number of squares",
            "Rooks cannot jump over pieces"
          ]
        },
        order: 2
      },
      {
        title: "Bishop Strategies",
        description: "Learn diagonal movement and bishop tactics",
        difficulty: "beginner",
        content: {
          steps: [
            "Bishops move diagonally",
            "Bishops stay on same color squares",
            "Use bishops to control long diagonals"
          ]
        },
        order: 3
      },
      {
        title: "Knight Moves",
        description: "Learn how the knight moves in an L-shape and practice capturing opponent pieces",
        difficulty: "intermediate",
        content: {
          steps: [
            "Knights move in an L-shape",
            "Knights can jump over pieces",
            "Knights are strongest in the center"
          ]
        },
        order: 4
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
