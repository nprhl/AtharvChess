import { Chess, Move } from 'chess.js';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { createHash } from 'crypto';
import type { Difficulty } from './chess-ai';

// MAIA-2 Skill Level Mappings based on research paper
export interface SkillLevel {
  name: string;
  eloRange: [number, number];
  categoryId: number;
  description: string;
}

export const MAIA2_SKILL_LEVELS: SkillLevel[] = [
  { name: 'beginner', eloRange: [0, 1000], categoryId: 0, description: 'Learning fundamentals' },
  { name: 'novice', eloRange: [1000, 1200], categoryId: 1, description: 'Basic tactics' },
  { name: 'intermediate', eloRange: [1200, 1400], categoryId: 2, description: 'Developing strategy' },
  { name: 'skilled', eloRange: [1400, 1600], categoryId: 3, description: 'Advanced tactics' },
  { name: 'expert', eloRange: [1600, 1800], categoryId: 4, description: 'Strategic mastery' },
  { name: 'master', eloRange: [1800, 2000], categoryId: 5, description: 'High-level play' },
  { name: 'grandmaster', eloRange: [2000, 3000], categoryId: 6, description: 'Elite level' }
];

export interface MAIA2Request {
  fen: string;
  activePlayerSkill: number;
  opponentPlayerSkill: number;
  gameContext?: {
    moveHistory?: string[];
    timeControl?: string;
    gamePhase?: 'opening' | 'middlegame' | 'endgame';
  };
  analysisDepth?: number;
  temperature?: number;
}

export interface MAIA2Response {
  move: {
    from: string;
    to: string;
    promotion?: string;
    san: string;
    confidence: number;
  };
  evaluation: {
    centipawns: number;
    winProbability: number;
    humanLikelihood: number;
  };
  alternatives: Array<{
    move: string;
    probability: number;
    explanation: string;
  }>;
  educationalInsights: {
    skillAppropriateness: number;
    learningOpportunity: string;
    nextLevelHint?: string;
  };
  coherenceMetrics: {
    skillConsistency: number;
    improvementPath: number;
    humanAlignment: number;
  };
}

export interface MAIA2Config {
  apiEndpoint: string;
  apiKey: string;
  timeout: number;
  maxRetries: number;
  rateLimitPerMinute: number;
  enableCaching: boolean;
  cacheExpiryMinutes: number;
  fallbackToStockfish: boolean;
  enableMetrics: boolean;
}

// Environment configuration helper
export function getMaia2Config(): MAIA2Config {
  return {
    apiEndpoint: process.env.MAIA2_API_ENDPOINT || 'https://api.maia2.ai/v1',
    apiKey: process.env.MAIA2_API_KEY || '',
    timeout: parseInt(process.env.MAIA2_TIMEOUT || '10000'),
    maxRetries: parseInt(process.env.MAIA2_MAX_RETRIES || '3'),
    rateLimitPerMinute: parseInt(process.env.MAIA2_RATE_LIMIT || '60'),
    enableCaching: process.env.MAIA2_ENABLE_CACHE !== 'false',
    cacheExpiryMinutes: parseInt(process.env.MAIA2_CACHE_EXPIRY || '30'),
    fallbackToStockfish: process.env.MAIA2_FALLBACK !== 'false',
    enableMetrics: process.env.MAIA2_ENABLE_METRICS !== 'false'
  };
}

export class MAIA2ChessAI {
  private config: MAIA2Config;
  private axiosInstance: AxiosInstance;
  private requestCache: Map<string, { response: MAIA2Response; timestamp: number }>;
  private rateLimitTracker: Map<string, number[]>;
  private metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    cacheHits: number;
    averageResponseTime: number;
  };

  constructor(config: Partial<MAIA2Config> = {}) {
    this.config = {
      apiEndpoint: process.env.MAIA2_API_ENDPOINT || 'https://api.maia2.ai/v1',
      apiKey: process.env.MAIA2_API_KEY || '',
      timeout: 10000, // 10 seconds
      maxRetries: 3,
      rateLimitPerMinute: 60,
      enableCaching: true,
      cacheExpiryMinutes: 30,
      fallbackToStockfish: true,
      enableMetrics: true,
      ...config
    };

    this.requestCache = new Map();
    this.rateLimitTracker = new Map();
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      averageResponseTime: 0
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.apiEndpoint,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ChessLearningApp/1.0'
      }
    });

    this.setupAxiosInterceptors();
  }

  private setupAxiosInterceptors(): void {
    // Request interceptor for security and rate limiting
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const timestamp = Date.now();
        
        // Add request timestamp for metrics
        config.metadata = { startTime: timestamp };
        
        // Add security headers
        config.headers = {
          ...config.headers,
          'X-Request-ID': this.generateRequestId(),
          'X-Timestamp': timestamp.toString()
        };

        return config;
      },
      (error) => {
        console.error('[MAIA2] Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for metrics and error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const duration = Date.now() - (response.config.metadata?.startTime || 0);
        this.updateMetrics(true, duration);
        return response;
      },
      (error) => {
        const duration = Date.now() - (error.config?.metadata?.startTime || 0);
        this.updateMetrics(false, duration);
        console.error('[MAIA2] API Error:', {
          status: error.response?.status,
          message: error.message,
          duration
        });
        return Promise.reject(error);
      }
    );
  }

  private generateRequestId(): string {
    return createHash('sha256')
      .update(`${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 16);
  }

  private updateMetrics(success: boolean, responseTime: number): void {
    if (!this.config.enableMetrics) return;

    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update average response time
    const totalResponseTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime;
    this.metrics.averageResponseTime = totalResponseTime / this.metrics.totalRequests;
  }

  private isRateLimited(clientId: string = 'default'): boolean {
    const now = Date.now();
    const windowStart = now - (60 * 1000); // 1 minute window
    
    if (!this.rateLimitTracker.has(clientId)) {
      this.rateLimitTracker.set(clientId, []);
    }

    const requests = this.rateLimitTracker.get(clientId)!;
    
    // Remove old requests outside the window
    while (requests.length > 0 && requests[0] < windowStart) {
      requests.shift();
    }

    // Check if we're at the limit
    if (requests.length >= this.config.rateLimitPerMinute) {
      return true;
    }

    // Add current request
    requests.push(now);
    return false;
  }

  private generateCacheKey(request: MAIA2Request): string {
    const keyData = {
      fen: request.fen,
      activeSkill: request.activePlayerSkill,
      opponentSkill: request.opponentPlayerSkill,
      depth: request.analysisDepth || 10,
      temp: request.temperature || 0.1
    };
    
    return createHash('md5')
      .update(JSON.stringify(keyData))
      .digest('hex');
  }

  private getCachedResponse(cacheKey: string): MAIA2Response | null {
    if (!this.config.enableCaching) return null;

    const cached = this.requestCache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    const expiryTime = cached.timestamp + (this.config.cacheExpiryMinutes * 60 * 1000);
    
    if (now > expiryTime) {
      this.requestCache.delete(cacheKey);
      return null;
    }

    this.metrics.cacheHits++;
    return cached.response;
  }

  private setCachedResponse(cacheKey: string, response: MAIA2Response): void {
    if (!this.config.enableCaching) return;

    this.requestCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });

    // Cleanup old cache entries (keep max 1000)
    if (this.requestCache.size > 1000) {
      const oldestKey = this.requestCache.keys().next().value;
      this.requestCache.delete(oldestKey);
    }
  }

  public static mapEloToSkillLevel(elo: number): SkillLevel {
    for (const level of MAIA2_SKILL_LEVELS) {
      if (elo >= level.eloRange[0] && elo <= level.eloRange[1]) {
        return level;
      }
    }
    // Default to highest level if ELO is above range
    return MAIA2_SKILL_LEVELS[MAIA2_SKILL_LEVELS.length - 1];
  }

  public static mapDifficultyToSkillLevel(difficulty: Difficulty): SkillLevel {
    switch (difficulty) {
      case 'beginner':
        return MAIA2_SKILL_LEVELS[0]; // 0-1000 ELO
      case 'intermediate':
        return MAIA2_SKILL_LEVELS[2]; // 1200-1400 ELO
      case 'advanced':
        return MAIA2_SKILL_LEVELS[4]; // 1600-1800 ELO
      default:
        return MAIA2_SKILL_LEVELS[1]; // Default to novice
    }
  }

  private detectGamePhase(fen: string): 'opening' | 'middlegame' | 'endgame' {
    const chess = new Chess(fen);
    const board = chess.board();
    let pieceCount = 0;
    let majorPieceCount = 0;

    for (const row of board) {
      for (const square of row) {
        if (square) {
          pieceCount++;
          if (['q', 'r'].includes(square.type)) {
            majorPieceCount++;
          }
        }
      }
    }

    if (pieceCount > 20) return 'opening';
    if (pieceCount < 10 || majorPieceCount <= 2) return 'endgame';
    return 'middlegame';
  }

  public async getBestMove(
    fen: string, 
    playerElo: number = 1200, 
    opponentElo: number = 1200,
    gameHistory: string[] = []
  ): Promise<Move | null> {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!fen || !this.config.apiKey) {
        console.warn('[MAIA2] Invalid input or missing API key');
        return null;
      }

      // Check rate limiting
      if (this.isRateLimited()) {
        console.warn('[MAIA2] Rate limit exceeded');
        return null;
      }

      // Map ELO ratings to MAIA-2 skill levels
      const activeSkill = MAIA2ChessAI.mapEloToSkillLevel(playerElo);
      const opponentSkill = MAIA2ChessAI.mapEloToSkillLevel(opponentElo);

      const request: MAIA2Request = {
        fen,
        activePlayerSkill: activeSkill.categoryId,
        opponentPlayerSkill: opponentSkill.categoryId,
        gameContext: {
          moveHistory: gameHistory.slice(-10), // Last 10 moves for context
          gamePhase: this.detectGamePhase(fen)
        },
        analysisDepth: 12,
        temperature: 0.1
      };

      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cachedResponse = this.getCachedResponse(cacheKey);
      
      if (cachedResponse) {
        return this.convertToChessJsMove(cachedResponse.move, fen);
      }

      // Make API request with retries
      const response = await this.makeRequestWithRetries('/predict', request);
      
      if (response && response.data) {
        const maia2Response: MAIA2Response = response.data;
        
        // Validate coherence metrics
        if (this.validateCoherenceMetrics(maia2Response)) {
          this.setCachedResponse(cacheKey, maia2Response);
          
          console.log(`[MAIA2] Move generated in ${Date.now() - startTime}ms:`, {
            move: maia2Response.move.san,
            confidence: maia2Response.move.confidence,
            humanAlignment: maia2Response.coherenceMetrics.humanAlignment,
            skillLevel: activeSkill.name
          });
          
          return this.convertToChessJsMove(maia2Response.move, fen);
        } else {
          console.warn('[MAIA2] Coherence validation failed');
        }
      }

      return null;

    } catch (error) {
      console.error('[MAIA2] Error getting best move:', error);
      return null;
    }
  }

  private async makeRequestWithRetries(
    endpoint: string, 
    data: any, 
    retryCount: number = 0
  ): Promise<AxiosResponse | null> {
    try {
      const response = await this.axiosInstance.post(endpoint, data);
      return response;
    } catch (error: any) {
      if (retryCount < this.config.maxRetries && this.isRetryableError(error)) {
        console.warn(`[MAIA2] Request failed, retrying (${retryCount + 1}/${this.config.maxRetries})`);
        await this.delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
        return this.makeRequestWithRetries(endpoint, data, retryCount + 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors or 5xx status codes
    return !error.response || error.response.status >= 500;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private validateCoherenceMetrics(response: MAIA2Response): boolean {
    const { coherenceMetrics } = response;
    
    // Validate coherence thresholds based on MAIA-2 paper standards
    return (
      coherenceMetrics.skillConsistency >= 0.7 &&
      coherenceMetrics.improvementPath >= 0.6 &&
      coherenceMetrics.humanAlignment >= 0.75
    );
  }

  private convertToChessJsMove(maiaMove: any, fen: string): Move | null {
    try {
      const chess = new Chess(fen);
      const move = chess.move({
        from: maiaMove.from,
        to: maiaMove.to,
        promotion: maiaMove.promotion
      });
      
      if (move) {
        console.log(`[MAIA2] Converted move: ${maiaMove.san} -> ${move.san}`);
        return move;
      }
      
      return null;
    } catch (error) {
      console.error('[MAIA2] Error converting move:', error);
      return null;
    }
  }

  public getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.requestCache.size,
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
        : 0
    };
  }

  public clearCache(): void {
    this.requestCache.clear();
    console.log('[MAIA2] Cache cleared');
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error('[MAIA2] Health check failed:', error);
      return false;
    }
  }
}