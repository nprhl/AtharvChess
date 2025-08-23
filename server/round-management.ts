import { db } from "./db.js";
import { tournaments, rounds, pairings, tournamentGames, registrations, users } from "../shared/schema.js";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { pairingAlgorithms } from "./pairing-algorithms.js";

export interface RoundData {
  tournamentId: number;
  roundNumber: number;
  name?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface GameResult {
  gameId: number;
  result: 'white_wins' | 'black_wins' | 'draw';
  moves?: string[];
  duration?: number;
  resultReason?: string;
}

export class RoundManagementService {
  // Create a new round
  async createRound(data: RoundData): Promise<{ success: boolean; roundId?: number; message?: string }> {
    try {
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, data.tournamentId));

      if (!tournament) {
        return { success: false, message: "Tournament not found" };
      }

      // Check if tournament is in correct state
      if (tournament.status !== 'in_progress' && tournament.status !== 'registration_closed') {
        return { success: false, message: "Tournament not ready for rounds" };
      }

      // Verify round number sequence
      const [lastRound] = await db
        .select({ maxRound: sql<number>`MAX(${rounds.roundNumber})` })
        .from(rounds)
        .where(eq(rounds.tournamentId, data.tournamentId));

      const expectedRound = (lastRound?.maxRound || 0) + 1;
      if (data.roundNumber !== expectedRound) {
        return { success: false, message: `Expected round ${expectedRound}, got ${data.roundNumber}` };
      }

      // Create the round
      const [round] = await db
        .insert(rounds)
        .values({
          tournamentId: data.tournamentId,
          roundNumber: data.roundNumber,
          name: data.name || `Round ${data.roundNumber}`,
          status: 'created',
          startTime: data.startTime,
          endTime: data.endTime
        })
        .returning();

      return { success: true, roundId: round.id };

    } catch (error) {
      console.error("Create round error:", error);
      return { success: false, message: "Failed to create round" };
    }
  }

  // Generate pairings for a round
  async generatePairings(roundId: number): Promise<{ success: boolean; message?: string }> {
    try {
      const [round] = await db
        .select()
        .from(rounds)
        .where(eq(rounds.id, roundId));

      if (!round) {
        return { success: false, message: "Round not found" };
      }

      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, round.tournamentId));

      if (!tournament) {
        return { success: false, message: "Tournament not found" };
      }

      // Generate pairings based on tournament format
      let pairingResult;
      
      switch (tournament.format) {
        case 'swiss':
          pairingResult = await pairingAlgorithms.generateSwissPairings(round.tournamentId, round.roundNumber);
          break;
        case 'round_robin':
          pairingResult = await pairingAlgorithms.generateRoundRobinPairings(round.tournamentId, round.roundNumber);
          break;
        case 'single_elimination':
        case 'double_elimination':
          pairingResult = await pairingAlgorithms.generateEliminationPairings(round.tournamentId, round.roundNumber);
          break;
        default:
          return { success: false, message: "Unsupported tournament format" };
      }

      if (!pairingResult.success) {
        return { success: false, message: pairingResult.message };
      }

      // Save pairings to database
      for (const pairing of pairingResult.pairings) {
        const [pairingRecord] = await db
          .insert(pairings)
          .values({
            roundId: roundId,
            whitePlayerId: pairing.whitePlayerId,
            blackPlayerId: pairing.blackPlayerId,
            boardNumber: pairing.boardNumber,
            status: 'paired'
          })
          .returning();

        // Create corresponding game record
        await db
          .insert(tournamentGames)
          .values({
            tournamentId: round.tournamentId,
            roundId: roundId,
            pairingId: pairingRecord.id,
            whitePlayerId: pairing.whitePlayerId,
            blackPlayerId: pairing.blackPlayerId,
            status: 'scheduled'
          });
      }

      // Handle bye if present
      if (pairingResult.byePlayerId) {
        await db
          .insert(pairings)
          .values({
            roundId: roundId,
            byePlayerId: pairingResult.byePlayerId,
            boardNumber: 0,
            status: 'bye'
          });
      }

      // Update round status
      await db
        .update(rounds)
        .set({ status: 'paired' })
        .where(eq(rounds.id, roundId));

      return { success: true };

    } catch (error) {
      console.error("Generate pairings error:", error);
      return { success: false, message: "Failed to generate pairings" };
    }
  }

  // Start a round
  async startRound(roundId: number): Promise<{ success: boolean; message?: string }> {
    try {
      const [round] = await db
        .select()
        .from(rounds)
        .where(eq(rounds.id, roundId));

      if (!round) {
        return { success: false, message: "Round not found" };
      }

      if (round.status !== 'paired') {
        return { success: false, message: "Round must be paired before starting" };
      }

      // Update round status and start time
      await db
        .update(rounds)
        .set({ 
          status: 'in_progress',
          startTime: new Date()
        })
        .where(eq(rounds.id, roundId));

      // Update tournament status if this is the first round
      if (round.roundNumber === 1) {
        await db
          .update(tournaments)
          .set({ status: 'in_progress' })
          .where(eq(tournaments.id, round.tournamentId));
      }

      // Update game statuses to 'in_progress'
      await db
        .update(tournamentGames)
        .set({ 
          status: 'in_progress',
          startTime: new Date()
        })
        .where(eq(tournamentGames.roundId, roundId));

      return { success: true };

    } catch (error) {
      console.error("Start round error:", error);
      return { success: false, message: "Failed to start round" };
    }
  }

  // Submit game result
  async submitGameResult(gameResult: GameResult): Promise<{ success: boolean; message?: string }> {
    try {
      const [game] = await db
        .select()
        .from(tournamentGames)
        .where(eq(tournamentGames.id, gameResult.gameId));

      if (!game) {
        return { success: false, message: "Game not found" };
      }

      if (game.status === 'completed') {
        return { success: false, message: "Game already completed" };
      }

      // Update game with result
      await db
        .update(tournamentGames)
        .set({
          result: gameResult.result,
          moves: gameResult.moves,
          duration: gameResult.duration,
          resultReason: gameResult.resultReason,
          status: 'completed',
          endTime: new Date()
        })
        .where(eq(tournamentGames.id, gameResult.gameId));

      // Check if round is complete
      await this.checkRoundCompletion(game.roundId);

      return { success: true };

    } catch (error) {
      console.error("Submit result error:", error);
      return { success: false, message: "Failed to submit result" };
    }
  }

  // Get round details with pairings
  async getRoundDetails(roundId: number) {
    try {
      const [round] = await db
        .select()
        .from(rounds)
        .where(eq(rounds.id, roundId));

      if (!round) return null;

      // Get pairings with player details
      const roundPairings = await db
        .select({
          id: pairings.id,
          boardNumber: pairings.boardNumber,
          status: pairings.status,
          whitePlayerId: pairings.whitePlayerId,
          blackPlayerId: pairings.blackPlayerId,
          byePlayerId: pairings.byePlayerId,
          whitePlayerName: sql<string>`white_user.username`,
          blackPlayerName: sql<string>`black_user.username`,
          whitePlayerElo: sql<number>`white_user.elo_rating`,
          blackPlayerElo: sql<number>`black_user.elo_rating`,
          gameId: tournamentGames.id,
          gameStatus: tournamentGames.status,
          gameResult: tournamentGames.result,
          gameDuration: tournamentGames.duration
        })
        .from(pairings)
        .leftJoin(users.as('white_user'), eq(pairings.whitePlayerId, sql`white_user.id`))
        .leftJoin(users.as('black_user'), eq(pairings.blackPlayerId, sql`black_user.id`))
        .leftJoin(tournamentGames, eq(pairings.id, tournamentGames.pairingId))
        .where(eq(pairings.roundId, roundId))
        .orderBy(pairings.boardNumber);

      return {
        round,
        pairings: roundPairings
      };

    } catch (error) {
      console.error("Get round details error:", error);
      return null;
    }
  }

  // Get tournament rounds
  async getTournamentRounds(tournamentId: number) {
    try {
      return await db
        .select({
          id: rounds.id,
          roundNumber: rounds.roundNumber,
          name: rounds.name,
          status: rounds.status,
          startTime: rounds.startTime,
          endTime: rounds.endTime,
          gamesCount: sql<number>`COUNT(${tournamentGames.id})`,
          completedGames: sql<number>`COUNT(CASE WHEN ${tournamentGames.status} = 'completed' THEN 1 END)`
        })
        .from(rounds)
        .leftJoin(tournamentGames, eq(rounds.id, tournamentGames.roundId))
        .where(eq(rounds.tournamentId, tournamentId))
        .groupBy(rounds.id, rounds.roundNumber, rounds.name, rounds.status, rounds.startTime, rounds.endTime)
        .orderBy(rounds.roundNumber);

    } catch (error) {
      console.error("Get tournament rounds error:", error);
      return [];
    }
  }

  // Get current standings
  async getCurrentStandings(tournamentId: number) {
    try {
      const players = await db
        .select({
          userId: registrations.userId,
          username: users.username,
          eloRating: users.eloRating
        })
        .from(registrations)
        .innerJoin(users, eq(registrations.userId, users.id))
        .where(and(
          eq(registrations.tournamentId, tournamentId),
          eq(registrations.status, 'approved')
        ));

      const standings = [];

      for (const player of players) {
        const stats = await this.calculatePlayerStandings(tournamentId, player.userId);
        
        standings.push({
          userId: player.userId,
          username: player.username,
          eloRating: player.eloRating,
          score: stats.score,
          gamesPlayed: stats.gamesPlayed,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
          buchholz: stats.buchholz,
          sonnebornBerger: stats.sonnebornBerger,
          performance: stats.performance
        });
      }

      // Sort by score, then tiebreaks
      standings.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        if (a.buchholz !== b.buchholz) return b.buchholz - a.buchholz;
        if (a.sonnebornBerger !== b.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
        return b.performance - a.performance;
      });

      return standings;

    } catch (error) {
      console.error("Get standings error:", error);
      return [];
    }
  }

  // Helper: Check if round is complete
  private async checkRoundCompletion(roundId: number): Promise<void> {
    try {
      const [roundStatus] = await db
        .select({
          totalGames: sql<number>`COUNT(${tournamentGames.id})`,
          completedGames: sql<number>`COUNT(CASE WHEN ${tournamentGames.status} = 'completed' THEN 1 END)`
        })
        .from(tournamentGames)
        .where(eq(tournamentGames.roundId, roundId));

      if (roundStatus && roundStatus.totalGames === roundStatus.completedGames && roundStatus.totalGames > 0) {
        await db
          .update(rounds)
          .set({ 
            status: 'completed',
            endTime: new Date()
          })
          .where(eq(rounds.id, roundId));

        // Check if tournament is complete
        await this.checkTournamentCompletion(roundId);
      }

    } catch (error) {
      console.error("Check round completion error:", error);
    }
  }

  // Helper: Check if tournament is complete
  private async checkTournamentCompletion(roundId: number): Promise<void> {
    try {
      const [round] = await db
        .select()
        .from(rounds)
        .where(eq(rounds.id, roundId));

      if (!round) return;

      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, round.tournamentId));

      if (!tournament) return;

      // Check completion logic based on format
      let isComplete = false;

      if (tournament.format === 'swiss') {
        // Swiss: Check if we've reached the planned number of rounds
        const targetRounds = tournament.rules?.rounds || 5;
        isComplete = round.roundNumber >= targetRounds;
      } else if (tournament.format === 'round_robin') {
        // Round Robin: Check if all players have played each other
        const [playerCount] = await db
          .select({ count: count() })
          .from(registrations)
          .where(and(
            eq(registrations.tournamentId, round.tournamentId),
            eq(registrations.status, 'approved')
          ));

        const totalRounds = playerCount.count - 1;
        isComplete = round.roundNumber >= totalRounds;
      } else if (tournament.format === 'single_elimination') {
        // Single Elimination: Check if only one player remains
        const winners = await this.getRemainingPlayers(round.tournamentId);
        isComplete = winners.length <= 1;
      }

      if (isComplete) {
        await db
          .update(tournaments)
          .set({ 
            status: 'completed',
            endDate: new Date()
          })
          .where(eq(tournaments.id, round.tournamentId));
      }

    } catch (error) {
      console.error("Check tournament completion error:", error);
    }
  }

  // Helper: Calculate player standings
  private async calculatePlayerStandings(tournamentId: number, userId: number) {
    const games = await db
      .select()
      .from(tournamentGames)
      .where(and(
        eq(tournamentGames.tournamentId, tournamentId),
        sql`(${tournamentGames.whitePlayerId} = ${userId} OR ${tournamentGames.blackPlayerId} = ${userId})`
      ));

    let score = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let gamesPlayed = 0;
    let opponentRatings = [];

    for (const game of games) {
      if (game.result === null) continue;
      
      gamesPlayed++;
      const isWhite = game.whitePlayerId === userId;
      const opponentId = isWhite ? game.blackPlayerId : game.whitePlayerId;
      
      // Get opponent rating
      const [opponent] = await db
        .select({ eloRating: users.eloRating })
        .from(users)
        .where(eq(users.id, opponentId));
      
      if (opponent) {
        opponentRatings.push(opponent.eloRating);
      }

      if (game.result === 'draw') {
        score += 0.5;
        draws++;
      } else if (
        (game.result === 'white_wins' && isWhite) ||
        (game.result === 'black_wins' && !isWhite)
      ) {
        score += 1;
        wins++;
      } else {
        losses++;
      }
    }

    // Calculate performance rating
    const performance = opponentRatings.length > 0 
      ? opponentRatings.reduce((a, b) => a + b, 0) / opponentRatings.length + (score / gamesPlayed - 0.5) * 400
      : 0;

    return {
      score,
      gamesPlayed,
      wins,
      draws,
      losses,
      buchholz: 0, // Simplified - would need full calculation
      sonnebornBerger: 0, // Simplified - would need full calculation
      performance: Math.round(performance)
    };
  }

  // Helper: Get remaining players in elimination
  private async getRemainingPlayers(tournamentId: number): Promise<number[]> {
    // This would implement logic to find players who haven't been eliminated
    // For now, return placeholder
    return [];
  }
}

export const roundManagement = new RoundManagementService();