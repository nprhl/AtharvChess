import React, { useMemo, useEffect, useRef } from 'react';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AlertTriangle, CheckCircle, TrendingUp, Brain } from 'lucide-react';
import { calculateBlunderMeter, type BlunderMeterResult } from '../../lib/blunder-calculation';
import { speakHint } from '@/lib/tts';

interface BlunderMeterProps {
  engineAnalysis: any;
  gameMode: 'pvp' | 'pvc';
  playerColor: 'w' | 'b';
  currentTurn: 'w' | 'b';
  className?: string;
}

export function BlunderMeter({ 
  engineAnalysis, 
  gameMode, 
  playerColor, 
  currentTurn, 
  className = '' 
}: BlunderMeterProps) {
  const previousAnalysis = useRef<any>(null);
  
  const blunderResult: BlunderMeterResult = useMemo(() => {
    if (!engineAnalysis) {
      return {
        blunder: 0.33,
        ok: 0.34,
        good: 0.33,
        moveQuality: 'ok',
        description: 'Analysis starting...'
      };
    }

    return calculateBlunderMeter(engineAnalysis, gameMode, playerColor, currentTurn);
  }, [engineAnalysis, gameMode, playerColor, currentTurn]);

  // Provide intelligent speech feedback based on move analysis
  useEffect(() => {
    if (!engineAnalysis || !previousAnalysis.current) {
      previousAnalysis.current = engineAnalysis;
      return;
    }

    const { moveQuality, description } = blunderResult;
    
    // Only speak for significant moves (not routine "ok" moves)
    if (moveQuality === 'brilliant' || moveQuality === 'excellent') {
      speakHint(`Excellent move! ${description}`);
    } else if (moveQuality === 'blunder') {
      const bestMove = engineAnalysis.stockfish?.bestMove;
      const suggestion = bestMove ? ` Consider ${bestMove} instead.` : '';
      speakHint(`That was a blunder. ${description}${suggestion}`);
    } else if (moveQuality === 'mistake') {
      const bestMove = engineAnalysis.stockfish?.bestMove;
      const suggestion = bestMove ? ` A better move would be ${bestMove}.` : '';
      speakHint(`Not the best move. ${description}${suggestion}`);
    }
    
    previousAnalysis.current = engineAnalysis;
  }, [blunderResult, engineAnalysis]);

  const { blunder, ok, good, moveQuality, description } = blunderResult;

  // Convert probabilities to percentages for display
  const blunderPercent = Math.round(blunder * 100);
  const okPercent = Math.round(ok * 100);
  const goodPercent = Math.round(good * 100);

  // Get color and icon based on dominant category
  const getDominantCategory = () => {
    if (good >= blunder && good >= ok) return 'good';
    if (blunder >= ok) return 'blunder';
    return 'ok';
  };

  const dominantCategory = getDominantCategory();

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'good': return 'text-green-600 dark:text-green-400';
      case 'blunder': return 'text-red-600 dark:text-red-400';
      default: return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'good': return <CheckCircle className="w-4 h-4" />;
      case 'blunder': return <AlertTriangle className="w-4 h-4" />;
      default: return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getBadgeVariant = (quality: string) => {
    switch (quality) {
      case 'brilliant':
      case 'excellent': return 'default';
      case 'good': return 'secondary';
      case 'ok': return 'outline';
      case 'inaccuracy':
      case 'mistake': return 'secondary';
      case 'blunder': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="w-4 h-4" />
          Real-Time Analysis
          <Badge variant={getBadgeVariant(moveQuality)} className="ml-auto">
            {moveQuality}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Description */}
        <p className={`text-sm font-medium ${getCategoryColor(dominantCategory)} flex items-center gap-2`}>
          {getCategoryIcon(dominantCategory)}
          {description}
        </p>

        {/* Progress Bars */}
        <div className="space-y-2">
          {/* Good moves probability */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-green-600 dark:text-green-400 font-medium">Good</span>
              <span className="text-muted-foreground">{goodPercent}%</span>
            </div>
            <Progress 
              value={goodPercent} 
              className="h-2 bg-muted"
              style={{
                '--progress-background': 'hsl(142.1 76.2% 36.3%)',
                '--progress-foreground': 'hsl(142.1 70.6% 45.3%)'
              } as React.CSSProperties}
            />
          </div>

          {/* OK moves probability */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">OK</span>
              <span className="text-muted-foreground">{okPercent}%</span>
            </div>
            <Progress 
              value={okPercent} 
              className="h-2 bg-muted"
              style={{
                '--progress-background': 'hsl(45.4 93.4% 47.5%)',
                '--progress-foreground': 'hsl(45.4 93.4% 47.5%)'
              } as React.CSSProperties}
            />
          </div>

          {/* Blunder probability */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-red-600 dark:text-red-400 font-medium">Blunder Risk</span>
              <span className="text-muted-foreground">{blunderPercent}%</span>
            </div>
            <Progress 
              value={blunderPercent} 
              className="h-2 bg-muted"
              style={{
                '--progress-background': 'hsl(0 84.2% 60.2%)',
                '--progress-foreground': 'hsl(0 84.2% 60.2%)'
              } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Combined Visual Meter */}
        <div className="mt-3">
          <div className="flex text-xs text-muted-foreground mb-1">
            <span>Risk</span>
            <span className="ml-auto">Opportunity</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-muted">
            <div 
              className="bg-red-500 dark:bg-red-400 transition-all duration-500" 
              style={{ width: `${blunderPercent}%` }}
            />
            <div 
              className="bg-yellow-500 dark:bg-yellow-400 transition-all duration-500" 
              style={{ width: `${okPercent}%` }}
            />
            <div 
              className="bg-green-500 dark:bg-green-400 transition-all duration-500" 
              style={{ width: `${goodPercent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}