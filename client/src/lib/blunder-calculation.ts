interface EngineResult {
  stockfish?: {
    evaluation: number;
    depth: number;
    bestMove?: string;
    principalVariation?: string[];
  };
  maia?: {
    predictions: Array<{
      move: string;
      probability: number;
    }>;
    topMove?: string;
  };
}

export interface BlunderMeterResult {
  blunder: number;
  ok: number;
  good: number;
  moveQuality: 'brilliant' | 'excellent' | 'good' | 'ok' | 'inaccuracy' | 'mistake' | 'blunder';
  description: string;
}

/**
 * Calculate blunder/OK/good probabilities from Stockfish and Maia engine output
 * Combines tactical evaluation (Stockfish) with human-like prediction confidence (Maia)
 */
export function calculateBlunderMeter(
  engineResult: EngineResult,
  gameMode: 'pvp' | 'pvc' = 'pvp',
  playerColor: 'w' | 'b' = 'w',
  currentTurn: 'w' | 'b' = 'w'
): BlunderMeterResult {
  // Default neutral state
  let blunder = 0.33;
  let ok = 0.34;
  let good = 0.33;
  let moveQuality: BlunderMeterResult['moveQuality'] = 'ok';
  let description = 'Position analysis in progress...';

  // Show neutral analysis when waiting for player in PvC mode
  if (gameMode === 'pvc' && currentTurn === playerColor) {
    return {
      blunder: 0.2,
      ok: 0.5,
      good: 0.3,
      moveQuality: 'ok',
      description: 'Your turn - make your move'
    };
  }

  // Stockfish-based tactical evaluation
  if (engineResult.stockfish) {
    const { evaluation, depth = 0 } = engineResult.stockfish;
    
    // Confidence increases with depth
    const depthConfidence = Math.min(depth / 15, 1.0);
    
    // Convert centipawn evaluation to move quality
    const absEval = Math.abs(evaluation);
    
    if (absEval <= 25) {
      // Equal position - mostly OK with some good
      good = 0.4 + (depthConfidence * 0.2);
      ok = 0.5;
      blunder = 0.1 - (depthConfidence * 0.05);
      moveQuality = 'good';
      description = 'Position is balanced';
    } else if (absEval <= 50) {
      // Slight advantage/disadvantage
      good = 0.3 + (depthConfidence * 0.1);
      ok = 0.6;
      blunder = 0.1;
      moveQuality = 'ok';
      description = 'Small advantage detected';
    } else if (absEval <= 100) {
      // Clear advantage/disadvantage
      if (evaluation > 0 && currentTurn === 'w' || evaluation < 0 && currentTurn === 'b') {
        // Player has advantage
        good = 0.5 + (depthConfidence * 0.2);
        ok = 0.4;
        blunder = 0.1 - (depthConfidence * 0.05);
        moveQuality = 'good';
        description = 'You have an advantage!';
      } else {
        // Player is behind
        good = 0.2;
        ok = 0.5;
        blunder = 0.3 + (depthConfidence * 0.1);
        moveQuality = 'inaccuracy';
        description = 'Opponent has advantage';
      }
    } else if (absEval <= 300) {
      // Significant material difference
      if (evaluation > 0 && currentTurn === 'w' || evaluation < 0 && currentTurn === 'b') {
        good = 0.7 + (depthConfidence * 0.2);
        ok = 0.2;
        blunder = 0.1 - (depthConfidence * 0.05);
        moveQuality = 'excellent';
        description = 'Strong position!';
      } else {
        good = 0.1;
        ok = 0.3;
        blunder = 0.6 + (depthConfidence * 0.2);
        moveQuality = 'mistake';
        description = 'Difficult position';
      }
    } else {
      // Major material imbalance or tactical blow
      if (evaluation > 0 && currentTurn === 'w' || evaluation < 0 && currentTurn === 'b') {
        good = 0.8 + (depthConfidence * 0.15);
        ok = 0.15;
        blunder = 0.05;
        moveQuality = 'brilliant';
        description = 'Crushing advantage!';
      } else {
        good = 0.05;
        ok = 0.15;
        blunder = 0.8 + (depthConfidence * 0.15);
        moveQuality = 'blunder';
        description = 'Critical mistake detected';
      }
    }
  }

  // Maia-based human-like prediction adjustment
  if (engineResult.maia?.predictions?.length) {
    const { predictions } = engineResult.maia;
    const topPrediction = predictions[0];
    
    if (topPrediction) {
      const confidence = topPrediction.probability;
      
      if (confidence > 0.7) {
        // Maia is very confident - likely a natural human move
        good += 0.1;
        blunder -= 0.05;
        ok -= 0.05;
        description += ' (Natural move)';
      } else if (confidence < 0.3) {
        // Maia thinks this move is unusual for humans
        blunder += 0.1;
        good -= 0.05;
        ok -= 0.05;
        description += ' (Unusual choice)';
      }
    }
    
    // Check if there are many good alternatives
    const strongAlternatives = predictions.filter(p => p.probability > 0.2).length;
    if (strongAlternatives > 3) {
      ok += 0.1;
      good -= 0.05;
      blunder -= 0.05;
    }
  }

  // Normalize to ensure probabilities sum to 1
  const total = blunder + ok + good;
  if (total > 0) {
    blunder = Math.max(0.05, blunder / total);
    ok = Math.max(0.1, ok / total);
    good = Math.max(0.05, good / total);
  }

  // Ensure they sum to 1 (handle floating point errors)
  const finalTotal = blunder + ok + good;
  if (Math.abs(finalTotal - 1.0) > 0.01) {
    const adjustment = (1.0 - finalTotal) / 3;
    blunder += adjustment;
    ok += adjustment;
    good += adjustment;
  }

  return {
    blunder: Math.round(blunder * 100) / 100,
    ok: Math.round(ok * 100) / 100,
    good: Math.round(good * 100) / 100,
    moveQuality,
    description
  };
}