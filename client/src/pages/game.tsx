import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import { ChessBoard } from '../components/chess/ChessBoard';
import { PromotionDialog } from '../components/chess/PromotionDialog';
import { AIHintCard } from '../components/chess/AIHintCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ChevronLeft, RotateCcw, HelpCircle, Settings } from 'lucide-react';
import { useChessGame } from '../hooks/useChessGame';
import { EngineAnalysisPanel } from '../components/chess/EngineAnalysisPanel';
import { useEngineAnalysis } from '../hooks/useEngineAnalysis';

export default function GamePage() {
  const [showHint, setShowHint] = useState(false);
  const [currentHint, setCurrentHint] = useState<any>(null);
  const [learningTips, setLearningTips] = useState<string[]>([]);
  const [suggestedMove, setSuggestedMove] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    gameMode: 'pvc' as 'pvp' | 'pvc',
    aiDifficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    playerColor: 'w' as 'w' | 'b',
    moveAnnouncementsEnabled: false,
    hintsEnabled: true,
    focusMode: false
  });

  const {
    game,
    turn,
    moveHistory,
    lastMove,
    isComputerThinking,
    promotionPending,
    makeMove,
    getValidMoves,
    resetGame,
    isCheckmate,
    isDraw,
    isGameOver,
    handlePromotion,
    gameMode,
    playerColor
  } = useChessGame({
    gameMode: settings.gameMode,
    aiDifficulty: settings.aiDifficulty,
    playerColor: settings.playerColor,
  });

  const { analysis: engineAnalysis } = useEngineAnalysis(game.fen());

  const handleGetHint = useCallback(async () => {
    try {
      const response = await fetch('/api/chess/hint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fen: game.fen(),
          difficulty: settings.aiDifficulty,
          moveHistory: moveHistory
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get hint');
      }

      const data = await response.json();
      if (data.success && data.hint) {
        setCurrentHint(data.hint);
        setLearningTips(data.learningTips || []);
        setSuggestedMove(data.hint.suggestedMove);
        setShowHint(true);
      }
    } catch (error) {
      console.error('Error getting hint:', error);
    }
  }, [game, settings.aiDifficulty, moveHistory]);

  const handleShowMove = () => {
    if (suggestedMove && !showHint) {
      setCurrentHint(null);
      setSuggestedMove(null);
    }
  };

  const handleNewGame = () => {
    resetGame();
    setShowHint(false);
    setCurrentHint(null);
    setSuggestedMove(null);
  };

  const isGameInProgress = moveHistory.length > 0 && !isGameOver();
  const gameOverReason = isCheckmate() ? 'Checkmate!' : isDraw() ? 'Draw!' : null;
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
  
  return (
    <div className={`${isDesktop ? 'flex flex-row gap-4 p-4 max-w-6xl mx-auto' : 'p-3 flex flex-col'} space-y-3 h-full`}>
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

        {/* Bottom Section */}
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

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Link href="/">
              <Button variant="outline" size="sm" className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>

            <Link href="/settings">
              <Button variant="outline" size="sm" className="flex-1">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Link>

            {isGameInProgress && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
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

      {/* Pawn Promotion Dialog */}
      <PromotionDialog
        open={!!promotionPending}
        onPromotion={handlePromotion}
        playerColor={playerColor}
      />
    </div>
  );
}