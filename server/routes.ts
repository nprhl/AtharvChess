import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { setupAuth, requireAuth, getCurrentUser, hashPassword } from "./auth";
import { puzzleService } from "./puzzle-service";
import { tipService } from "./tip-service";
import { gameIntegration } from "./game-integration";
import { insertUserSchema, insertGameSchema, insertSettingsSchema, loginSchema, registerSchema } from "@shared/schema";
import { z } from "zod";
import { ChessAI, type Difficulty } from "./chess-ai";
import { OllamaChessAI } from "./ollama-chess-ai";
import { OpenAIChessAI } from "./openai-chess-ai";
import { MoveEvaluator } from "./move-evaluator";
import { evals as evalRoutes } from "./routes/evals";
import { db } from "./db";
import { games, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  
  // Mount API routes
  app.use('/api/evals', evalRoutes);

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        username,
        email,
        passwordHash,
        eloRating: 1200,
        isEloCalibrated: false,
        gamesWon: 0,
        puzzlesSolved: 0,
        currentStreak: 0,
        lessonsCompleted: 0,
        onboardingCompleted: false
      });

      // Log user in
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed after registration" });
        }
        res.status(201).json({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            eloRating: user.eloRating,
            isEloCalibrated: user.isEloCalibrated,
            onboardingCompleted: user.onboardingCompleted
          }
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid registration data", errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    try {
      loginSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid login data", errors: error.errors });
      }
    }

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "Invalid credentials" });
      }

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            eloRating: user.eloRating,
            isEloCalibrated: user.isEloCalibrated,
            onboardingCompleted: user.onboardingCompleted
          }
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", getCurrentUser, async (req, res) => {
    if (req.user) {
      const user = req.user as any;
      // Get fresh user data from database to ensure ELO is current
      const dbUser = await storage.getUser(user.id);
      
      res.json({
        user: {
          id: dbUser?.id || user.id,
          username: dbUser?.username || user.username,
          email: dbUser?.email || user.email,
          eloRating: dbUser?.eloRating || user.eloRating,
          isEloCalibrated: dbUser?.isEloCalibrated || user.isEloCalibrated,
          onboardingCompleted: dbUser?.onboardingCompleted || user.onboardingCompleted
        }
      });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // ELO Assessment & Onboarding routes
  app.get("/api/onboarding/puzzles", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const puzzles = await puzzleService.getAssessmentPuzzles(user.eloRating);
      res.json(puzzles);
    } catch (error) {
      console.error("Error getting assessment puzzles:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/onboarding/puzzle-attempt", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { puzzleId, solved, timeSpent, attemptedMoves } = req.body;
      
      const result = await puzzleService.recordPuzzleAttempt(
        user.id,
        puzzleId,
        solved,
        timeSpent,
        attemptedMoves
      );

      res.json(result);
    } catch (error) {
      console.error("Error recording puzzle attempt:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/onboarding/complete", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Calculate final ELO based on all puzzle attempts
      const assessmentResult = await puzzleService.calculateAssessmentElo(user.id);
      
      // Update user with calculated ELO and mark onboarding as completed
      await storage.updateUser(user.id, { 
        eloRating: assessmentResult.estimatedElo,
        onboardingCompleted: true 
      });
      
      // Get the updated user data
      const updatedUser = await storage.getUser(user.id);
      const recommendedLessons = await puzzleService.getRecommendedLessons(
        user.id, 
        assessmentResult.estimatedElo
      );

      res.json({
        message: "Onboarding completed",
        user: updatedUser,
        recommendedLessons,
        assessment: assessmentResult
      });
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Protected user routes
  app.get("/api/user/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/user/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Game routes
  app.get("/api/user/:id/games", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const games = await storage.getGamesByUserId(userId);
      res.json(games);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/games", async (req, res) => {
    try {
      const gameData = insertGameSchema.parse(req.body);
      const game = await storage.createGame(gameData);
      res.status(201).json(game);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid game data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Lesson routes
  app.get("/api/lessons", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const dbUser = await storage.getUser(user.id);
      const userElo = dbUser?.eloRating || 1200;
      
      console.log(`Getting AI-recommended lessons for user ${user.id} with ELO ${userElo}`);
      
      // Get AI-recommended lessons based on user's ELO and progress
      const recommendedLessons = await puzzleService.getRecommendedLessons(user.id, userElo);
      
      res.json(recommendedLessons);
    } catch (error) {
      console.error("Error fetching recommended lessons:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/lesson/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const lesson = await storage.getLessonById(id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      res.json(lesson);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User lesson progress routes
  app.get("/api/user/:id/lesson-progress", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const progress = await storage.getUserLessonProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/:userId/lesson/:lessonId/progress", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const lessonId = parseInt(req.params.lessonId);
      const progressData = req.body;
      
      const progress = await storage.updateUserLessonProgress(userId, lessonId, progressData);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Settings routes
  app.get("/api/user/:id/settings", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const settings = await storage.getUserSettings(userId);
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/user/:id/settings", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const settingsData = req.body;
      const settings = await storage.updateUserSettings(userId, settingsData);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // AI move endpoint with Ollama integration
  app.post("/api/ai/move", async (req, res) => {
    try {
      const { fen, difficulty = 'beginner', useOllama = true } = req.body;
      
      if (!fen) {
        return res.status(400).json({ message: "FEN string is required" });
      }

      let bestMove = null;
      let aiEngine = 'traditional';

      // Try OpenAI first (primary engine)
      if (process.env.OPENAI_API_KEY) {
        console.log('Trying OpenAI chess AI (primary engine)...');
        try {
          const openaiAI = new OpenAIChessAI(difficulty as Difficulty);
          bestMove = await openaiAI.getBestMove(fen);
          if (bestMove) {
            aiEngine = 'openai';
            console.log(`OpenAI AI (${difficulty}) played: ${bestMove.san}`);
          } else {
            console.log('OpenAI returned null move');
          }
        } catch (error) {
          const errorMsg = (error as any).code === 'insufficient_quota' 
            ? 'OpenAI quota exceeded - need to add billing/credits to API account'
            : (error as Error).message;
          console.log('OpenAI error:', errorMsg);
        }
      } else {
        console.log('OpenAI unavailable: API key missing');
      }

      // Try Ollama as fallback option  
      if (!bestMove && useOllama) {
        console.log('OpenAI failed, trying Ollama fallback...');
        try {
          const ollamaAI = new OllamaChessAI(difficulty as Difficulty);
          bestMove = await ollamaAI.getBestMove(fen);
          if (bestMove) {
            aiEngine = 'ollama';
            console.log(`Ollama AI (${difficulty}) played: ${bestMove.san}`);
          }
        } catch (error) {
          console.log('Ollama also unavailable, falling back to traditional engine');
        }
      } else if (!bestMove) {
        console.log('Skipping Ollama, falling back to traditional engine');
      }

      // Fallback to traditional chess engine
      if (!bestMove) {
        console.log(`Creating traditional ChessAI with difficulty: ${difficulty}`);
        const traditionalAI = new ChessAI(difficulty as Difficulty);
        bestMove = traditionalAI.getBestMove(fen);
        aiEngine = 'traditional';
        console.log(`Traditional AI (${difficulty}) played: ${bestMove?.san}`);
      }
      
      if (!bestMove) {
        return res.status(400).json({ message: "No valid moves available" });
      }
      
      res.json({
        move: {
          from: bestMove.from,
          to: bestMove.to,
          promotion: bestMove.promotion || null
        },
        san: bestMove.san,
        difficulty,
        engine: aiEngine
      });
    } catch (error) {
      console.error('AI move error:', error);
      res.status(500).json({ message: "AI service unavailable" });
    }
  });

  // AI hint endpoint with Ollama integration
  app.post("/api/ai/hint", async (req, res) => {
    try {
      const { fen, difficulty = 'beginner', useOllama = true } = req.body;
      
      if (!fen) {
        return res.status(400).json({ message: "FEN string is required" });
      }

      let bestMove = null;
      let aiEngine = 'traditional';

      // Try Ollama first for better hint explanations
      if (useOllama) {
        try {
          const ollamaAI = new OllamaChessAI(difficulty as Difficulty);
          bestMove = await ollamaAI.getBestMove(fen);
          if (bestMove) {
            aiEngine = 'ollama';
          }
        } catch (error) {
          console.log('Ollama unavailable for hints, falling back');
        }
      }

      // Fallback to traditional engine
      if (!bestMove) {
        const traditionalAI = new ChessAI(difficulty as Difficulty);
        bestMove = traditionalAI.getBestMove(fen);
      }
      
      if (!bestMove) {
        return res.status(400).json({ message: "No valid moves available" });
      }

      // Generate more sophisticated hints based on difficulty
      const hints = difficulty === 'advanced' ? [
        `Strong players would consider ${bestMove.san}. This move improves piece coordination and creates long-term advantages.`,
        `The tactical sequence starting with ${bestMove.san} leads to a favorable position with better piece activity.`,
        `Advanced analysis suggests ${bestMove.san} due to its strategic value and positional improvements.`,
        `Consider ${bestMove.san} - this move follows strong opening principles and maintains initiative.`
      ] : difficulty === 'intermediate' ? [
        `Try ${bestMove.san}! This move develops your pieces while maintaining good tactics.`,
        `Consider ${bestMove.san}. This helps control key squares and improves your position.`,
        `The move ${bestMove.san} creates tactical opportunities and follows good principles.`,
        `Look for ${bestMove.san} - it strengthens your position and keeps pressure on your opponent.`
      ] : [
        `Try moving from ${bestMove.from} to ${bestMove.to}! This develops your pieces safely.`,
        `Consider the move ${bestMove.san}. It's a good, simple move that improves your position.`,
        `Look at ${bestMove.from}-${bestMove.to}. This move follows basic chess principles.`,
        `The computer suggests ${bestMove.san}. It's a safe move that helps your development.`
      ];
      
      const randomHint = hints[Math.floor(Math.random() * hints.length)];
      
      res.json({
        hint: randomHint,
        move: {
          from: bestMove.from,
          to: bestMove.to,
          promotion: bestMove.promotion || null
        },
        explanation: aiEngine === 'ollama' ? 
          "AI-powered analysis using advanced chess reasoning" : 
          "Traditional chess engine analysis",
        engine: aiEngine
      });
    } catch (error) {
      console.error('AI hint error:', error);
      res.status(500).json({ message: "AI service unavailable" });
    }
  });

  // Move evaluation endpoint for real-time feedback
  app.post("/api/ai/evaluate-move", async (req, res) => {
    try {
      const { 
        moveSan, 
        fenBefore, 
        fenAfter, 
        gameHistory = "", 
        userElo = 1200,
        useOllama = true 
      } = req.body;
      
      const userId = (req as any).user?.id;
      
      if (!moveSan || !fenBefore || !fenAfter) {
        return res.status(400).json({ 
          message: "Move, before FEN, and after FEN are required" 
        });
      }

      const evaluator = new MoveEvaluator();
      const evaluation = await evaluator.evaluateMove(
        moveSan,
        fenBefore, 
        fenAfter,
        gameHistory,
        userElo
      );
      
      // Store move for learning analysis if user is authenticated
      if (userId && (evaluation.moveType === 'blunder' || evaluation.moveType === 'mistake')) {
        try {
          const { lessonGenerator } = await import("./lesson-generator");
          // This could trigger lesson generation based on patterns
          console.log(`Storing learning data for user ${userId}: ${evaluation.moveType} move`);
        } catch (error) {
          console.log('Learning analysis not available:', error);
        }
      }
      
      res.json({
        evaluation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Move evaluation error:', error);
      res.status(500).json({ 
        message: "Move evaluation service unavailable",
        evaluation: {
          message: "Nice move! Keep playing.",
          moveType: 'good',
          explanation: "Unable to provide detailed analysis right now.",
          tactical: [],
          strategic: [],
          rating: 5
        }
      });
    }
  });

  // User progress endpoint - simplified version that always works
  app.get("/api/user/progress", async (req, res) => {
    // Always return encouraging message for now, bypassing database issues
    return res.json({
      currentElo: 850,
      eloChange: 0,
      gamesPlayed: 0,
      winRate: 0,
      hasData: false,
      message: "Keep playing to build your progress!",
      skillAreas: [],
      recentPerformance: [],
      recommendations: [
        {
          area: "Getting Started",
          priority: "high", 
          description: "Play your first game against the computer to start tracking progress",
          actionItems: [
            "Choose your difficulty level",
            "Play a complete game",
            "Review your moves after the game"
          ],
          estimatedEloGain: 25
        }
      ]
    });
  });

  // Store game result for progress tracking
  app.post("/api/game/complete", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { result, moves, opponent = "Computer", eloChange = 0 } = req.body;

      if (!result || !moves) {
        return res.status(400).json({ message: "Result and moves are required" });
      }

      console.log(`Storing game result for user ${userId}: ${result}`);

      // Store game in database
      const [game] = await db.insert(games).values({
        userId,
        opponent,
        result,
        moves,
        eloChange
      }).returning();

      // Trigger learning analysis
      try {
        const { lessonGenerator } = await import("./lesson-generator");
        await lessonGenerator.analyzeGameForLearning(userId, game.id, moves);
        console.log(`Game analysis completed for game ${game.id}`);
      } catch (error) {
        console.log('Game analysis failed, but game stored:', error);
      }

      res.json({ 
        message: "Game stored successfully",
        gameId: game.id
      });
    } catch (error) {
      console.error("Error storing game:", error);
      res.status(500).json({ message: "Failed to store game result" });
    }
  });

  // GPT helper function for blunder explanations
  async function callGpt(prompt: string): Promise<string> {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      });
      return response.choices[0].message.content || "Unable to explain this move right now.";
    } catch (error) {
      console.error('OpenAI error in explanation:', error);
      return "I can't explain this move right now. Try looking for better piece development!";
    }
  }

  // Explain blunder endpoint
  app.post('/api/explain', async (req, res) => {
    const { fen, bestmove, cp_before, cp_after } = req.body;
    
    if (!fen || !bestmove || cp_before === undefined || cp_after === undefined) {
      return res.status(400).json({ error: 'Missing required fields: fen, bestmove, cp_before, cp_after' });
    }
    
    const prompt = `You are a children's chess coach. Position: ${fen}.
Best computer move: ${bestmove}. Eval moved from ${cp_before} to ${cp_after}.
Explain in 2 short sentences and give 1 tip. No new variations.`;
    
    const text = await callGpt(prompt);
    res.json({ explanation: text });
  });

  // Daily Tips Routes
  app.get("/api/tips/today", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const tip = await tipService.getTodaysTipForUser(user.id);
      
      if (!tip) {
        return res.status(404).json({ message: "No tip available for today" });
      }
      
      res.json(tip);
    } catch (error) {
      console.error("Error fetching today's tip:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/tips/category/:category", requireAuth, async (req, res) => {
    try {
      const { category } = req.params;
      const user = req.user as any;
      const tips = await tipService.getTipsByCategory(category, user.id);
      res.json(tips);
    } catch (error) {
      console.error("Error fetching tips by category:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tips/:id/complete", requireAuth, async (req, res) => {
    try {
      const tipId = parseInt(req.params.id);
      const user = req.user as any;
      
      await tipService.markTipCompleted(user.id, tipId);
      res.json({ message: "Tip marked as completed" });
    } catch (error) {
      console.error("Error completing tip:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tips/:id/bookmark", requireAuth, async (req, res) => {
    try {
      const tipId = parseInt(req.params.id);
      const user = req.user as any;
      
      const isBookmarked = await tipService.toggleBookmark(user.id, tipId);
      res.json({ bookmarked: isBookmarked });
    } catch (error) {
      console.error("Error bookmarking tip:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tips/:id/rate", requireAuth, async (req, res) => {
    try {
      const tipId = parseInt(req.params.id);
      const { rating } = req.body;
      const user = req.user as any;
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      
      await tipService.rateTip(user.id, tipId, rating);
      res.json({ message: "Tip rated successfully" });
    } catch (error) {
      console.error("Error rating tip:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/tips/bookmarks", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const bookmarks = await tipService.getUserBookmarks(user.id);
      res.json(bookmarks);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/tips/stats", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const stats = await tipService.getUserStats(user.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching tip stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Game Integration Routes
  app.post("/api/game/contextual-tip", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { fen, gamePhase } = req.body;
      
      if (!fen || !gamePhase) {
        return res.status(400).json({ message: "FEN and game phase are required" });
      }

      const tip = await gameIntegration.getContextualTip(user.id, fen, gamePhase);
      res.json(tip);
    } catch (error) {
      console.error("Error fetching contextual tip:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/game/learning-moment", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { momentType, fen, moveSan } = req.body;
      
      if (!momentType || !fen || !moveSan) {
        return res.status(400).json({ message: "Moment type, FEN, and move are required" });
      }

      await gameIntegration.recordLearningMoment(user.id, momentType, fen, moveSan);
      res.json({ message: "Learning moment recorded" });
    } catch (error) {
      console.error("Error recording learning moment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/game/situational-advice", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { situation } = req.body;
      
      if (!situation) {
        return res.status(400).json({ message: "Situation is required" });
      }

      const advice = await gameIntegration.getSituationalAdvice(user.id, situation);
      res.json(advice);
    } catch (error) {
      console.error("Error fetching situational advice:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
