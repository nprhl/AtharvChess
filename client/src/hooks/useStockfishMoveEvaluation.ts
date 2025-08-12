import { useEffect, useState, useRef } from 'react';
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
  onEvaluationReady?: (evaluation: StockfishMoveEvaluation) => void;
}

export function useStockfishMoveEvaluation({ fen, onEvaluationReady }: UseStockfishMoveEvaluationProps) {
  const { send, lines, isReady, clearLines } = useStockfish();
  const [currentEvaluation, setCurrentEvaluation] = useState<StockfishMoveEvaluation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const prevFenRef = useRef<string>('');
  const lastCpRef = useRef<number | null>(null);
  const bestMoveRef = useRef<string>('');
  const evaluationRef = useRef<string>('');

  // Analyze position when FEN changes
  useEffect(() => {
    if (!fen || !isReady || fen === prevFenRef.current) return;

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
    send('go depth 12'); // Slightly deeper for better evaluation

    prevFenRef.current = fen;
  }, [fen, isReady, send, clearLines]);

  // Parse Stockfish output
  useEffect(() => {
    if (lines.length === 0) return;

    for (const line of lines) {
      if (line.startsWith('bestmove ')) {
        const move = line.split(' ')[1];
        bestMoveRef.current = move;
        setIsAnalyzing(false);
      } else if (line.startsWith('info ')) {
        // Extract evaluation from info lines
        const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
        
        if (scoreMatch) {
          const [, type, value] = scoreMatch;
          if (type === 'cp') {
            const centipawns = parseInt(value);
            const pawns = (centipawns / 100).toFixed(1);
            evaluationRef.current = `${pawns > '0' ? '+' : ''}${pawns}`;
          } else if (type === 'mate') {
            const mateIn = parseInt(value);
            evaluationRef.current = `M${mateIn}`;
          }
        }
      }
    }
  }, [lines]);

  // Generate move evaluation when analysis completes
  useEffect(() => {
    const bestMoveLines = lines.filter(line => line.startsWith('bestmove '));
    if (bestMoveLines.length === 0 || !bestMoveRef.current) return;

    // Get the final evaluation from the latest analysis
    const latestInfo = [...lines].reverse().find(l => l.startsWith('info ') && l.includes(' score '));
    if (!latestInfo) return;

    const currentCp = parseCp(latestInfo);
    if (currentCp === null) return;

    let moveEvaluation: StockfishMoveEvaluation;

    // Determine move quality based on evaluation change
    if (lastCpRef.current !== null) {
      const swing = currentCp - lastCpRef.current;
      
      if (swing < -300) {
        moveEvaluation = {
          moveType: 'blunder',
          message: 'Blunder! This move loses significant material or position.',
          explanation: `This move cost you ${Math.abs(Math.round(swing / 100))} points of evaluation. Consider the computer's suggestion: ${bestMoveRef.current}`,
          rating: 1,
          tactical: ['Major material loss', 'Positional weakness'],
          strategic: ['Loss of initiative', 'King safety compromised']
        };
      } else if (swing < -150) {
        moveEvaluation = {
          moveType: 'mistake',
          message: 'Mistake. This move gives away some advantage.',
          explanation: `This move lost ${Math.abs(Math.round(swing / 100))} points. A better option was: ${bestMoveRef.current}`,
          rating: 2,
          tactical: ['Tactical oversight'],
          strategic: ['Positional inaccuracy']
        };
      } else if (swing < -50) {
        moveEvaluation = {
          moveType: 'inaccuracy',
          message: 'Inaccuracy. A slightly suboptimal move.',
          explanation: `This move is playable but not the most accurate. Best was: ${bestMoveRef.current}`,
          rating: 3,
          tactical: [],
          strategic: ['Minor positional loss']
        };
      } else if (swing > 100) {
        moveEvaluation = {
          moveType: 'excellent',
          message: 'Excellent move! Well played.',
          explanation: 'This move significantly improves your position and follows sound chess principles.',
          rating: 5,
          tactical: ['Strong tactical play'],
          strategic: ['Improved position', 'Initiative gained']
        };
      } else if (swing > 20) {
        moveEvaluation = {
          moveType: 'good',
          message: 'Good move! Solid choice.',
          explanation: 'This move improves your position and maintains your advantage.',
          rating: 4,
          tactical: [],
          strategic: ['Solid positional play']
        };
      } else {
        moveEvaluation = {
          moveType: 'good',
          message: 'Good move! Keep it up.',
          explanation: 'This move maintains the balance and follows good chess principles.',
          rating: 4,
          tactical: [],
          strategic: ['Consistent play']
        };
      }
    } else {
      // First move - default to good
      moveEvaluation = {
        moveType: 'good',
        message: 'Game started! Good luck.',
        explanation: 'Opening moves should focus on controlling the center and developing pieces.',
        rating: 4,
        tactical: [],
        strategic: ['Opening principles']
      };
    }

    // Add Stockfish data
    moveEvaluation.bestMove = bestMoveRef.current;
    moveEvaluation.evaluation = evaluationRef.current;

    setCurrentEvaluation(moveEvaluation);
    if (onEvaluationReady) {
      onEvaluationReady(moveEvaluation);
    }

    // Update reference for next comparison
    lastCpRef.current = currentCp;

    // Fire-and-forget save evaluation to database
    saveEvaluation(fen, currentCp, bestMoveRef.current);
  }, [lines, fen, onEvaluationReady]);

  return {
    evaluation: currentEvaluation,
    isAnalyzing
  };
}

// Fire-and-forget function to save evaluation to database
async function saveEvaluation(fen: string, score_cp: number, bestmove: string) {
  try {
    await fetch('/api/evals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        fen, 
        depth: 12, 
        engine: 'stockfish-wasm', 
        score_cp, 
        bestmove 
      })
    });
  } catch {
    // Silent fail - don't block UI
  }
}