import { useState, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';

interface EngineEvaluation {
  score: number;
  depth: number;
  bestMove?: string;
  pv?: string[];
}

interface AnalysisResult {
  stockfish?: EngineEvaluation;
  isAnalyzing: boolean;
  error?: string;
}

// Real API-based analysis using backend Stockfish
class RealAnalysisEngine {
  private abortController?: AbortController;

  async analyze(fen: string): Promise<EngineEvaluation> {
    // Cancel any pending request
    if (this.abortController) {
      this.abortController.abort();
    }
    
    this.abortController = new AbortController();

    const response = await fetch('/api/ai/analyze-position', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fen, depth: 15 }),
      signal: this.abortController.signal
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data.stockfish;
  }

  dispose(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}

export function useEngineAnalysis(enabled: boolean = true): {
  analyze: (game: Chess) => void;
  result: AnalysisResult;
  clearAnalysis: () => void;
} {
  const [result, setResult] = useState<AnalysisResult>({ isAnalyzing: false });
  const engineRef = useRef<RealAnalysisEngine>();
  const analysisTimeoutRef = useRef<NodeJS.Timeout>();
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  // Initialize real analysis engine
  if (!engineRef.current) {
    engineRef.current = new RealAnalysisEngine();
  }

  const analyze = useCallback((game: Chess) => {
    if (!enabled || !isDesktop || !engineRef.current) return;

    // Clear any pending analysis
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    // Throttle analysis to avoid too many requests
    const performAnalysis = async () => {
      setResult(prev => ({ ...prev, isAnalyzing: true, error: undefined }));

      const fen = game.fen();

      try {
        const stockfishResult = await engineRef.current!.analyze(fen);
        setResult({
          stockfish: stockfishResult,
          isAnalyzing: false
        });
      } catch (error) {
        console.warn('Real-time analysis failed:', error);
        setResult({
          isAnalyzing: false,
          error: error instanceof Error ? error.message : 'Analysis failed'
        });
      }
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      analysisTimeoutRef.current = requestIdleCallback(performAnalysis) as any;
    } else {
      analysisTimeoutRef.current = setTimeout(performAnalysis, 300); // Slightly longer delay for real API
    }
  }, [enabled, isDesktop]);

  const clearAnalysis = useCallback(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    if (engineRef.current) {
      engineRef.current.dispose();
    }
    setResult({ isAnalyzing: false });
  }, []);

  return { analyze, result, clearAnalysis };
}