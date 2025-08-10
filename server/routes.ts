import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertGameSchema, insertSettingsSchema } from "@shared/schema";
import { z } from "zod";
import { ChessAI, type Difficulty } from "./chess-ai";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
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
  app.get("/api/lessons", async (req, res) => {
    try {
      const lessons = await storage.getAllLessons();
      res.json(lessons);
    } catch (error) {
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

  // AI move endpoint for computer opponent
  app.post("/api/ai/move", async (req, res) => {
    try {
      const { fen, difficulty = 'beginner' } = req.body;
      
      if (!fen) {
        return res.status(400).json({ message: "FEN string is required" });
      }

      const ai = new ChessAI(difficulty as Difficulty);
      const bestMove = ai.getBestMove(fen);
      
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
        difficulty
      });
    } catch (error) {
      console.error('AI move error:', error);
      res.status(500).json({ message: "AI service unavailable" });
    }
  });

  // AI hint endpoint
  app.post("/api/ai/hint", async (req, res) => {
    try {
      const { fen, difficulty = 'beginner' } = req.body;
      
      if (!fen) {
        return res.status(400).json({ message: "FEN string is required" });
      }

      const ai = new ChessAI(difficulty as Difficulty);
      const bestMove = ai.getBestMove(fen);
      
      if (!bestMove) {
        return res.status(400).json({ message: "No valid moves available" });
      }

      const hints = [
        `Try moving from ${bestMove.from} to ${bestMove.to}! This develops your pieces and improves your position.`,
        `Consider the move ${bestMove.san}. This helps control the center.`,
        `Look at ${bestMove.from}-${bestMove.to}. This move creates tactical opportunities.`,
        `The computer suggests ${bestMove.san}. This strengthens your position.`
      ];
      
      const randomHint = hints[Math.floor(Math.random() * hints.length)];
      
      res.json({
        hint: randomHint,
        move: {
          from: bestMove.from,
          to: bestMove.to,
          promotion: bestMove.promotion || null
        },
        explanation: "This move helps develop your pieces and improve your position."
      });
    } catch (error) {
      console.error('AI hint error:', error);
      res.status(500).json({ message: "AI service unavailable" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
