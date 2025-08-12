import { useEffect, useState, useRef, useCallback } from 'react';
import { useStockfish } from './useStockfish';
import { parseCp } from '../engines/parseUci';

interface StockfishMoveEvaluation {
  moveType: 'brilliant' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  message: string;
  explanation: string;
  rating: number;
  tactical: string[];
  strategic: string[];
  bestMove?: string;
  evaluation?: string;
}

interface UseStockfishMoveEvaluationProps {
  fen: string;
  lastMoveSan?: string;
}

export function useStockfishMoveEvaluation({ fen, lastMoveSan }: UseStockfishMoveEvaluationProps) {
  const { send, lines, isReady, clearLines } = useStockfish();
  const [currentEvaluation, setCurrentEvaluation] = useState<StockfishMoveEvaluation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const prevFenRef = useRef<string>('');
  const lastCpRef = useRef<number | null>(null);
  const bestMoveRef = useRef<string>('');
  const evaluationRef = useRef<string>('');
  const processedPositionsRef = useRef<Set<string>>(new Set());

  // Only analyze when FEN changes and we haven't processed this position
  useEffect(() => {
    if (!fen || !isReady || fen === prevFenRef.current || processedPositionsRef.current.has(fen)) {
      return;
    }

    setIsAnalyzing(true);
    setCurrentEvaluation(null);
    bestMoveRef.current = '';
    evaluationRef.current = '';

    // Clear previous analysis
    clearLines();

    // Initialize position and analyze
    send('ucinewgame');
    send('isready');
    send(`position fen ${fen}`);
    send('go depth 8'); // Reduced depth to speed up analysis

    prevFenRef.current = fen;
    processedPositionsRef.current.add(fen);
  }, [fen, isReady, send, clearLines]);

  // Parse Stockfish output
  useEffect(() => {
    if (lines.length === 0) return;

    for (const line of lines) {
      if (line.startsWith('bestmove ')) {
        const move = line.split(' ')[1];
        bestMoveRef.current = move;
        setIsAnalyzing(false);
      } else if (line.startsWith('info ') && line.includes('score')) {
        const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
        
        if (scoreMatch) {
          const [, type, value] = scoreMatch;
          if (type === 'cp') {
            const centipawns = parseInt(value);
            const pawns = (centipawns / 100).toFixed(1);
            evaluationRef.current = `${centipawns >= 0 ? '+' : ''}${pawns}`;
          } else if (type === 'mate') {
            const mateIn = parseInt(value);
            evaluationRef.current = `M${mateIn}`;
          }
        }
      }
    }
  }, [lines]);

  // Generate simple move evaluation when analysis completes
  const createMoveEvaluation = useCallback(() => {
    if (!lastMoveSan) {
      return {
        moveType: 'good' as const,
        message: 'Game in progress',
        explanation: 'Continue playing and making good moves!',
        rating: 4,
        tactical: [],
        strategic: ['Game development'],
        bestMove: bestMoveRef.current,
        evaluation: evaluationRef.current
      };
    }

    return {
      moveType: 'good' as const,
      message: `Move ${lastMoveSan} played`,
      explanation: 'Move analysis complete',
      rating: 4,
      tactical: [],
      strategic: ['Position evaluated'],
      bestMove: bestMoveRef.current,
      evaluation: evaluationRef.current
    };
  }, [lastMoveSan]);

  // Simple evaluation trigger when analysis completes
  useEffect(() => {
    const bestMoveLines = lines.filter(line => line.startsWith('bestmove '));
    if (bestMoveLines.length === 0 || !bestMoveRef.current || isAnalyzing) return;

    const evaluation = createMoveEvaluation();
    setCurrentEvaluation(evaluation);
  }, [lines, isAnalyzing, createMoveEvaluation]);

  return {
    evaluation: currentEvaluation,
    isAnalyzing,
    bestMove: bestMoveRef.current,
    stockfishScore: evaluationRef.current
  };
}

// Temporarily disable database saves to stop API spam
async function saveEvaluation(fen: string, score_cp: number, bestmove: string) {
  // Disabled to prevent API spam during development
  return;
}