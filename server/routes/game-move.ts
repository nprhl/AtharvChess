import type { Express } from "express";
import { requireAuth } from "../auth";
import { gameAnalyzer } from "../game-analyzer";

export function registerGameMoveRoutes(app: Express) {
  // Player move endpoint for recording moves during the game
  app.post("/api/game/move", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const { from, to, fen, san, promotion, gameId = 'current' } = req.body;
      
      // OpenAI analysis suspended - no move recording needed
      
      console.log(`Player ${userId} moved: ${san} (${from}-${to})`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Move logging error:', error);
      res.status(500).json({ message: "Failed to log move" });
    }
  });
}