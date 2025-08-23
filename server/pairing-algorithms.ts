import { db } from "./db.js";
import { tournaments, registrations, rounds, pairings, tournamentGames, users, tournamentSections } from "../shared/schema.js";
import { eq, and, desc, asc, sql } from "drizzle-orm";

export interface Player {
  id: number;
  userId: number;
  username: string;
  eloRating: number;
  score: number;
  tiebreak1?: number; // Buchholz
  tiebreak2?: number; // Sonneborn-Berger
  gamesPlayed: number;
  opponentIds: number[];
  colorBalance: number; // +1 for white, -1 for black
}

export interface Pairing {
  whitePlayerId: number;
  blackPlayerId: number;
  boardNumber: number;
}

export interface PairingResult {
  success: boolean;
  pairings: Pairing[];
  byePlayerId?: number;
  message?: string;
}

export class PairingAlgorithms {
  // Swiss System Pairing
  async generateSwissPairings(tournamentId: number, roundNumber: number): Promise<PairingResult> {
    try {
      const players = await this.getPlayersForPairing(tournamentId);
      
      if (players.length < 2) {
        return { success: false, pairings: [], message: "Not enough players for pairings" };
      }

      // Sort players by score, then by tiebreaks, then by rating
      players.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        if (a.tiebreak1 !== b.tiebreak1) return (b.tiebreak1 || 0) - (a.tiebreak1 || 0);
        if (a.tiebreak2 !== b.tiebreak2) return (b.tiebreak2 || 0) - (a.tiebreak2 || 0);
        return b.eloRating - a.eloRating;
      });

      const pairings: Pairing[] = [];
      const paired = new Set<number>();
      let byePlayerId: number | undefined;

      // Handle bye if odd number of players
      if (players.length % 2 === 1) {
        // Give bye to lowest-ranked player who hasn't had one
        for (let i = players.length - 1; i >= 0; i--) {
          const hasHadBye = await this.hasPlayerHadBye(tournamentId, players[i].userId);
          if (!hasHadBye) {
            byePlayerId = players[i].userId;
            paired.add(players[i].id);
            break;
          }
        }
        
        // If everyone has had a bye, give it to the lowest-ranked
        if (!byePlayerId) {
          byePlayerId = players[players.length - 1].userId;
          paired.add(players[players.length - 1].id);
        }
      }

      // Create score groups
      const scoreGroups = this.groupPlayersByScore(players.filter(p => !paired.has(p.id)));
      
      let boardNumber = 1;
      
      for (const group of scoreGroups) {
        const groupPairings = this.pairScoreGroup(group);
        
        for (const pairing of groupPairings) {
          pairings.push({
            whitePlayerId: pairing.whitePlayerId,
            blackPlayerId: pairing.blackPlayerId,
            boardNumber: boardNumber++
          });
        }
      }

      return {
        success: true,
        pairings,
        byePlayerId
      };

    } catch (error) {
      console.error("Swiss pairing error:", error);
      return { success: false, pairings: [], message: "Failed to generate pairings" };
    }
  }

  // Round Robin Pairing
  async generateRoundRobinPairings(tournamentId: number, roundNumber: number): Promise<PairingResult> {
    try {
      const players = await this.getPlayersForPairing(tournamentId);
      const n = players.length;
      
      if (n < 2) {
        return { success: false, pairings: [], message: "Not enough players for round robin" };
      }

      // Use round-robin algorithm
      const pairings: Pairing[] = [];
      let byePlayerId: number | undefined;

      if (n % 2 === 1) {
        // Odd number - one player gets bye
        const byeIndex = (roundNumber - 1) % n;
        byePlayerId = players[byeIndex].userId;
        players.splice(byeIndex, 1);
      }

      const adjustedN = players.length;
      const roundPairings = this.getRoundRobinRoundPairings(adjustedN, roundNumber);
      
      let boardNumber = 1;
      for (const [p1Index, p2Index] of roundPairings) {
        const player1 = players[p1Index];
        const player2 = players[p2Index];
        
        // Alternate colors based on round number
        const isWhiteFirst = (p1Index + roundNumber) % 2 === 0;
        
        pairings.push({
          whitePlayerId: isWhiteFirst ? player1.userId : player2.userId,
          blackPlayerId: isWhiteFirst ? player2.userId : player1.userId,
          boardNumber: boardNumber++
        });
      }

      return {
        success: true,
        pairings,
        byePlayerId
      };

    } catch (error) {
      console.error("Round robin pairing error:", error);
      return { success: false, pairings: [], message: "Failed to generate round robin pairings" };
    }
  }

  // Single Elimination Pairing
  async generateEliminationPairings(tournamentId: number, roundNumber: number): Promise<PairingResult> {
    try {
      if (roundNumber === 1) {
        // First round - pair by seeding
        return this.generateFirstRoundElimination(tournamentId);
      } else {
        // Subsequent rounds - pair winners
        return this.generateEliminationAdvancement(tournamentId, roundNumber);
      }
    } catch (error) {
      console.error("Elimination pairing error:", error);
      return { success: false, pairings: [], message: "Failed to generate elimination pairings" };
    }
  }

  // Helper: Get players with current standings
  private async getPlayersForPairing(tournamentId: number): Promise<Player[]> {
    const registeredPlayers = await db
      .select({
        id: registrations.id,
        userId: registrations.userId,
        username: users.username,
        eloRating: users.eloRating
      })
      .from(registrations)
      .innerJoin(users, eq(registrations.userId, users.id))
      .where(and(
        eq(registrations.tournamentId, tournamentId),
        eq(registrations.status, 'confirmed')
      ));

    const players: Player[] = [];

    for (const player of registeredPlayers) {
      const stats = await this.calculatePlayerStats(tournamentId, player.userId);
      
      players.push({
        id: player.id,
        userId: player.userId,
        username: player.username,
        eloRating: player.eloRating,
        score: stats.score,
        tiebreak1: stats.buchholz,
        tiebreak2: stats.sonnebornBerger,
        gamesPlayed: stats.gamesPlayed,
        opponentIds: stats.opponentIds,
        colorBalance: stats.colorBalance
      });
    }

    return players;
  }

  // Helper: Calculate player statistics
  private async calculatePlayerStats(tournamentId: number, userId: number) {
    const games = await db
      .select()
      .from(tournamentGames)
      .where(and(
        eq(tournamentGames.tournamentId, tournamentId),
        sql`(${tournamentGames.whitePlayerId} = ${userId} OR ${tournamentGames.blackPlayerId} = ${userId})`
      ));

    let score = 0;
    let gamesPlayed = 0;
    let colorBalance = 0;
    const opponentIds: number[] = [];

    for (const game of games) {
      if (game.result === null) continue; // Game not finished
      
      gamesPlayed++;
      const isWhite = game.whitePlayerId === userId;
      const opponentId = isWhite ? game.blackPlayerId : game.whitePlayerId;
      opponentIds.push(opponentId);
      
      if (isWhite) colorBalance++;
      else colorBalance--;

      // Calculate score (using chess notation: 1-0, 0-1, 1/2-1/2)
      if (game.result === '1/2-1/2') {
        score += 0.5;
      } else if (
        (game.result === '1-0' && isWhite) ||
        (game.result === '0-1' && !isWhite)
      ) {
        score += 1;
      }
    }

    // Calculate tiebreaks (simplified)
    const buchholz = await this.calculateBuchholz(tournamentId, userId, opponentIds);
    const sonnebornBerger = await this.calculateSonnebornBerger(tournamentId, userId, games);

    return {
      score,
      gamesPlayed,
      colorBalance,
      opponentIds,
      buchholz,
      sonnebornBerger
    };
  }

  // Helper: Group players by score
  private groupPlayersByScore(players: Player[]): Player[][] {
    const groups: { [score: number]: Player[] } = {};
    
    for (const player of players) {
      if (!groups[player.score]) {
        groups[player.score] = [];
      }
      groups[player.score].push(player);
    }

    return Object.values(groups);
  }

  // Helper: Pair players within a score group
  private pairScoreGroup(players: Player[]): Pairing[] {
    const pairings: Pairing[] = [];
    const paired = new Set<number>();

    // Split group in half and try to pair top half with bottom half
    const halfSize = Math.floor(players.length / 2);
    
    for (let i = 0; i < halfSize; i++) {
      const topPlayer = players[i];
      
      if (paired.has(topPlayer.id)) continue;
      
      // Find best opponent from bottom half
      for (let j = halfSize; j < players.length; j++) {
        const bottomPlayer = players[j];
        
        if (paired.has(bottomPlayer.id)) continue;
        if (topPlayer.opponentIds.includes(bottomPlayer.userId)) continue;
        
        // Determine colors based on color balance
        const topPlayerNeedsWhite = topPlayer.colorBalance <= bottomPlayer.colorBalance;
        
        pairings.push({
          whitePlayerId: topPlayerNeedsWhite ? topPlayer.userId : bottomPlayer.userId,
          blackPlayerId: topPlayerNeedsWhite ? bottomPlayer.userId : topPlayer.userId,
          boardNumber: 0 // Will be set later
        });
        
        paired.add(topPlayer.id);
        paired.add(bottomPlayer.id);
        break;
      }
    }

    // Handle any remaining unpaired players (fallback pairing)
    const unpaired = players.filter(p => !paired.has(p.id));
    for (let i = 0; i < unpaired.length - 1; i += 2) {
      pairings.push({
        whitePlayerId: unpaired[i].userId,
        blackPlayerId: unpaired[i + 1].userId,
        boardNumber: 0
      });
    }

    return pairings;
  }

  // Helper: Check if player has had a bye (simplified - would need special handling)
  private async hasPlayerHadBye(tournamentId: number, userId: number): Promise<boolean> {
    // For now, assume no player has had a bye
    // In a real system, you'd track this in the database
    return false;
  }

  // Helper: Round robin pairing calculation
  private getRoundRobinRoundPairings(n: number, round: number): [number, number][] {
    const pairings: [number, number][] = [];
    
    if (n % 2 === 0) {
      // Even number of players
      for (let i = 0; i < n / 2; i++) {
        const p1 = i;
        const p2 = (n - 1 - i + round - 1) % (n - 1);
        if (p2 >= p1) {
          pairings.push([p1, p2 + 1]);
        } else {
          pairings.push([p1, p2]);
        }
      }
    }
    
    return pairings;
  }

  // Helper: First round elimination seeding
  private async generateFirstRoundElimination(tournamentId: number): Promise<PairingResult> {
    const players = await this.getPlayersForPairing(tournamentId);
    
    // Sort by rating for seeding
    players.sort((a, b) => b.eloRating - a.eloRating);
    
    const pairings: Pairing[] = [];
    let byePlayerId: number | undefined;
    
    // Handle bye for odd number
    if (players.length % 2 === 1) {
      byePlayerId = players[players.length - 1].userId;
      players.pop();
    }
    
    // Pair 1 vs n, 2 vs n-1, etc.
    for (let i = 0; i < players.length / 2; i++) {
      const topSeed = players[i];
      const bottomSeed = players[players.length - 1 - i];
      
      pairings.push({
        whitePlayerId: topSeed.userId,
        blackPlayerId: bottomSeed.userId,
        boardNumber: i + 1
      });
    }
    
    return { success: true, pairings, byePlayerId };
  }

  // Helper: Elimination advancement
  private async generateEliminationAdvancement(tournamentId: number, roundNumber: number): Promise<PairingResult> {
    // Get winners from previous round
    const prevRound = await db
      .select()
      .from(rounds)
      .where(and(
        eq(rounds.tournamentId, tournamentId),
        eq(rounds.roundNumber, roundNumber - 1)
      ));

    if (prevRound.length === 0) {
      return { success: false, pairings: [], message: "Previous round not found" };
    }

    const winners = await this.getRoundWinners(prevRound[0].id);
    
    if (winners.length < 2) {
      return { success: false, pairings: [], message: "Not enough winners to continue" };
    }

    const pairings: Pairing[] = [];
    let byePlayerId: number | undefined;
    
    if (winners.length % 2 === 1) {
      byePlayerId = winners[winners.length - 1];
      winners.pop();
    }
    
    for (let i = 0; i < winners.length; i += 2) {
      pairings.push({
        whitePlayerId: winners[i],
        blackPlayerId: winners[i + 1],
        boardNumber: Math.floor(i / 2) + 1
      });
    }
    
    return { success: true, pairings, byePlayerId };
  }

  // Helper: Get round winners
  private async getRoundWinners(roundId: number): Promise<number[]> {
    const games = await db
      .select()
      .from(tournamentGames)
      .where(eq(tournamentGames.pairingId, roundId)); // Using pairingId as fallback

    const winners: number[] = [];
    
    for (const game of games) {
      if (game.result === '1-0') {
        winners.push(game.whitePlayerId);
      } else if (game.result === '0-1') {
        winners.push(game.blackPlayerId);
      }
      // Draws might advance both players depending on tournament rules
    }
    
    return winners;
  }

  // Helper: Calculate Buchholz tiebreak
  private async calculateBuchholz(tournamentId: number, userId: number, opponentIds: number[]): Promise<number> {
    let buchholz = 0;
    
    for (const opponentId of opponentIds) {
      const opponentStats = await this.calculatePlayerStats(tournamentId, opponentId);
      buchholz += opponentStats.score;
    }
    
    return buchholz;
  }

  // Helper: Calculate Sonneborn-Berger tiebreak
  private async calculateSonnebornBerger(tournamentId: number, userId: number, games: any[]): Promise<number> {
    let sonnebornBerger = 0;
    
    for (const game of games) {
      if (game.result === null) continue;
      
      const isWhite = game.whitePlayerId === userId;
      const opponentId = isWhite ? game.blackPlayerId : game.whitePlayerId;
      
      let gamePoints = 0;
      if (game.result === '1/2-1/2') {
        gamePoints = 0.5;
      } else if (
        (game.result === '1-0' && isWhite) ||
        (game.result === '0-1' && !isWhite)
      ) {
        gamePoints = 1;
      }
      
      if (gamePoints > 0) {
        const opponentStats = await this.calculatePlayerStats(tournamentId, opponentId);
        sonnebornBerger += gamePoints * opponentStats.score;
      }
    }
    
    return sonnebornBerger;
  }
}

export const pairingAlgorithms = new PairingAlgorithms();