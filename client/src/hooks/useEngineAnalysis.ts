import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import * as ort from 'onnxruntime-web';

interface EngineEvaluation {
  score: number;
  depth: number;
  bestMove?: string;
  pv?: string[];
}

interface MaiaEvaluation {
  policyProbabilities: Record<string, number>;
  topMoves: Array<{ move: string; probability: number }>;
}

interface AnalysisResult {
  stockfish?: EngineEvaluation;
  maia?: MaiaEvaluation;
  isAnalyzing: boolean;
  error?: string;
}

// Stockfish WebAssembly wrapper
class StockfishEngine {
  private worker?: Worker;
  private isReady = false;
  private pendingCallbacks = new Map<string, (result: any) => void>();
  private messageId = 0;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create a worker for Stockfish WASM
        const workerCode = `
          let stockfish = null;
          
          self.onmessage = function(e) {
            const { id, type, data } = e.data;
            
            if (type === 'init') {
              // Initialize Stockfish WASM
              // This is a placeholder - actual implementation would load stockfish.wasm
              setTimeout(() => {
                self.postMessage({ id, type: 'ready' });
              }, 100);
            } else if (type === 'evaluate') {
              // Simulate Stockfish evaluation
              // In real implementation, this would use the WASM module
              const mockEval = {
                score: Math.floor(Math.random() * 200 - 100), // Random score between -100 and +100
                depth: 15,
                bestMove: data.validMoves?.[0] || 'e2e4',
                pv: [data.validMoves?.[0] || 'e2e4']
              };
              
              setTimeout(() => {
                self.postMessage({ id, type: 'evaluation', result: mockEval });
              }, 200 + Math.random() * 300); // Simulate analysis time
            }
          };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
        
        this.worker.onmessage = (e) => {
          const { id, type, result } = e.data;
          
          if (type === 'ready') {
            this.isReady = true;
            resolve();
          } else if (type === 'evaluation') {
            const callback = this.pendingCallbacks.get(id);
            if (callback) {
              callback(result);
              this.pendingCallbacks.delete(id);
            }
          }
        };
        
        this.worker.onerror = reject;
        this.worker.postMessage({ id: 'init', type: 'init' });
        
      } catch (error) {
        reject(error);
      }
    });
  }

  async evaluate(fen: string, validMoves: string[]): Promise<EngineEvaluation> {
    if (!this.isReady || !this.worker) {
      throw new Error('Stockfish engine not ready');
    }

    return new Promise((resolve, reject) => {
      const id = `eval_${this.messageId++}`;
      
      this.pendingCallbacks.set(id, resolve);
      
      // Set timeout for evaluation
      setTimeout(() => {
        if (this.pendingCallbacks.has(id)) {
          this.pendingCallbacks.delete(id);
          reject(new Error('Stockfish evaluation timeout'));
        }
      }, 5000);
      
      this.worker!.postMessage({
        id,
        type: 'evaluate',
        data: { fen, validMoves }
      });
    });
  }

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = undefined;
    }
    this.pendingCallbacks.clear();
    this.isReady = false;
  }
}

// Maia ONNX model wrapper
class MaiaEngine {
  private session?: ort.InferenceSession;
  private isReady = false;

  async initialize(): Promise<void> {
    try {
      // Set ONNX Runtime Web configuration
      ort.env.wasm.wasmPaths = '/node_modules/onnxruntime-web/dist/';
      
      // For now, use a placeholder since maia.onnx will be provided later
      // In real implementation: this.session = await ort.InferenceSession.create('/engines/maia.onnx');
      
      // Simulate initialization
      await new Promise(resolve => setTimeout(resolve, 500));
      this.isReady = true;
      
    } catch (error) {
      console.warn('Maia engine initialization failed (model not available):', error);
      // Gracefully handle missing Maia model
    }
  }

  async evaluate(fen: string, validMoves: string[]): Promise<MaiaEvaluation> {
    if (!this.isReady) {
      throw new Error('Maia engine not ready');
    }

    // Placeholder implementation - real Maia would use ONNX inference
    // This simulates Maia's move probability predictions
    const mockProbabilities: Record<string, number> = {};
    let totalProb = 0;
    
    validMoves.forEach(move => {
      const prob = Math.random() * 0.8 + 0.1; // Random probability between 0.1-0.9
      mockProbabilities[move] = prob;
      totalProb += prob;
    });
    
    // Normalize probabilities
    Object.keys(mockProbabilities).forEach(move => {
      mockProbabilities[move] /= totalProb;
    });
    
    const topMoves = Object.entries(mockProbabilities)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([move, probability]) => ({ move, probability }));

    return {
      policyProbabilities: mockProbabilities,
      topMoves
    };
  }

  dispose(): void {
    this.session = undefined;
    this.isReady = false;
  }
}

export function useEngineAnalysis(enabled: boolean = true): {
  analyze: (game: Chess) => void;
  result: AnalysisResult;
  clearAnalysis: () => void;
} {
  const [result, setResult] = useState<AnalysisResult>({ isAnalyzing: false });
  const stockfishRef = useRef<StockfishEngine>();
  const maiaRef = useRef<MaiaEngine>();
  const analysisTimeoutRef = useRef<NodeJS.Timeout>();
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  // Initialize engines
  useEffect(() => {
    if (!enabled || !isDesktop) return;

    const initializeEngines = async () => {
      try {
        // Initialize Stockfish
        stockfishRef.current = new StockfishEngine();
        await stockfishRef.current.initialize();

        // Initialize Maia
        maiaRef.current = new MaiaEngine();
        await maiaRef.current.initialize();
        
      } catch (error) {
        console.error('Engine initialization failed:', error);
        setResult(prev => ({ ...prev, error: 'Failed to initialize engines' }));
      }
    };

    initializeEngines();

    return () => {
      stockfishRef.current?.dispose();
      maiaRef.current?.dispose();
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [enabled, isDesktop]);

  const analyze = useCallback((game: Chess) => {
    if (!enabled || !isDesktop || !stockfishRef.current || !maiaRef.current) return;

    // Clear any pending analysis
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    // Throttle analysis using requestIdleCallback or setTimeout
    const performAnalysis = () => {
      setResult(prev => ({ ...prev, isAnalyzing: true, error: undefined }));

      const fen = game.fen();
      const validMoves = game.moves();

      Promise.all([
        stockfishRef.current!.evaluate(fen, validMoves).catch(err => {
          console.warn('Stockfish evaluation failed:', err);
          return undefined;
        }),
        maiaRef.current!.evaluate(fen, validMoves).catch(err => {
          console.warn('Maia evaluation failed:', err);
          return undefined;
        })
      ]).then(([stockfishResult, maiaResult]) => {
        setResult({
          stockfish: stockfishResult,
          maia: maiaResult,
          isAnalyzing: false
        });
      });
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      analysisTimeoutRef.current = requestIdleCallback(performAnalysis) as any;
    } else {
      analysisTimeoutRef.current = setTimeout(performAnalysis, 100);
    }
  }, [enabled, isDesktop]);

  const clearAnalysis = useCallback(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    setResult({ isAnalyzing: false });
  }, []);

  return { analyze, result, clearAnalysis };
}