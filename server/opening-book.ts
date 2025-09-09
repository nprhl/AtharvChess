/**
 * Enhanced Opening Book System
 * Provides comprehensive opening move detection and classification
 */

export interface OpeningMove {
  move: string;
  name: string;
  popularity: number; // 1-100 scale
  successRate: number; // Win percentage
  description: string;
  variations: string[];
}

export interface OpeningSequence {
  moves: string[];
  name: string;
  eco: string; // ECO classification code
  popularity: number;
  level: 'beginner' | 'intermediate' | 'advanced' | 'master';
}

export class OpeningBook {
  private positionBook: Map<string, OpeningMove[]>;
  private sequenceBook: Map<string, OpeningSequence>;
  
  constructor() {
    this.positionBook = new Map();
    this.sequenceBook = new Map();
    this.initializeOpeningBook();
  }

  /**
   * Check if a move is from opening theory
   */
  public isBookMove(fen: string, move: string): OpeningMove | null {
    const moves = this.positionBook.get(fen);
    if (!moves) return null;

    return moves.find(bookMove => 
      this.normalizeMove(bookMove.move) === this.normalizeMove(move)
    ) || null;
  }

  /**
   * Get all book moves for a position
   */
  public getBookMoves(fen: string): OpeningMove[] {
    return this.positionBook.get(fen) || [];
  }

  /**
   * Get opening sequence information
   */
  public getOpeningSequence(moves: string[]): OpeningSequence | null {
    const moveString = moves.join(' ');
    
    // Check exact sequence first
    let sequence = this.sequenceBook.get(moveString);
    if (sequence) return sequence;

    // Check partial sequences (for transpositions)
    for (let i = moves.length - 1; i >= 1; i--) {
      const partialMoves = moves.slice(0, i).join(' ');
      sequence = this.sequenceBook.get(partialMoves);
      if (sequence) return sequence;
    }

    return null;
  }

  /**
   * Determine opening phase and move quality
   */
  public evaluateOpeningMove(
    fen: string, 
    move: string, 
    moveNumber: number
  ): {
    isBook: boolean;
    opening?: OpeningMove;
    quality: 'excellent' | 'good' | 'acceptable' | 'dubious';
    explanation: string;
  } {
    const bookMove = this.isBookMove(fen, move);
    
    if (bookMove) {
      return {
        isBook: true,
        opening: bookMove,
        quality: this.getBookMoveQuality(bookMove),
        explanation: `${move} is a well-known move in ${bookMove.name}. ${bookMove.description}`
      };
    }

    // Evaluate non-book moves based on general opening principles
    const principleEvaluation = this.evaluateOpeningPrinciples(fen, move, moveNumber);
    
    return {
      isBook: false,
      quality: principleEvaluation.quality,
      explanation: principleEvaluation.explanation
    };
  }

  /**
   * Initialize comprehensive opening book
   */
  private initializeOpeningBook(): void {
    // Starting position - most popular openings
    this.addPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [
      {
        move: 'e4',
        name: "King's Pawn Opening",
        popularity: 95,
        successRate: 52,
        description: "The most popular opening move, controlling the center and developing pieces quickly.",
        variations: ["Italian Game", "Ruy Lopez", "Sicilian Defense", "French Defense"]
      },
      {
        move: 'd4',
        name: "Queen's Pawn Opening",
        popularity: 85,
        successRate: 54,
        description: "Solid central control with excellent positional prospects.",
        variations: ["Queen's Gambit", "Nimzo-Indian", "King's Indian Defense"]
      },
      {
        move: 'Nf3',
        name: "Reti Opening",
        popularity: 65,
        successRate: 51,
        description: "Flexible development that can transpose to many openings.",
        variations: ["English Opening", "King's Indian Attack"]
      },
      {
        move: 'c4',
        name: "English Opening",
        popularity: 70,
        successRate: 53,
        description: "Controls the center from the flank with good long-term prospects.",
        variations: ["Symmetrical Defense", "King's Indian Setup"]
      }
    ]);

    // After 1.e4 - popular responses
    this.addPosition('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', [
      {
        move: 'e5',
        name: "King's Pawn Game",
        popularity: 90,
        successRate: 48,
        description: "Symmetrical response, leading to tactical positions.",
        variations: ["Italian Game", "Ruy Lopez", "King's Gambit"]
      },
      {
        move: 'c5',
        name: "Sicilian Defense",
        popularity: 85,
        successRate: 46,
        description: "Asymmetrical and sharp, offering good winning chances for Black.",
        variations: ["Najdorf", "Dragon", "Accelerated Dragon"]
      },
      {
        move: 'e6',
        name: "French Defense",
        popularity: 60,
        successRate: 45,
        description: "Solid but somewhat passive, leading to positional games.",
        variations: ["Winawer", "Classical", "Advance"]
      },
      {
        move: 'c6',
        name: "Caro-Kann Defense",
        popularity: 55,
        successRate: 47,
        description: "Solid and reliable, avoiding many tactical complications.",
        variations: ["Classical", "Advance", "Exchange"]
      }
    ]);

    // After 1.d4 - popular responses
    this.addPosition('rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1', [
      {
        move: 'd5',
        name: "Queen's Pawn Game",
        popularity: 75,
        successRate: 48,
        description: "Solid central control, often leading to Queen's Gambit positions.",
        variations: ["Queen's Gambit", "Slav Defense", "Queen's Gambit Declined"]
      },
      {
        move: 'Nf6',
        name: "Indian Defenses",
        popularity: 85,
        successRate: 47,
        description: "Flexible development allowing for various Indian defense setups.",
        variations: ["Nimzo-Indian", "Queen's Indian", "King's Indian"]
      },
      {
        move: 'f5',
        name: "Dutch Defense",
        popularity: 30,
        successRate: 44,
        description: "Aggressive but risky, weakening the kingside early.",
        variations: ["Leningrad", "Classical", "Stonewall"]
      }
    ]);

    // Italian Game setup
    this.addPosition('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', [
      {
        move: 'Be7',
        name: "Italian Game - Hungarian Defense",
        popularity: 60,
        successRate: 47,
        description: "Solid development, preparing to castle kingside.",
        variations: ["Classical Italian", "Evans Gambit"]
      },
      {
        move: 'f5',
        name: "Italian Game - Rousseau Gambit",
        popularity: 15,
        successRate: 35,
        description: "Aggressive but dubious gambit, not recommended.",
        variations: ["Rousseau Gambit"]
      }
    ]);

    // Ruy Lopez positions
    this.addPosition('r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', [
      {
        move: 'a6',
        name: "Ruy Lopez - Morphy Defense",
        popularity: 85,
        successRate: 48,
        description: "The main line, challenging the bishop immediately.",
        variations: ["Closed Ruy Lopez", "Open Ruy Lopez", "Exchange Ruy Lopez"]
      },
      {
        move: 'Nf6',
        name: "Ruy Lopez - Berlin Defense",
        popularity: 70,
        successRate: 46,
        description: "Solid and drawish, popularized by Kramnik.",
        variations: ["Berlin Wall", "Berlin Endgame"]
      }
    ]);

    // Add opening sequences
    this.addSequence(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], {
      name: "Italian Game",
      eco: "C50",
      popularity: 80,
      level: 'beginner'
    });

    this.addSequence(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], {
      name: "Ruy Lopez",
      eco: "C60",
      popularity: 90,
      level: 'intermediate'
    });

    this.addSequence(['e4', 'c5'], {
      name: "Sicilian Defense",
      eco: "B20",
      popularity: 85,
      level: 'advanced'
    });

    this.addSequence(['d4', 'd5', 'c4'], {
      name: "Queen's Gambit",
      eco: "D06",
      popularity: 75,
      level: 'intermediate'
    });
  }

  /**
   * Add position to opening book
   */
  private addPosition(fen: string, moves: OpeningMove[]): void {
    this.positionBook.set(fen, moves);
  }

  /**
   * Add opening sequence
   */
  private addSequence(moves: string[], sequence: Omit<OpeningSequence, 'moves'>): void {
    const fullSequence: OpeningSequence = { moves, ...sequence };
    this.sequenceBook.set(moves.join(' '), fullSequence);
  }

  /**
   * Evaluate book move quality based on popularity and success rate
   */
  private getBookMoveQuality(bookMove: OpeningMove): 'excellent' | 'good' | 'acceptable' | 'dubious' {
    const score = (bookMove.popularity + bookMove.successRate) / 2;
    
    if (score >= 70) return 'excellent';
    if (score >= 55) return 'good';
    if (score >= 40) return 'acceptable';
    return 'dubious';
  }

  /**
   * Evaluate moves based on opening principles
   */
  private evaluateOpeningPrinciples(
    fen: string, 
    move: string, 
    moveNumber: number
  ): { quality: 'excellent' | 'good' | 'acceptable' | 'dubious'; explanation: string } {
    // Basic opening principle evaluation
    let score = 50; // Start neutral
    const reasons: string[] = [];

    // Center control evaluation
    if (this.isCenter(move)) {
      score += 15;
      reasons.push("controls the center");
    }

    // Development evaluation
    if (this.isDevelopmentMove(move)) {
      score += 10;
      reasons.push("develops a piece");
    } else if (moveNumber <= 10) {
      score -= 10;
      reasons.push("doesn't develop pieces");
    }

    // Early queen development penalty
    if (this.isEarlyQueen(move) && moveNumber <= 5) {
      score -= 20;
      reasons.push("develops queen too early");
    }

    // Castling bonus
    if (this.isCastling(move)) {
      score += 15;
      reasons.push("secures king safety");
    }

    // Multiple pawn moves penalty
    if (this.isPawnMove(move) && moveNumber > 3) {
      score -= 5;
      reasons.push("moves pawns in opening");
    }

    let quality: 'excellent' | 'good' | 'acceptable' | 'dubious';
    if (score >= 70) quality = 'excellent';
    else if (score >= 55) quality = 'good';
    else if (score >= 40) quality = 'acceptable';
    else quality = 'dubious';

    const explanation = reasons.length > 0 
      ? `This move ${reasons.join(' and ')}.`
      : 'This move follows basic opening principles.';

    return { quality, explanation };
  }

  /**
   * Helper methods for opening principle evaluation
   */
  private isCenter(move: string): boolean {
    return /^[de][4-5]$/.test(move);
  }

  private isDevelopmentMove(move: string): boolean {
    return /^[NBRQ]/.test(move) && !move.includes('x');
  }

  private isEarlyQueen(move: string): boolean {
    return move.startsWith('Q');
  }

  private isCastling(move: string): boolean {
    return move === 'O-O' || move === 'O-O-O';
  }

  private isPawnMove(move: string): boolean {
    return /^[a-h][2-7]$/.test(move) || !/^[NBRQKO]/.test(move);
  }

  /**
   * Normalize move notation for comparison
   */
  private normalizeMove(move: string): string {
    return move.replace(/[+#?!]/g, '').trim();
  }
}

export const openingBook = new OpeningBook();