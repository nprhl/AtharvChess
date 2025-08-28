import { useState } from "react";
import ChessBoard from "@/components/chess-board";
import AIHintCard from "@/components/ai-hint-card";
import MoveEvaluationDisplay from "@/components/move-evaluation";
import PromotionDialog from "@/components/promotion-dialog";
import GameSettingsDialog from "@/components/game-settings-dialog";
import TTSControls from '@/components/tts-controls';
import { speakMove, speakEducationalFeedback } from '@/lib/tts';
import { useStockfishMoveEvaluation } from "../hooks/useStockfishMoveEvaluation";
import { useChessGame } from "@/hooks/use-chess-game";
import { useEffect, useCallback } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Undo, HelpCircle, RotateCcw, X } from "lucide-react";
import { useEngineAnalysis } from "@/hooks/useEngineAnalysis";
import { EngineAnalysisPanel } from "@/components/chess/EngineAnalysisPanel";

export default function GamePage() {
  const [settings, setSettings] = useLocalStorage('chess-settings', {
    hintsEnabled: true,
    moveAnnouncementsEnabled: false,
    focusMode: false,
    progressTracking: true,
    dailyPlayTime: 30,
    breakReminders: 15,
    difficulty: 'beginner',
    autoAdjustDifficulty: true,
    gameMode: 'pvc' as 'pvp' | 'pvc',
    aiDifficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    playerColor: 'w' as 'w' | 'b'
  });

  const { 
    game, 
    makeMove, 
    undoMove, 
    getValidMoves, 
    isGameOver, 
    isCheckmate,
    isDraw,
    resetGame,
    turn,
    moveHistory,
    isComputerThinking,
    gameMode,
    playerColor,
    lastMove,
    promotionPending,
    handlePromotion,
    cancelPromotion
  } = useChessGame({ 
    gameMode: settings.gameMode,
    difficulty: settings.aiDifficulty,
    playerColor: settings.playerColor
  });

  // Simple Stockfish integration for move feedback  
  const [showMoveEvaluation, setShowMoveEvaluation] = useState(false);
  const [lastMoveSan, setLastMoveSan] = useState('');
  
  // Temporarily disabled move evaluation
  // const { evaluation, isAnalyzing } = useStockfishMoveEvaluation({
  //   fen: game.fen(),
  //   lastMoveSan
  // });
  const evaluation = null;
  const isAnalyzing = false;

  // Update move SAN when history changes and speak moves
  useEffect(() => {
    if (moveHistory.length > 0) {
      const lastMove = moveHistory[moveHistory.length - 1];
      if (lastMove && lastMove.san && lastMove.san !== lastMoveSan) {
        setLastMoveSan(lastMove.san);
        setShowMoveEvaluation(true);
        
        // Speak the move in a kid-friendly way
        const moveColor = lastMove.color === 'w' ? 'white' : 'black';
        // Speak move if announcements are enabled in settings
        if (settings.moveAnnouncementsEnabled) {
          speakMove(lastMove.san, moveColor);
        }
        
        // Analyze the move for educational feedback (only human player moves)
        if (turn !== playerColor && previousFen) { 
          analyzeMoveForLearning(lastMove.san, game.fen(), previousFen);
        }
        
        // Trigger engine analysis for the new position
        if (!settings.focusMode) {
          analyze(game);
        }
        
        // Store current position as previous for next move
        setPreviousFen(game.fen());
      }
    }
  }, [moveHistory, lastMoveSan, turn, playerColor, game]);

  const dismissMoveEvaluation = () => {
    setShowMoveEvaluation(false);
  };
  
  const [showHint, setShowHint] = useState(false);
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [suggestedMove, setSuggestedMove] = useState<{from: string, to: string, promotion?: string | null} | null>(null);
  const [learningTips, setLearningTips] = useState<string[]>([]);
  const [moveAnalysis, setMoveAnalysis] = useState<any>(null);
  const [showMoveAnalysis, setShowMoveAnalysis] = useState(false);
  const [previousFen, setPreviousFen] = useState<string | null>(null);

  // Engine Analysis Integration
  const { analyze, result: engineAnalysis, clearAnalysis } = useEngineAnalysis(!settings.focusMode);

  // Analyze moves for educational feedback
  const analyzeMoveForLearning = async (moveSan: string, currentFen: string, prevFen?: string) => {
    try {
      const response = await fetch('/api/ai/analyze-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fen: currentFen,
          moveToAnalyze: moveSan,
          previousFen: prevFen,
          difficulty: settings.aiDifficulty
        })
      });

      if (response.ok) {
        const analysis = await response.json();
        setMoveAnalysis(analysis);
        setShowMoveAnalysis(true);
        
        // Speak educational feedback about the move
        if (analysis.isBlunder) {
          speakEducationalFeedback(`Oops! That was a blunder. ${analysis.feedback}`);
        } else if (analysis.isGoodMove) {
          speakEducationalFeedback(`Great move! ${analysis.feedback}`);
        } else {
          speakEducationalFeedback(analysis.feedback);
        }
      }
    } catch (error) {
      console.error('Failed to analyze move:', error);
    }
  };

  const handleGetHint = async () => {
    try {
      const response = await fetch('/api/ai/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fen: game.fen(),
          difficulty: settings.aiDifficulty,
          moveHistory: moveHistory.map(m => m.san).slice(-6)
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentHint(data.hint);
        setSuggestedMove(data.move);
        setLearningTips(data.learningTips || []);
        setShowHint(true);
      }
    } catch (error) {
      console.error('Failed to get hint:', error);
    }
  };

  const handleShowMove = () => {
    if (suggestedMove) {
      // Make the suggested move
      const success = makeMove(suggestedMove.from as any, suggestedMove.to as any, suggestedMove.promotion || undefined);
      if (success) {
        setShowHint(false);
        setCurrentHint(null);
        setSuggestedMove(null);
      }
    }
  };

  const handleNewGame = () => {
    resetGame();
    setShowHint(false);
    setCurrentHint(null);
    setSuggestedMove(null);
  };

  const handleSettingsChange = (newSettings: {
    gameMode: 'pvp' | 'pvc';
    aiDifficulty: 'beginner' | 'intermediate' | 'advanced';
    playerColor: 'w' | 'b';
    moveAnnouncementsEnabled: boolean;
  }) => {
    setSettings({
      ...settings,
      ...newSettings
    });
  };

  const isGameInProgress = moveHistory.length > 0 && !isGameOver();
  const gameOverReason = isCheckmate() ? 'Checkmate!' : isDraw() ? 'Draw!' : null;

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
  
  return (
    <section className={`${isDesktop ? 'flex flex-row gap-4 p-4 max-w-6xl mx-auto' : 'p-3 flex flex-col'} space-y-3 h-full`}>
      {/* Main Game Content */}
      <div className={`${isDesktop ? 'flex-1' : ''} flex flex-col space-y-3`}>
        {/* Game Status Bar */}
        <div className="bg-card border-border rounded-lg p-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
            isComputerThinking ? 'bg-orange-400 animate-pulse' : 
            (gameMode === 'pvc' && turn !== playerColor) ? 'bg-red-400 animate-pulse' : 
            'bg-emerald-400 animate-pulse'
            }`} />
            <span className="text-sm font-medium text-card-foreground">
              {isComputerThinking ? 'Coach is thinking...' :
               gameMode === 'pvc' ? 
                 (turn === playerColor ? 'Your Turn' : 'Coach\'s Turn') :
                 (turn === 'w' ? 'White\'s Turn' : 'Black\'s Turn')
              }
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Move {Math.ceil(moveHistory.length / 2)}
          </div>
        </div>

        {/* Interactive Chessboard */}
        <div className="flex-1 flex items-center justify-center px-2">
        <ChessBoard 
          game={game}
          onMove={makeMove}
          getValidMoves={getValidMoves}
          lastMove={lastMove}
          disabled={isGameOver() || isComputerThinking || (gameMode === 'pvc' && turn !== playerColor)}
        />
        </div>

        {/* Bottom Section - Fixed */}
        <div className="flex-shrink-0 space-y-3">
        {/* AI Hint Card */}
        {showHint && currentHint && (
          <AIHintCard 
            hint={currentHint}
            learningTips={learningTips}
            onClose={() => {
              setShowHint(false);
              setCurrentHint(null);
              setSuggestedMove(null);
            }}
            onShowMove={handleShowMove}
          />
        )}

        {/* Move Analysis Display */}
        {showMoveAnalysis && moveAnalysis && (
          <div className={`p-4 rounded-lg border ${
            moveAnalysis.isBlunder ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 
            moveAnalysis.isGoodMove ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 
            'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-semibold text-sm ${
                moveAnalysis.isBlunder ? 'text-red-700 dark:text-red-300' : 
                moveAnalysis.isGoodMove ? 'text-green-700 dark:text-green-300' : 
                'text-blue-700 dark:text-blue-300'
              }`}>
                {moveAnalysis.isBlunder ? '⚠️ Learning Moment!' : 
                 moveAnalysis.isGoodMove ? '✅ Great Move!' : 
                 '💡 Move Analysis'}
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowMoveAnalysis(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-sm mb-2 text-gray-700 dark:text-gray-300">{moveAnalysis.feedback}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{moveAnalysis.explanation}</p>
            
            {moveAnalysis.betterMoves && moveAnalysis.betterMoves.length > 0 && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                <strong>Better moves to consider:</strong> {moveAnalysis.betterMoves.join(', ')}
              </div>
            )}
            
            {moveAnalysis.learningPoints && moveAnalysis.learningPoints.length > 0 && (
              <div className="mt-2">
                <strong className="text-xs text-gray-700 dark:text-gray-300">Learning tips:</strong>
                <ul className="text-xs mt-1 space-y-1 text-gray-600 dark:text-gray-400">
                  {moveAnalysis.learningPoints.map((tip: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-1">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* TTS Controls */}
        <TTSControls compact className="mb-2" />

        {/* Game Controls */}
        <div className="flex space-x-2">
          <GameSettingsDialog
            currentSettings={{
              gameMode: settings.gameMode,
              aiDifficulty: settings.aiDifficulty,
              playerColor: settings.playerColor,
              moveAnnouncementsEnabled: settings.moveAnnouncementsEnabled
            }}
            onSettingsChange={handleSettingsChange}
            onNewGame={handleNewGame}
          />
          
          <Button 
            variant="secondary" 
            className="flex-1 bg-card border-border hover:bg-accent text-card-foreground"
            onClick={undoMove}
            disabled={moveHistory.length === 0}
          >
            <Undo className="w-4 h-4 mr-2" />
            Undo
          </Button>

          {/* New Game Button */}
          {isGameInProgress ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="secondary"
                  className="flex-1 bg-card border-border hover:bg-accent text-card-foreground"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  New Game
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-card-foreground">Start New Game?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    Are you sure you want to start a new game? Your current progress will be lost.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-border bg-background hover:bg-accent text-card-foreground">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleNewGame}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Start New Game
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button 
              variant="secondary"
              className="flex-1 bg-card border-border hover:bg-accent text-card-foreground"
              onClick={handleNewGame}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              New Game
            </Button>
          )}

          {settings.hintsEnabled && !isGameOver() && (
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={handleGetHint}
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
          )}
        </div>



        {/* Game Over Message */}
        {isGameOver() && gameOverReason && (
          <div className="bg-card border-border rounded-lg p-4 text-center">
            <h3 className="text-lg font-semibold text-card-foreground mb-2">{gameOverReason}</h3>
            <p className="text-sm text-muted-foreground">
              {isCheckmate() 
                ? (turn === 'w' ? 'Black wins!' : 'White wins!')
                : 'The game ended in a draw.'
              }
            </p>
          </div>
        )}
        </div>

      {/* Engine Analysis Panel - Desktop Only */}
      {isDesktop && !settings.focusMode && (
        <div className="w-80 flex-shrink-0">
          <EngineAnalysisPanel 
            analysis={engineAnalysis}
            className="sticky top-4"
          />
        </div>
      )}

      {/* Stockfish Move Evaluation Display - Temporarily Disabled */}
      {/* <MoveEvaluationDisplay
        evaluation={evaluation}
        moveSan={lastMoveSan}
        onDismiss={dismissMoveEvaluation}
        isVisible={showMoveEvaluation && evaluation !== null}
      /> */}

      {/* Pawn Promotion Dialog */}
      <PromotionDialog
        open={!!promotionPending}
        onPromotion={handlePromotion}
        playerColor={playerColor}
      />
    </section>
  );
}