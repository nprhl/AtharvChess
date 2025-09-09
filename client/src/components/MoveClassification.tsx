import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface MoveClassificationData {
  category: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder';
  centipawnLoss: number;
  accuracy: number;
  explanation: string;
  icon: string;
  color: string;
  isOnlyMove?: boolean;
  isBookMove?: boolean;
  alternativeMoves?: string[];
  positionComplexity?: number;
  gamePhase: 'opening' | 'middlegame' | 'endgame';
}

export interface OpeningInfo {
  name: string;
  popularity: number;
  successRate?: number;
  description: string;
  variations?: string[];
}

interface MoveClassificationProps {
  move: string;
  classification: MoveClassificationData;
  openingInfo?: OpeningInfo;
  moveNumber: number;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function MoveClassification({
  move,
  classification,
  openingInfo,
  moveNumber,
  showDetails = true,
  compact = false,
  className
}: MoveClassificationProps) {
  const getCategoryTitle = (category: string): string => {
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
    return titles[category as keyof typeof titles] || 'Move';
  };

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 95) return 'text-green-600';
    if (accuracy >= 85) return 'text-green-500';
    if (accuracy >= 70) return 'text-yellow-500';
    if (accuracy >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getCategoryGradient = (category: string): string => {
    const gradients = {
      brilliant: 'from-green-400 to-emerald-600',
      great: 'from-green-300 to-green-500',
      best: 'from-green-200 to-green-400',
      excellent: 'from-lime-200 to-lime-400',
      good: 'from-yellow-200 to-yellow-400',
      book: 'from-amber-200 to-amber-400',
      inaccuracy: 'from-orange-200 to-orange-400',
      mistake: 'from-red-200 to-red-400',
      miss: 'from-red-300 to-red-500',
      blunder: 'from-red-400 to-red-600'
    };
    return gradients[category as keyof typeof gradients] || 'from-gray-200 to-gray-400';
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
          `bg-gradient-to-r ${getCategoryGradient(classification.category)}`,
          className
        )}
      >
        <span className="text-sm">{classification.icon}</span>
        <span className="text-white drop-shadow-sm">
          {classification.accuracy}%
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-lg',
              `bg-gradient-to-r ${getCategoryGradient(classification.category)}`
            )}
          >
            {classification.icon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {getCategoryTitle(classification.category)}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Move {moveNumber}: {move}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className={cn('text-2xl font-bold', getAccuracyColor(classification.accuracy))}>
            {classification.accuracy}%
          </div>
          {classification.centipawnLoss > 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              -{classification.centipawnLoss}cp
            </div>
          )}
        </div>
      </div>

      {/* Opening Information */}
      {openingInfo && (
        <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber-600 dark:text-amber-400 font-medium">📖</span>
            <h4 className="font-medium text-amber-800 dark:text-amber-200">
              {openingInfo.name}
            </h4>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {openingInfo.description}
          </p>
          {openingInfo.popularity && (
            <div className="flex items-center gap-4 mt-2 text-xs text-amber-600 dark:text-amber-400">
              <span>Popularity: {openingInfo.popularity}%</span>
              {openingInfo.successRate && (
                <span>Success Rate: {openingInfo.successRate}%</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Explanation */}
      {showDetails && (
        <div className="mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {classification.explanation}
          </p>
        </div>
      )}

      {/* Additional Details */}
      {showDetails && (
        <div className="space-y-2">
          {/* Alternative Moves */}
          {classification.alternativeMoves && classification.alternativeMoves.length > 0 && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">Alternative moves: </span>
              {classification.alternativeMoves.join(', ')}
            </div>
          )}

          {/* Position Complexity */}
          {classification.positionComplexity && classification.positionComplexity > 70 && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">Position complexity: </span>
              <span className="text-orange-600 dark:text-orange-400">High ({classification.positionComplexity}%)</span>
            </div>
          )}

          {/* Special Indicators */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              {classification.gamePhase} • 
              {classification.isOnlyMove && <span className="text-blue-600 dark:text-blue-400 ml-1">Only move</span>}
              {classification.isBookMove && <span className="text-amber-600 dark:text-amber-400 ml-1">Theory</span>}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Mini classification badge for move history
export function MoveClassificationBadge({
  classification,
  className
}: {
  classification: MoveClassificationData;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white',
        className
      )}
      style={{ backgroundColor: classification.color }}
      title={`${classification.category} (${classification.accuracy}%)`}
    >
      {classification.icon}
    </div>
  );
}

// Accuracy chart component
export function AccuracyChart({
  moves,
  className
}: {
  moves: Array<{ move: string; classification: MoveClassificationData }>;
  className?: string;
}) {
  const maxAccuracy = 100;
  
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg p-4', className)}>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
        Move Accuracy
      </h3>
      
      <div className="flex items-end space-x-1 h-32">
        {moves.map((moveData, index) => (
          <div
            key={index}
            className="flex flex-col items-center group relative"
          >
            {/* Bar */}
            <div
              className="w-3 bg-gradient-to-t from-blue-400 to-blue-600 rounded-t transition-all duration-200 group-hover:from-blue-500 group-hover:to-blue-700"
              style={{
                height: `${(moveData.classification.accuracy / maxAccuracy) * 100}%`,
                minHeight: '4px'
              }}
            />
            
            {/* Move indicator */}
            <div className="mt-1">
              <MoveClassificationBadge 
                classification={moveData.classification}
                className="w-4 h-4 text-xs"
              />
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                {moveData.move}: {moveData.classification.accuracy}%
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Y-axis labels */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// Move classification summary
export function ClassificationSummary({
  moves,
  className
}: {
  moves: Array<{ classification: MoveClassificationData }>;
  className?: string;
}) {
  const summary = moves.reduce((acc, { classification }) => {
    acc[classification.category] = (acc[classification.category] || 0) + 1;
    acc.totalAccuracy += classification.accuracy;
    return acc;
  }, { totalAccuracy: 0 } as Record<string, number>);

  const averageAccuracy = moves.length > 0 ? summary.totalAccuracy / moves.length : 0;

  const categoryOrder = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];
  
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Game Summary
        </h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {averageAccuracy.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Average Accuracy
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {categoryOrder.map(category => {
          const count = summary[category] || 0;
          if (count === 0) return null;
          
          return (
            <div key={category} className="flex items-center justify-between text-sm">
              <span className="capitalize text-gray-700 dark:text-gray-300">
                {category}
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}