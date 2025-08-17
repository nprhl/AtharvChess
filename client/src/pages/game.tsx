import { useState } from "react";
import ChessBoard from "@/components/chess-board";
import AIHintCard from "@/components/ai-hint-card";
import MoveEvaluationDisplay from "@/components/move-evaluation";
import PromotionDialog from "@/components/promotion-dialog";
import GameSettingsDialog from "@/components/game-settings-dialog";
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
import { Undo, HelpCircle, RotateCcw } from "lucide-react";

export default function GamePage() {
  const [settings, setSettings] = useLocalStorage('chess-settings', {
    hintsEnabled: true,
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

  // Update move SAN when history changes
  useEffect(() => {
    if (moveHistory.length > 0) {
      const lastMove = moveHistory[moveHistory.length - 1];
      if (lastMove && lastMove.san && lastMove.san !== lastMoveSan) {
        setLastMoveSan(lastMove.san);
        setShowMoveEvaluation(true);
      }
    }
  }, [moveHistory, lastMoveSan]);

  const dismissMoveEvaluation = () => {
    setShowMoveEvaluation(false);
  };
  
  const [showHint, setShowHint] = useState(false);
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [suggestedMove, setSuggestedMove] = useState<{from: string, to: string, promotion?: string | null} | null>(null);

  const handleGetHint = async () => {
    try {
      const response = await fetch('/api/ai/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fen: game.fen(),
          difficulty: settings.aiDifficulty,
          useOllama: true
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentHint(data.hint);
        setSuggestedMove(data.move);
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
  }) => {
    setSettings({
      ...settings,
      ...newSettings
    });
  };

  const isGameInProgress = moveHistory.length > 0 && !isGameOver();
  const gameOverReason = isCheckmate() ? 'Checkmate!' : isDraw() ? 'Draw!' : null;

  return (
    <section className="p-3 space-y-3 flex flex-col h-full">
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
            onClose={() => {
              setShowHint(false);
              setCurrentHint(null);
              setSuggestedMove(null);
            }}
            onShowMove={handleShowMove}
          />
        )}

        {/* Game Controls */}
        <div className="flex space-x-2">
          <GameSettingsDialog
            currentSettings={{
              gameMode: settings.gameMode,
              aiDifficulty: settings.aiDifficulty,
              playerColor: settings.playerColor
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
              <HelpCircle className="w-4 h-4 mr-2" />
              Hint
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
