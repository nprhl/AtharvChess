import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { setupAuth, requireAuth, getCurrentUser, hashPassword } from "./auth";
import { puzzleService } from "./puzzle-service";
import { insertUserSchema, insertGameSchema, insertSettingsSchema, loginSchema, registerSchema } from "@shared/schema";
import { z } from "zod";
import { ChessAI, type Difficulty } from "./chess-ai";
import { OllamaChessAI } from "./ollama-chess-ai";
import { OpenAIChessAI } from "./openai-chess-ai";
import { MoveEvaluator } from "./move-evaluator";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

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
      if (userId && evaluation.moveType === 'blunder' || evaluation.moveType === 'mistake') {
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

  const httpServer = createServer(app);
  return httpServer;
}
