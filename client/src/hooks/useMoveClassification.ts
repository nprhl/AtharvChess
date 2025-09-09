import { useState, useCallback } from 'react';
import type { MoveClassificationData, OpeningInfo } from '@/components/MoveClassification';

interface ClassificationRequest {
  move: string;
  fenBefore: string;
  fenAfter: string;
  moveNumber: number;
  gameHistory?: string[];
}

interface ClassificationResponse {
  classification: MoveClassificationData;
  openingInfo?: OpeningInfo;
  moveNumber: number;
  timestamp: string;
}

interface MoveAnalysisRequest {
  move: string;
  fenBefore: string;
  fenAfter?: string;
  moveNumber: number;
  gameHistory?: string[];
  includeClassification?: boolean;
}

interface MoveAnalysisResponse {
  move: string;
  moveNumber: number;
  analysis?: {
    bestMove: string;
    evaluation: number;
    depth: number;
    engine: string;
  };
  classification?: MoveClassificationData;
  openingInfo?: OpeningInfo;
  timestamp: string;
}

interface UseMoveClassificationReturn {
  classifyMove: (request: ClassificationRequest) => Promise<ClassificationResponse | null>;
  analyzeMove: (request: MoveAnalysisRequest) => Promise<MoveAnalysisResponse | null>;
  isClassifying: boolean;
  isAnalyzing: boolean;
  error: string | null;
  clearError: () => void;
}

export function useMoveClassification(): UseMoveClassificationReturn {
  const [isClassifying, setIsClassifying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const classifyMove = useCallback(async (request: ClassificationRequest): Promise<ClassificationResponse | null> => {
    try {
      setIsClassifying(true);
      setError(null);

      console.log(`[useMoveClassification] Classifying move: ${request.move} (move ${request.moveNumber})`);

      const response = await fetch('/api/ai/classify-move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ClassificationResponse = await response.json();
      
      console.log(`[useMoveClassification] Move ${request.move} classified as: ${data.classification.category} (${data.classification.accuracy}% accuracy)`);
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to classify move';
      console.error('[useMoveClassification] Classification error:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsClassifying(false);
    }
  }, []);

  const analyzeMove = useCallback(async (request: MoveAnalysisRequest): Promise<MoveAnalysisResponse | null> => {
    try {
      setIsAnalyzing(true);
      setError(null);

      console.log(`[useMoveClassification] Analyzing move: ${request.move} (move ${request.moveNumber})`);

      const response = await fetch('/api/ai/analyze-move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          includeClassification: request.includeClassification ?? true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: MoveAnalysisResponse = await response.json();
      
      console.log(`[useMoveClassification] Move ${request.move} analyzed:`, {
        classification: data.classification?.category,
        accuracy: data.classification?.accuracy,
        bestMove: data.analysis?.bestMove,
        evaluation: data.analysis?.evaluation
      });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze move';
      console.error('[useMoveClassification] Analysis error:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    classifyMove,
    analyzeMove,
    isClassifying,
    isAnalyzing,
    error,
    clearError,
  };
}

// Hook for batch move classification (for game analysis)
export function useBatchMoveClassification() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const classifyGameMoves = useCallback(async (
    moves: Array<{
      move: string;
      fenBefore: string;
      fenAfter: string;
      moveNumber: number;
    }>
  ): Promise<ClassificationResponse[]> => {
    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);

      console.log(`[useBatchMoveClassification] Processing ${moves.length} moves`);

      const results: ClassificationResponse[] = [];
      
      for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        
        try {
          const response = await fetch('/api/ai/classify-move', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(move),
          });

          if (response.ok) {
            const data: ClassificationResponse = await response.json();
            results.push(data);
          } else {
            console.warn(`[useBatchMoveClassification] Failed to classify move ${i + 1}:`, move.move);
            // Add fallback classification
            results.push({
              classification: {
                category: 'good',
                centipawnLoss: 50,
                accuracy: 75,
                explanation: `Move ${move.move} (analysis unavailable)`,
                icon: '✔',
                color: '#FFEB3B',
                gamePhase: 'middlegame'
              },
              moveNumber: move.moveNumber,
              timestamp: new Date().toISOString()
            });
          }

          // Update progress
          setProgress(((i + 1) / moves.length) * 100);
          
          // Small delay to prevent overwhelming the server
          if (i < moves.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (moveError) {
          console.warn(`[useBatchMoveClassification] Error processing move ${i + 1}:`, moveError);
          // Continue with next move
        }
      }

      console.log(`[useBatchMoveClassification] Completed processing ${results.length}/${moves.length} moves`);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process game moves';
      console.error('[useBatchMoveClassification] Batch processing error:', errorMessage);
      setError(errorMessage);
      return [];
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    classifyGameMoves,
    isProcessing,
    progress,
    error,
    clearError,
  };
}

// Hook for real-time move classification during gameplay
export function useRealTimeMoveClassification() {
  const [currentClassification, setCurrentClassification] = useState<ClassificationResponse | null>(null);
  const [history, setHistory] = useState<ClassificationResponse[]>([]);
  const { classifyMove, isClassifying, error } = useMoveClassification();

  const classifyAndStore = useCallback(async (request: ClassificationRequest) => {
    const result = await classifyMove(request);
    
    if (result) {
      setCurrentClassification(result);
      setHistory(prev => [...prev, result]);
    }
    
    return result;
  }, [classifyMove]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentClassification(null);
  }, []);

  const getGameSummary = useCallback(() => {
    if (history.length === 0) return null;

    const totalAccuracy = history.reduce((sum, move) => sum + move.classification.accuracy, 0);
    const averageAccuracy = totalAccuracy / history.length;

    const categories = history.reduce((acc, move) => {
      const category = move.classification.category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalMoves: history.length,
      averageAccuracy: Math.round(averageAccuracy * 10) / 10,
      categories,
      bestMove: history.find(move => move.classification.category === 'brilliant') || 
                history.find(move => move.classification.category === 'great') ||
                history.find(move => move.classification.accuracy === Math.max(...history.map(m => m.classification.accuracy))),
      worstMove: history.find(move => move.classification.category === 'blunder') ||
                 history.find(move => move.classification.category === 'mistake') ||
                 history.find(move => move.classification.accuracy === Math.min(...history.map(m => m.classification.accuracy)))
    };
  }, [history]);

  return {
    classifyMove: classifyAndStore,
    currentClassification,
    history,
    clearHistory,
    getGameSummary,
    isClassifying,
    error
  };
}