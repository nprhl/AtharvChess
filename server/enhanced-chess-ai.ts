import { Chess, Move } from 'chess.js';
import { StockfishAI } from './stockfish-ai';
import { OpenAIChessAI } from './openai-chess-ai';
import { ChessAI } from './chess-ai';
import { MAIA2ChessAI } from './maia2-chess-ai';
import type { Difficulty } from './chess-ai';

export interface EngineConfig {
  name: string;
  priority: number;
  enabled: boolean;
  healthCheck: () => Promise<boolean>;
  fallbackChain: string[];
}

export interface MoveRequest {
  fen: string;
  difficulty: Difficulty;
  playerElo?: number;
  opponentElo?: number;
  gameHistory?: string[];
  preferredEngine?: string;
  enableFallback?: boolean;
}

export interface MoveResponse {
  move: Move | null;
  engine: string;
  confidence: number;
  responseTime: number;
  fallbackUsed: boolean;
  metadata?: {
    evaluation?: number | string;
    alternatives?: string[];
    educationalInsights?: any;
    error?: string;
    attemptedEngines?: string[];
  };
}

export class EnhancedChessAI {
  private engines: Map<string, any>;
  private engineConfigs: Map<string, EngineConfig>;
  private healthStatus: Map<string, { healthy: boolean; lastCheck: number }>;
  private performanceMetrics: Map<string, {
    totalRequests: number;
    successfulRequests: number;
    averageResponseTime: number;
    lastUsed: number;
  }>;

  constructor() {
    this.engines = new Map();
    this.engineConfigs = new Map();
    this.healthStatus = new Map();
    this.performanceMetrics = new Map();
    
    this.initializeEngines();
    this.setupEngineConfigs();
    this.startHealthMonitoring();
  }

  private initializeEngines(): void {
    // Initialize all available engines
    this.engines.set('maia2', new MAIA2ChessAI());
    this.engines.set('stockfish', new StockfishAI());
    this.engines.set('openai', new OpenAIChessAI());
    this.engines.set('traditional', new ChessAI());

    console.log('[EnhancedAI] Initialized engines:', Array.from(this.engines.keys()));
  }

  private setupEngineConfigs(): void {
    // MAIA-2: Highest priority for educational purposes
    this.engineConfigs.set('maia2', {
      name: 'MAIA-2 Human-AI Alignment',
      priority: 1,
      enabled: !!process.env.MAIA2_API_KEY,
      healthCheck: () => this.engines.get('maia2')?.healthCheck() || Promise.resolve(false),
      fallbackChain: ['openai', 'stockfish', 'traditional']
    });

    // OpenAI: High priority for educational features
    this.engineConfigs.set('openai', {
      name: 'OpenAI GPT-4o',
      priority: 2,
      enabled: !!process.env.OPENAI_API_KEY,
      healthCheck: () => this.engines.get('openai')?.checkOpenAIAvailability() || Promise.resolve(false),
      fallbackChain: ['stockfish', 'traditional']
    });

    // Stockfish: Reliable engine-level play
    this.engineConfigs.set('stockfish', {
      name: 'Stockfish Engine',
      priority: 3,
      enabled: true, // Always available
      healthCheck: () => Promise.resolve(true), // Stockfish is local
      fallbackChain: ['traditional']
    });

    // Traditional: Always available fallback
    this.engineConfigs.set('traditional', {
      name: 'Traditional Chess AI',
      priority: 4,
      enabled: true,
      healthCheck: () => Promise.resolve(true),
      fallbackChain: []
    });

    // Initialize performance metrics
    const engineNames = Array.from(this.engines.keys());
    for (const engineName of engineNames) {
      this.performanceMetrics.set(engineName, {
        totalRequests: 0,
        successfulRequests: 0,
        averageResponseTime: 0,
        lastUsed: 0
      });
    }
  }

  private startHealthMonitoring(): void {
    // Check engine health every 5 minutes
    setInterval(() => {
      this.checkAllEnginesHealth();
    }, 5 * 60 * 1000);

    // Initial health check
    this.checkAllEnginesHealth();
  }

  private async checkAllEnginesHealth(): Promise<void> {
    console.log('[EnhancedAI] Performing health checks...');
    
    for (const [engineName, config] of Array.from(this.engineConfigs.entries())) {
      if (!config.enabled) continue;

      try {
        const startTime = Date.now();
        const isHealthy = await Promise.race([
          config.healthCheck(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 10000)
          )
        ]);

        this.healthStatus.set(engineName, {
          healthy: isHealthy,
          lastCheck: Date.now()
        });

        const checkTime = Date.now() - startTime;
        console.log(`[EnhancedAI] ${engineName} health: ${isHealthy ? 'OK' : 'FAIL'} (${checkTime}ms)`);

      } catch (error) {
        console.warn(`[EnhancedAI] Health check failed for ${engineName}:`, error);
        this.healthStatus.set(engineName, {
          healthy: false,
          lastCheck: Date.now()
        });
      }
    }
  }

  private isEngineHealthy(engineName: string): boolean {
    const status = this.healthStatus.get(engineName);
    if (!status) return false;

    // Consider engine unhealthy if we haven't checked in 10 minutes
    const staleThreshold = 10 * 60 * 1000;
    const isStale = Date.now() - status.lastCheck > staleThreshold;
    
    return status.healthy && !isStale;
  }

  private selectOptimalEngine(request: MoveRequest): string[] {
    // If specific engine requested, try it first
    if (request.preferredEngine && this.engines.has(request.preferredEngine)) {
      const config = this.engineConfigs.get(request.preferredEngine);
      if (config?.enabled && this.isEngineHealthy(request.preferredEngine)) {
        return [request.preferredEngine, ...config.fallbackChain];
      }
    }

    // Determine best engine based on context
    let preferredEngines: string[] = [];

    // MAIA-2 is ideal for educational contexts
    if (this.isEngineHealthy('maia2') && this.engineConfigs.get('maia2')?.enabled) {
      preferredEngines.push('maia2');
    }

    // OpenAI for advanced educational features
    if (this.isEngineHealthy('openai') && this.engineConfigs.get('openai')?.enabled) {
      preferredEngines.push('openai');
    }

    // Stockfish for reliable performance
    if (this.isEngineHealthy('stockfish')) {
      preferredEngines.push('stockfish');
    }

    // Traditional as ultimate fallback
    preferredEngines.push('traditional');

    return Array.from(new Set(preferredEngines)); // Remove duplicates
  }

  private updatePerformanceMetrics(engineName: string, success: boolean, responseTime: number): void {
    const metrics = this.performanceMetrics.get(engineName);
    if (!metrics) return;

    metrics.totalRequests++;
    metrics.lastUsed = Date.now();

    if (success) {
      metrics.successfulRequests++;
    }

    // Update average response time
    const totalTime = metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime;
    metrics.averageResponseTime = totalTime / metrics.totalRequests;

    this.performanceMetrics.set(engineName, metrics);
  }

  public async getBestMove(request: MoveRequest): Promise<MoveResponse> {
    const startTime = Date.now();
    const enginePriority = this.selectOptimalEngine(request);
    
    console.log(`[EnhancedAI] Engine priority for move: ${enginePriority.join(' -> ')}`);

    let lastError: Error | null = null;
    
    for (let i = 0; i < enginePriority.length; i++) {
      const engineName = enginePriority[i];
      const engine = this.engines.get(engineName);
      
      if (!engine) {
        console.warn(`[EnhancedAI] Engine ${engineName} not found`);
        continue;
      }

      try {
        const engineStartTime = Date.now();
        let move: Move | null = null;
        let metadata: any = {};

        // Call appropriate method based on engine capabilities
        switch (engineName) {
          case 'maia2':
            move = await engine.getBestMove(
              request.fen,
              request.playerElo || 1200,
              request.opponentElo || 1200,
              request.gameHistory || []
            );
            // MAIA-2 provides additional educational metadata
            metadata.educationalInsights = 'Human-aligned move selection';
            break;

          case 'openai':
            const openaiEngine = new OpenAIChessAI(request.difficulty);
            move = await openaiEngine.getBestMove(request.fen);
            metadata.evaluation = 'AI-generated strategic analysis';
            break;

          case 'stockfish':
            const stockfishEngine = new StockfishAI(request.difficulty);
            const analysis = await stockfishEngine.getAnalysis(request.fen);
            if (analysis) {
              move = await stockfishEngine.getBestMove(request.fen);
              metadata.evaluation = analysis.evaluation;
              metadata.alternatives = analysis.pv;
            }
            break;

          case 'traditional':
            const traditionalEngine = new ChessAI(request.difficulty);
            move = traditionalEngine.getBestMove(request.fen);
            break;

          default:
            console.warn(`[EnhancedAI] Unknown engine: ${engineName}`);
            continue;
        }

        const responseTime = Date.now() - engineStartTime;
        const fallbackUsed = i > 0;

        if (move) {
          this.updatePerformanceMetrics(engineName, true, responseTime);
          
          console.log(`[EnhancedAI] Success with ${engineName}: ${move.san} (${responseTime}ms)`);
          
          return {
            move,
            engine: engineName,
            confidence: this.calculateConfidence(engineName, responseTime),
            responseTime: Date.now() - startTime,
            fallbackUsed,
            metadata
          };
        } else {
          console.warn(`[EnhancedAI] ${engineName} returned null move`);
          this.updatePerformanceMetrics(engineName, false, responseTime);
        }

      } catch (error) {
        const engineEndTime = Date.now();
        const responseTime = engineEndTime - engineStartTime;
        this.updatePerformanceMetrics(engineName, false, responseTime);
        
        console.error(`[EnhancedAI] ${engineName} failed:`, error);
        lastError = error as Error;
        
        // Mark engine as unhealthy if it fails
        this.healthStatus.set(engineName, {
          healthy: false,
          lastCheck: Date.now()
        });
      }
    }

    // All engines failed
    console.error('[EnhancedAI] All engines failed to generate move');
    
    return {
      move: null,
      engine: 'none',
      confidence: 0,
      responseTime: Date.now() - startTime,
      fallbackUsed: true,
      metadata: {
        error: lastError?.message || 'All engines failed',
        attemptedEngines: enginePriority
      }
    };
  }

  private calculateConfidence(engineName: string, responseTime: number): number {
    const baseConfidence = {
      'maia2': 0.95,     // Highest for human-aligned moves
      'openai': 0.85,    // High for strategic play
      'stockfish': 0.90, // Very reliable
      'traditional': 0.75 // Good fallback
    }[engineName] || 0.5;

    // Reduce confidence for slow responses
    const timePenalty = Math.min(responseTime / 10000, 0.2); // Max 20% penalty
    
    return Math.max(0.1, baseConfidence - timePenalty);
  }

  public async getEducationalHint(
    fen: string, 
    difficulty: Difficulty,
    playerElo: number = 1200
  ): Promise<any> {
    // Prefer MAIA-2 or OpenAI for educational content
    const educationalEngines = ['maia2', 'openai'];
    
    for (const engineName of educationalEngines) {
      if (!this.isEngineHealthy(engineName)) continue;
      
      const engine = this.engines.get(engineName);
      if (!engine) continue;

      try {
        if (engineName === 'openai') {
          const openaiEngine = new OpenAIChessAI(difficulty);
          return await openaiEngine.getEducationalHint(fen);
        }
        // Add MAIA-2 educational hints when API supports it
      } catch (error) {
        console.error(`[EnhancedAI] Educational hint failed for ${engineName}:`, error);
      }
    }

    return null;
  }

  public getSystemStatus() {
    const engineStatus = Array.from(this.engines.keys()).map(name => ({
      name,
      enabled: this.engineConfigs.get(name)?.enabled || false,
      healthy: this.isEngineHealthy(name),
      metrics: this.performanceMetrics.get(name)
    }));

    return {
      engines: engineStatus,
      totalEngines: this.engines.size,
      healthyEngines: engineStatus.filter(e => e.healthy).length,
      lastHealthCheck: Math.max(...Array.from(this.healthStatus.values()).map(s => s.lastCheck))
    };
  }

  public async testAllEngines(fen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'): Promise<any> {
    const results = [];
    
    for (const engineName of Array.from(this.engines.keys())) {
      const startTime = Date.now();
      try {
        const response = await this.getBestMove({
          fen,
          difficulty: 'intermediate',
          preferredEngine: engineName,
          enableFallback: false
        });
        
        results.push({
          engine: engineName,
          success: !!response.move,
          move: response.move?.san,
          responseTime: Date.now() - startTime,
          confidence: response.confidence
        });
      } catch (error) {
        results.push({
          engine: engineName,
          success: false,
          error: (error as Error).message,
          responseTime: Date.now() - startTime
        });
      }
    }

    return results;
  }
}

// Export singleton instance
export const enhancedChessAI = new EnhancedChessAI();