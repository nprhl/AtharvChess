import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Zap, TrendingUp, TrendingDown, Minus } from "lucide-react";
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

interface EngineAnalysisPanelProps {
  analysis: AnalysisResult;
  className?: string;
}

export function EngineAnalysisPanel({ analysis, className = "" }: EngineAnalysisPanelProps) {
  const { stockfish, maia, isAnalyzing, error } = analysis;

  const formatScore = (score: number): { display: string; color: string; icon: JSX.Element } => {
    if (Math.abs(score) < 10) {
      return {
        display: `${score > 0 ? '+' : ''}${(score / 100).toFixed(2)}`,
        color: score > 0 ? "text-green-600" : score < 0 ? "text-red-600" : "text-gray-600",
        icon: score > 0 ? <TrendingUp className="w-3 h-3" /> : score < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />
      };
    } else {
      const isWinning = score > 0;
      return {
        display: isWinning ? `+M${Math.ceil(Math.abs(score - 1000) / 100)}` : `-M${Math.ceil(Math.abs(score + 1000) / 100)}`,
        color: isWinning ? "text-green-600 font-bold" : "text-red-600 font-bold",
        icon: isWinning ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
      };
    }
  };

  const formatMove = (move: string): string => {
    // Convert move notation to more readable format
    return move.length === 4 
      ? `${move.slice(0, 2)}-${move.slice(2, 4)}`
      : move;
  };

  if (error) {
    return (
      <Card className={`${className} border-red-200`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-red-600">
            <Brain className="w-4 h-4" />
            Engine Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="w-4 h-4" />
          Engine Analysis
          {isAnalyzing && <Zap className="w-3 h-3 animate-pulse text-yellow-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stockfish Analysis */}
        {stockfish ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">Stockfish</span>
              <Badge variant="outline" className="text-xs">
                Depth {stockfish.depth}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 ${formatScore(stockfish.score).color}`}>
                {formatScore(stockfish.score).icon}
                <span className="font-mono text-sm">
                  {formatScore(stockfish.score).display}
                </span>
              </div>
              
              {stockfish.bestMove && (
                <div className="text-xs text-gray-600">
                  Best: <span className="font-mono font-medium">{formatMove(stockfish.bestMove)}</span>
                </div>
              )}
            </div>
            
            {stockfish.pv && stockfish.pv.length > 1 && (
              <div className="text-xs text-gray-500">
                PV: {stockfish.pv.slice(0, 3).map(formatMove).join(' ')}
                {stockfish.pv.length > 3 && '...'}
              </div>
            )}
          </div>
        ) : isAnalyzing ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">Stockfish</span>
              <div className="animate-pulse text-xs text-gray-400">Analyzing...</div>
            </div>
            <Progress value={undefined} className="h-1" />
          </div>
        ) : null}

        {/* Maia Analysis */}
        {maia ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">Maia</span>
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                Neural
              </Badge>
            </div>
            
            <div className="space-y-1">
              {maia.topMoves.slice(0, 3).map(({ move, probability }, index) => (
                <div key={move} className="flex items-center gap-2">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-xs w-3 text-gray-400">#{index + 1}</span>
                    <span className="font-mono text-xs font-medium">{formatMove(move)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <Progress 
                        value={probability * 100} 
                        className="h-1.5 flex-1"
                      />
                      <span className="text-xs text-gray-500 min-w-0">
                        {(probability * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : isAnalyzing ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">Maia</span>
              <div className="animate-pulse text-xs text-gray-400">Analyzing...</div>
            </div>
            <Progress value={undefined} className="h-1" />
          </div>
        ) : null}

        {!stockfish && !maia && !isAnalyzing && (
          <div className="text-center py-4">
            <Brain className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-400">Make a move to see engine analysis</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}