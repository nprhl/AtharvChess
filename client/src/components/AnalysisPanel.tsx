import { useEffect, useState } from 'react';
import { useStockfish } from '../hooks/useStockfish';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Cpu, Zap, Clock } from 'lucide-react';

interface AnalysisPanelProps {
  fen: string;
  isVisible?: boolean;
}

export default function AnalysisPanel({ fen, isVisible = true }: AnalysisPanelProps) {
  const { send, lines, isReady } = useStockfish();
  const [bestMove, setBestMove] = useState<string>('');
  const [evaluation, setEvaluation] = useState<string>('');
  const [depth, setDepth] = useState<number>(0);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!fen || !isReady) return;
    
    setAnalyzing(true);
    setBestMove('');
    setEvaluation('');
    setDepth(0);
    
    // Initialize position and analyze
    send('ucinewgame');
    send('isready');
    send(`position fen ${fen}`);
    send('go depth 10');
  }, [fen, isReady, send]);

  useEffect(() => {
    // Parse engine output
    for (const line of lines) {
      if (line.startsWith('bestmove ')) {
        const move = line.split(' ')[1];
        setBestMove(move);
        setAnalyzing(false);
      } else if (line.startsWith('info ')) {
        // Extract evaluation and depth from info lines
        const depthMatch = line.match(/depth (\d+)/);
        const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
        
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
      }
    }
  }, [lines]);

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