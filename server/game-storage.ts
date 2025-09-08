import { storage } from './storage';
import { Chess } from 'chess.js';
import type { InsertGame } from '@shared/schema';

export interface GameSaveData {
  userId: number;
  opponent?: string;
  result: 'win' | 'loss' | 'draw' | 'abandoned';
  moves: string[]; // Moves in SAN notation
  gameMode: 'pvc' | 'pvp';
  difficulty?: string;
  playerColor: 'white' | 'black';
  timeControl?: string;
  gameDurationSeconds?: number;
}

export class GameStorageService {
  /**
   * Save a completed game to the database
   */
  static async saveCompletedGame(gameData: GameSaveData): Promise<number | null> {
    try {
      // Reconstruct the game to get additional metadata
      const chess = new Chess();
      const moveHistory = gameData.moves;
      
      // Play through the moves to get final position and opening info
      for (const move of moveHistory) {
        try {
          chess.move(move);
        } catch (error) {
          console.error('Error replaying move:', move, error);
          break;
        }
      }

      // Generate PGN with metadata
      const pgn = this.generatePGN(gameData, chess);
      
      // Detect opening (simplified - just use first few moves)
      const opening = this.detectOpening(moveHistory);

      const gameRecord: InsertGame = {
        userId: gameData.userId,
        opponent: gameData.opponent || 'Computer',
        result: gameData.result,
        moves: moveHistory,
        pgn: pgn,
        startingFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        finalFen: chess.fen(),
        openingName: opening.name,
        openingEco: opening.eco,
        totalMoves: Math.floor(moveHistory.length / 2) + (moveHistory.length % 2), // Full moves
        gameMode: gameData.gameMode,
        difficulty: gameData.difficulty,
        playerColor: gameData.playerColor,
        timeControl: gameData.timeControl,
        gameDuration: gameData.gameDurationSeconds,
        eloChange: 0 // Will be calculated later
      };

      const savedGame = await storage.createGame(gameRecord);
      console.log('[GameStorage] Game saved successfully:', savedGame.id);
      return savedGame.id;
    } catch (error) {
      console.error('[GameStorage] Error saving game:', error);
      return null;
    }
  }

  /**
   * Generate PGN notation with proper metadata
   */
  private static generatePGN(gameData: GameSaveData, chess: Chess): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '.');
    const result = this.formatPGNResult(gameData.result);
    
    let pgn = '';
    pgn += `[Event "Chess Learning App"]\n`;
    pgn += `[Site "Replit Chess App"]\n`;
    pgn += `[Date "${date}"]\n`;
    pgn += `[White "${gameData.playerColor === 'white' ? 'Player' : (gameData.opponent || 'Computer')}"]\n`;
    pgn += `[Black "${gameData.playerColor === 'black' ? 'Player' : (gameData.opponent || 'Computer')}"]\n`;
    pgn += `[Result "${result}"]\n`;
    
    if (gameData.timeControl) {
      pgn += `[TimeControl "${gameData.timeControl}"]\n`;
    }
    
    if (gameData.gameMode === 'pvc' && gameData.difficulty) {
      pgn += `[Mode "Player vs Computer (${gameData.difficulty})"]\n`;
    }
    
    pgn += '\n';
    
    // Add moves
    const moves = gameData.moves;
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      pgn += `${moveNumber}. ${moves[i]}`;
      if (i + 1 < moves.length) {
        pgn += ` ${moves[i + 1]}`;
      }
      pgn += ' ';
      
      // Line break every 8 moves for readability
      if ((i + 2) % 16 === 0) {
        pgn += '\n';
      }
    }
    
    pgn += ` ${result}`;
    return pgn.trim();
  }

  /**
   * Format game result for PGN notation
   */
  private static formatPGNResult(result: string): string {
    switch (result) {
      case 'win': return '1-0';
      case 'loss': return '0-1';
      case 'draw': return '1/2-1/2';
      default: return '*';
    }
  }

  /**
   * Simple opening detection based on first few moves
   */
  private static detectOpening(moves: string[]): { name: string; eco: string } {
    if (moves.length === 0) {
      return { name: 'Starting Position', eco: 'A00' };
    }

    const movesStr = moves.slice(0, 8).join(' ');
    
    // Simple opening detection (can be enhanced with a proper opening database)
    const openings = [
      { moves: ['e4', 'e5'], name: "King's Pawn Game", eco: 'B00' },
      { moves: ['e4', 'e5', 'Nf3'], name: "King's Knight Opening", eco: 'C40' },
      { moves: ['e4', 'e5', 'Nf3', 'Nc6'], name: "Italian Game", eco: 'C50' },
      { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], name: "Italian Game", eco: 'C50' },
      { moves: ['e4', 'c5'], name: "Sicilian Defense", eco: 'B20' },
      { moves: ['d4', 'd5'], name: "Queen's Pawn Game", eco: 'D00' },
      { moves: ['d4', 'Nf6'], name: "Indian Defense", eco: 'A40' },
      { moves: ['Nf3'], name: "Réti Opening", eco: 'A04' },
      { moves: ['c4'], name: "English Opening", eco: 'A10' },
    ];

    for (const opening of openings) {
      if (opening.moves.every((move, index) => moves[index] === move)) {
        return { name: opening.name, eco: opening.eco };
      }
    }

    return { name: 'Unknown Opening', eco: 'A00' };
  }
}