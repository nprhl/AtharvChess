import React, { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Brain, Sparkles, Star, CheckCircle2, Check, BookOpen, AlertTriangle, X, XCircle, Skull } from 'lucide-react';
import { useMoveClassification } from '../../hooks/useMoveClassification';
import { MoveClassification, type MoveClassificationData } from '../MoveClassification';
import { motion, AnimatePresence } from 'framer-motion';

interface BlunderMeterProps {
  engineAnalysis: any;
  gameMode: 'pvp' | 'pvc';
  playerColor: 'w' | 'b';
  currentTurn: 'w' | 'b';
  currentMove?: string;
  fenBefore?: string;
  fenAfter?: string;
  moveNumber?: number;
  className?: string;
}

export function BlunderMeter({ 
  engineAnalysis, 
  gameMode, 
  playerColor, 
  currentTurn,
  currentMove,
  fenBefore,
  fenAfter,
  moveNumber = 1,
  className = '' 
}: BlunderMeterProps) {
  const [classification, setClassification] = useState<MoveClassificationData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { classifyMove, isClassifying } = useMoveClassification();

  // Classify move when we have all the data
  useEffect(() => {
    if (currentMove && fenBefore && fenAfter) {
      const classifyCurrentMove = async () => {
        const result = await classifyMove({
          move: currentMove,
          fenBefore,
          fenAfter,
          moveNumber
        });
        
        if (result) {
          setClassification(result.classification);
        }
      };
      
      classifyCurrentMove();
    }
  }, [currentMove, fenBefore, fenAfter, moveNumber, classifyMove]);

  // Get classification info for display
  const getClassificationIcon = (category: string) => {
    switch (category) {
      case 'brilliant': return <Sparkles className="w-4 h-4" />;
      case 'great': return <Star className="w-4 h-4" />;
      case 'best': return <CheckCircle2 className="w-4 h-4" />;
      case 'excellent': return <Check className="w-4 h-4" />;
      case 'good': return <CheckCircle2 className="w-4 h-4" />;
      case 'book': return <BookOpen className="w-4 h-4" />;
      case 'inaccuracy': return <AlertTriangle className="w-4 h-4" />;
      case 'mistake': return <X className="w-4 h-4" />;
      case 'miss': return <XCircle className="w-4 h-4" />;
      case 'blunder': return <Skull className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getClassificationColor = (category: string) => {
    switch (category) {
      case 'brilliant': return 'text-green-500 dark:text-green-400';
      case 'great': return 'text-green-600 dark:text-green-500';
      case 'best': return 'text-green-700 dark:text-green-600';
      case 'excellent': return 'text-lime-600 dark:text-lime-500';
      case 'good': return 'text-yellow-600 dark:text-yellow-500';
      case 'book': return 'text-amber-600 dark:text-amber-500';
      case 'inaccuracy': return 'text-orange-600 dark:text-orange-500';
      case 'mistake': return 'text-red-600 dark:text-red-500';
      case 'miss': return 'text-red-700 dark:text-red-600';
      case 'blunder': return 'text-red-800 dark:text-red-700';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getBadgeVariant = (category: string) => {
    switch (category) {
      case 'brilliant':
      case 'great':
      case 'best': return 'default';
      case 'excellent':
      case 'good': return 'secondary';
      case 'book': return 'outline';
      case 'inaccuracy':
      case 'mistake': return 'secondary';
      case 'miss':
      case 'blunder': return 'destructive';
      default: return 'outline';
    }
  };

  const getClassificationTitle = (category: string): string => {
    const titles = {
      brilliant: 'Brilliant!',
      great: 'Great Move',
      best: 'Best Move',
      excellent: 'Excellent',
      good: 'Good Move',
      book: 'Book Move',
      inaccuracy: 'Inaccuracy',
      mistake: 'Mistake',
      miss: 'Missed Opportunity',
      blunder: 'Blunder'
    };
    return titles[category as keyof typeof titles] || 'Move Analysis';
  };

  // Show loading state or analysis result
  const renderAnalysisContent = () => {
    if (isClassifying) {
      return (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-4"
        >
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Brain className="w-4 h-4 animate-pulse" />
            <span className="text-sm">Analyzing move...</span>
          </div>
        </motion.div>
      );
    }

    if (!classification) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <Brain className="w-4 h-4" />
            <span className="text-sm">Make a move to see analysis</span>
          </div>
        </div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-3"
      >
        {/* Main classification display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`${getClassificationColor(classification.category)}`}>
              {getClassificationIcon(classification.category)}
            </div>
            <div>
              <h3 className="font-medium text-sm">
                {getClassificationTitle(classification.category)}
              </h3>
              {currentMove && (
                <p className="text-xs text-muted-foreground">
                  Move {moveNumber}: {currentMove}
                </p>
              )}
            </div>
          </div>
          
          {/* Accuracy display */}
          <div className="text-right">
            <div className={`text-lg font-bold ${classification.accuracy >= 85 ? 'text-green-600' : classification.accuracy >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
              {classification.accuracy}%
            </div>
            {classification.centipawnLoss > 0 && (
              <div className="text-xs text-muted-foreground">
                -{classification.centipawnLoss}cp
              </div>
            )}
          </div>
        </div>

        {/* Classification explanation */}
        <div className="text-sm text-muted-foreground leading-relaxed">
          {classification.explanation}
        </div>

        {/* Additional details */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="capitalize">
            {classification.gamePhase}
            {classification.isBookMove && ' • Theory'}
            {classification.isOnlyMove && ' • Forced'}
          </span>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {showDetails ? 'Less' : 'More'} details
          </button>
        </div>

        {/* Detailed analysis (expandable) */}
        <AnimatePresence>
          {showDetails && classification.alternativeMoves && classification.alternativeMoves.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="text-xs text-muted-foreground border-t pt-2"
            >
              <div>
                <span className="font-medium">Alternative moves: </span>
                {classification.alternativeMoves.join(', ')}
              </div>
              
              {classification.positionComplexity && classification.positionComplexity > 70 && (
                <div className="mt-1">
                  <span className="font-medium">Position complexity: </span>
                  <span className="text-orange-600 dark:text-orange-400">
                    High ({classification.positionComplexity}%)
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Visual accuracy indicator */}
        <div className="mt-3">
          <div className="flex text-xs text-muted-foreground mb-1">
            <span>Accuracy</span>
            <span className="ml-auto">{classification.accuracy}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${classification.accuracy}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-2 rounded-full transition-all duration-300 ${
                classification.accuracy >= 95 ? 'bg-green-500' :
                classification.accuracy >= 85 ? 'bg-green-400' :
                classification.accuracy >= 70 ? 'bg-yellow-500' :
                classification.accuracy >= 50 ? 'bg-orange-500' :
                'bg-red-500'
              }`}
            />
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="w-4 h-4" />
          Chess.com Analysis
          {classification && (
            <Badge variant={getBadgeVariant(classification.category)} className="ml-auto">
              {classification.category}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {renderAnalysisContent()}
      </CardContent>
    </Card>
  );
}