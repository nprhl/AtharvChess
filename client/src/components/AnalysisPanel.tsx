import { useEffect, useState, useRef } from 'react';
import { useStockfish } from '../hooks/useStockfish';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Cpu, Zap, Clock, AlertTriangle, MessageCircle } from 'lucide-react';
import { parseCp } from '../engines/parseUci';

// Fire-and-forget function to save evaluation to database
async function saveEval(fen: string, depth: number, engine: string, score_cp: number, bestmove: string, pv?: string) {
  try {
    await fetch('/api/evals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fen, depth, engine, score_cp, bestmove, pv })
    });
  } catch {
    // Silent fail - don't block UI
  }
}

interface AnalysisPanelProps {
  fen: string;
  isVisible?: boolean;
}

export default function AnalysisPanel({ fen, isVisible = true }: AnalysisPanelProps) {
  const { send, lines, isReady, clearLines } = useStockfish();
  const [bestMove, setBestMove] = useState<string>('');
  const [evaluation, setEvaluation] = useState<string>('');
  const [depth, setDepth] = useState<number>(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [cp, setCp] = useState<number | null>(null);
  const [blunder, setBlunder] = useState<string | null>(null);
  const [pv, setPv] = useState<string>('');
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const prevFenRef = useRef<string>('');
  const lastCpRef = useRef<number | null>(null);
  const blunderDataRef = useRef<{ fen: string; bestmove: string; cp_before: number; cp_after: number } | null>(null);

  useEffect(() => {
    if (!fen || !isReady) return;
    
    // Only analyze if FEN actually changed
    if (fen === prevFenRef.current) return;
    
    // Clear blunder message and explanation when analyzing new position
    if (prevFenRef.current !== '') {
      setBlunder(null);
      setExplanation(null);
    }
    
    setAnalyzing(true);
    setBestMove('');
    setEvaluation('');
    setDepth(0);
    setPv('');
    
    // Clear previous analysis
    clearLines();
    
    // Initialize position and analyze
    send('ucinewgame');
    send('isready');
    send(`position fen ${fen}`);
    send('go depth 10');
    
    prevFenRef.current = fen;
  }, [fen, isReady, send, clearLines]);

  useEffect(() => {
    if (lines.length === 0) return;
    
    // Parse engine output
    for (const line of lines) {
      if (line.startsWith('bestmove ')) {
        const move = line.split(' ')[1];
        setBestMove(move);
        setAnalyzing(false);
      } else if (line.startsWith('info ')) {
        // Extract evaluation, depth, and PV from info lines
        const depthMatch = line.match(/depth (\d+)/);
        const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
        const pvMatch = line.match(/pv (.+)/);
        
        if (depthMatch) {
          setDepth(parseInt(depthMatch[1]));
        }
        
        if (scoreMatch) {
          const [, type, value] = scoreMatch;
          if (type === 'cp') {
            const centipawns = parseInt(value);
            const pawns = (centipawns / 100).toFixed(1);
            setEvaluation(`${pawns > '0' ? '+' : ''}${pawns}`);
          } else if (type === 'mate') {
            const mateIn = parseInt(value);
            setEvaluation(`M${mateIn}`);
          }
        }
        
        if (pvMatch) {
          setPv(pvMatch[1]);
        }
      }
    }
  }, [lines]);

  // Blunder detection when analysis completes
  useEffect(() => {
    // Only check for blunders when we have a bestmove (analysis complete)
    const bestMoveLines = lines.filter(line => line.startsWith('bestmove '));
    if (bestMoveLines.length === 0) return;

    // Get the final evaluation from the latest analysis
    const latestInfo = [...lines].reverse().find(l => l.startsWith('info ') && l.includes(' score '));
    if (latestInfo) {
      const currentCp = parseCp(latestInfo);
      if (currentCp !== null) {
        setCp(currentCp);
        
        // Check for blunder compared to previous position
        if (lastCpRef.current !== null) {
          const swing = currentCp - lastCpRef.current;
          // Detect blunder (evaluation drop of 150+ centipawns)
          if (swing < -150) {
            setBlunder(`Blunder detected (−${Math.abs(swing)} cp).`);
            // Store blunder data for explanation
            blunderDataRef.current = {
              fen: fen,
              bestmove: bestMove || 'unknown',
              cp_before: lastCpRef.current,
              cp_after: currentCp
            };
          }
        }
        
        // Update reference for next comparison
        lastCpRef.current = currentCp;
      }
    }
  }, [lines]);

  // Fire-and-forget cache-on-write when we have complete analysis
  useEffect(() => {
    if (bestMove && cp !== null && fen && depth >= 10) {
      saveEval(fen, depth, 'stockfish-wasm', cp, bestMove, pv);
    }
  }, [bestMove, cp, fen, depth, pv]);

  // Function to get blunder explanation
  const explainBlunder = async () => {
    if (!blunderDataRef.current) return;
    
    setLoadingExplanation(true);
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blunderDataRef.current)
      });
      
      if (response.ok) {
        const data = await response.json();
        setExplanation(data.explanation);
      } else {
        setExplanation("Sorry, I can't explain this move right now.");
      }
    } catch (error) {
      setExplanation("Sorry, I can't explain this move right now.");
    } finally {
      setLoadingExplanation(false);
    }
  };

  if (!isVisible) return null;

  return (
    <Card className="w-full bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Cpu className="w-4 h-4" />
          Stockfish Analysis
          {!isReady && <Badge variant="outline">Loading...</Badge>}
          {analyzing && <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Analyzing
          </Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Blunder Alert */}
        {blunder && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive font-medium">{blunder}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={explainBlunder}
                disabled={loadingExplanation}
                className="text-xs h-7"
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                {loadingExplanation ? 'Loading...' : 'Explain'}
              </Button>
            </div>
            
            {/* Explanation */}
            {explanation && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                  {explanation}
                </p>
              </div>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">Best Move</div>
            <div className="font-mono font-medium">
              {bestMove || (analyzing ? '...' : '—')}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Evaluation</div>
            <div className="font-mono font-medium">
              {evaluation || (analyzing ? '...' : '—')}
            </div>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="text-muted-foreground text-sm">Analysis Depth</div>
          <div className="flex items-center gap-2">
            <div className="bg-secondary rounded-full h-2 flex-1">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(depth / 10) * 100}%` }}
              />
            </div>
            <span className="text-sm font-mono min-w-[3ch]">{depth}/10</span>
          </div>
        </div>

        {/* Engine output debug (last few lines) */}
        <details className="text-xs">
          <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
            Engine Output
          </summary>
          <pre className="mt-2 p-2 bg-secondary rounded text-xs overflow-auto max-h-32">
            {lines.slice(-10).join('\n') || 'No output yet...'}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}