import { useState, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';

interface EngineEvaluation {
  score: number;
  depth: number;
  bestMove?: string;
  pv?: string[];
}

interface AIExplanation {
  tactical: string[];
  strategic: string[];
  reasoning: string;
  learningPoint?: string;
}

interface AnalysisResult {
  stockfish?: EngineEvaluation;
  engine?: string;
  explanation?: AIExplanation;
  processingTime?: number;
  difficulty?: string;
  isAnalyzing: boolean;
  error?: string;
}

interface AnalysisOptions {
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  includeExplanation?: boolean;
  depth?: number;
}

// Enhanced API-based analysis using multi-engine backend
class RealAnalysisEngine {
  private abortController?: AbortController;
  private isMobile: boolean;
  private analysisCache: Map<string, AnalysisResult>;

  constructor() {
    this.isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    this.analysisCache = new Map();
  }

  async analyze(fen: string, options: AnalysisOptions = {}): Promise<EngineEvaluation & { explanation?: AIExplanation; engine?: string; processingTime?: number }> {
    // Cache key for performance optimization
    const cacheKey = `${fen}_${options.difficulty || 'advanced'}_${options.includeExplanation || false}`;
    
    // Check cache for recent analysis (valid for 30 seconds)
    const cached = this.getCachedResult(cacheKey);
    if (cached && !cached.isAnalyzing) {
      console.log('[RealAnalysisEngine] Using cached analysis result');
      return cached.stockfish as EngineEvaluation & { explanation?: AIExplanation; engine?: string; processingTime?: number };
    }

    // Cancel any pending request
    if (this.abortController) {
      this.abortController.abort();
    }
    
    this.abortController = new AbortController();

    const {
      difficulty = 'advanced',
      includeExplanation = !this.isMobile, // Default: explanations on desktop only
      depth = this.isMobile ? 12 : 15
    } = options;

    console.log(`[RealAnalysisEngine] Starting ${difficulty} analysis (mobile: ${this.isMobile}, explanations: ${includeExplanation})`);

    const response = await fetch('/api/ai/analyze-position', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        fen, 
        depth,
        difficulty,
        includeExplanation,
        isMobile: this.isMobile
      }),
      signal: this.abortController.signal
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    // Cache the successful result
    this.cacheResult(cacheKey, data);

    return {
      ...data.stockfish,
      explanation: data.explanation,
      engine: data.engine,
      processingTime: data.processingTime
    };
  }

  private getCachedResult(key: string): AnalysisResult | null {
    const result = this.analysisCache.get(key);
    if (!result) return null;

    // Check if cache is still fresh (30 seconds)
    const cacheAge = Date.now() - (result as any).cacheTime;
    if (cacheAge > 30000) {
      this.analysisCache.delete(key);
      return null;
    }

    return result;
  }

  private cacheResult(key: string, data: any): void {
    // Store with timestamp for cache expiration
    const result = {
      stockfish: data.stockfish,
      engine: data.engine,
      explanation: data.explanation,
      processingTime: data.processingTime,
      difficulty: data.difficulty,
      isAnalyzing: false,
      cacheTime: Date.now()
    };
    
    this.analysisCache.set(key, result);
    
    // Clean old cache entries (keep only last 20)
    if (this.analysisCache.size > 20) {
      const oldestKey = this.analysisCache.keys().next().value;
      this.analysisCache.delete(oldestKey);
    }
  }

  dispose(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.analysisCache.clear();
  }
}

export function useEngineAnalysis(
  enabled: boolean = true,
  options: AnalysisOptions = {}
): {
  analyze: (game: Chess, analysisOptions?: AnalysisOptions) => void;
  result: AnalysisResult;
  clearAnalysis: () => void;
  isSupported: boolean;
} {
  const [result, setResult] = useState<AnalysisResult>({ isAnalyzing: false });
  const engineRef = useRef<RealAnalysisEngine>();
  const analysisTimeoutRef = useRef<NodeJS.Timeout>();
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Enhanced analysis is supported on both desktop and mobile now
  const isSupported = enabled;

  // Initialize enhanced analysis engine
  if (!engineRef.current) {
    engineRef.current = new RealAnalysisEngine();
  }

  const analyze = useCallback((game: Chess, analysisOptions: AnalysisOptions = {}) => {
    if (!enabled || !engineRef.current) return;

    // Clear any pending analysis
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    // Merge options with defaults
    const mergedOptions = {
      difficulty: 'advanced' as const,
      includeExplanation: isDesktop, // Explanations on desktop by default
      ...options,
      ...analysisOptions
    };

    console.log(`[useEngineAnalysis] Starting analysis with options:`, mergedOptions);

    // Adaptive throttling based on device and settings
    const throttleDelay = isMobile ? 500 : 200; // More throttling on mobile
    
    const performAnalysis = async () => {
      setResult(prev => ({ ...prev, isAnalyzing: true, error: undefined }));

      const fen = game.fen();

      try {
        const analysisResult = await engineRef.current!.analyze(fen, mergedOptions);
        
        setResult({
          stockfish: {
            score: analysisResult.score,
            depth: analysisResult.depth,
            bestMove: analysisResult.bestMove,
            pv: analysisResult.pv
          },
          engine: analysisResult.engine,
          explanation: analysisResult.explanation,
          processingTime: analysisResult.processingTime,
          difficulty: mergedOptions.difficulty,
          isAnalyzing: false
        });

        console.log(`[useEngineAnalysis] Analysis completed using engine: ${analysisResult.engine} (${analysisResult.processingTime}ms)`);
      } catch (error) {
        console.warn('Enhanced analysis failed:', error);
        setResult({
          isAnalyzing: false,
          error: error instanceof Error ? error.message : 'Analysis failed'
        });
      }
    };

    // Smart scheduling based on device capabilities
    if ('requestIdleCallback' in window && isDesktop) {
      // Use idle callback for desktop to avoid blocking UI
      analysisTimeoutRef.current = requestIdleCallback(performAnalysis, { timeout: 2000 }) as any;
    } else {
      // Use timeout with adaptive delay
      analysisTimeoutRef.current = setTimeout(performAnalysis, throttleDelay);
    }
  }, [enabled, isDesktop, isMobile, options]);

  const clearAnalysis = useCallback(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    if (engineRef.current) {
      engineRef.current.dispose();
    }
    setResult({ isAnalyzing: false });
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    clearAnalysis();
  }, [clearAnalysis]);

  return { 
    analyze, 
    result, 
    clearAnalysis: cleanup, 
    isSupported 
  };
}