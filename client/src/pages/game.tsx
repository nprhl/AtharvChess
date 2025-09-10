import { useState } from "react";
import { Chess } from "chess.js";
import ChessBoard from "@/components/chess-board";
import AIHintCard from "@/components/ai-hint-card";
import PromotionDialog from "@/components/promotion-dialog";
import SpeechCaption from "@/components/speech-caption";
import TutorialOverlay from "@/components/TutorialOverlay";
import { useChessGame } from "@/hooks/use-chess-game";
import { useEffect, useCallback } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Button } from "@/components/ui/button";
import { ChevronLeft, HelpCircle, RotateCcw, Settings } from "lucide-react";
import { useEngineAnalysis } from "@/hooks/useEngineAnalysis";
import { EngineAnalysisPanel } from "@/components/chess/EngineAnalysisPanel";
import { BlunderMeter } from "../components/chess/BlunderMeter";
import { Link } from 'wouter';
import { speakMove, speakEducationalFeedback, ttsService } from "@/lib/tts";

export default function GamePage() {
  const [settings, setSettings] = useLocalStorage('chess-settings', {
    hintsEnabled: true,
    moveAnnouncementsEnabled: false,
    educationalFeedbackEnabled: true,
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

  // Tutorial state for first-time users
  const [hasSeenTutorial, setHasSeenTutorial] = useLocalStorage('chess-tutorial-completed', false);
  const [showTutorial, setShowTutorial] = useState(!hasSeenTutorial);

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
    cancelPromotion,
    fen
  } = useChessGame({ 
    gameMode: settings.gameMode,
    difficulty: settings.aiDifficulty,
    playerColor: settings.playerColor
  });

  const [showHint, setShowHint] = useState(false);
  const [currentHint, setCurrentHint] = useState<any>(null);
  const [learningTips, setLearningTips] = useState<string[]>([]);
  const [currentMove, setCurrentMove] = useState<string | null>(null);
  const [fenBefore, setFenBefore] = useState<string | null>(null);
  const [fenAfter, setFenAfter] = useState<string | null>(null);
  const [lastMoveForTTS, setLastMoveForTTS] = useState<string | null>(null);
  const [suggestedMove, setSuggestedMove] = useState<string | null>(null);
  
  // Engine analysis for blunder detection and real-time analysis
  const { result: engineAnalysis, analyze } = useEngineAnalysis(true);
  
  // Tutorial handlers
  const handleTutorialClose = useCallback(() => {
    setShowTutorial(false);
  }, []);

  const handleTutorialComplete = useCallback(() => {
    setHasSeenTutorial(true);
    setShowTutorial(false);
  }, [setHasSeenTutorial]);

  // Track move data for classification
  useEffect(() => {
    if (lastMove && moveHistory.length > 0) {
      // Get the san notation from the last move in history
      const lastMoveFromHistory = moveHistory[moveHistory.length - 1];
      setCurrentMove(lastMoveFromHistory.san);
      setFenAfter(fen());
      
      // Get previous position using a temporary Chess instance (non-mutating)
      if (moveHistory.length > 1) {
        // Create a temporary Chess instance to get previous FEN without mutating main game
        const tempGame = new Chess(fen());
        tempGame.undo();
        setFenBefore(tempGame.fen());
      } else {
        // If this is the first move, use starting position
        setFenBefore('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      }
    }
  }, [lastMove, moveHistory, fen]);

  // Trigger analysis when game state changes
  useEffect(() => {
    analyze(game);
  }, [fen()]);

  // Handle move announcements with TTS
  useEffect(() => {
    if (settings.moveAnnouncementsEnabled && ttsService.getSettings().enabled && moveHistory.length > 0) {
      const latestMove = moveHistory[moveHistory.length - 1];
      if (latestMove && latestMove.san !== lastMoveForTTS) {
        setLastMoveForTTS(latestMove.san);
        const currentTurnColor = turn === 'w' ? 'black' : 'white'; // Previous turn made the move
        speakMove(latestMove.san, currentTurnColor);
      }
    }
  }, [moveHistory, settings.moveAnnouncementsEnabled, lastMoveForTTS, turn]);

  // Provide educational feedback based on engine analysis
  useEffect(() => {
    if (engineAnalysis && settings.educationalFeedbackEnabled && moveHistory.length > 0) {
      // Simplified feedback based on engine analysis availability
      // TTS feedback will be enhanced when move classification system is integrated
      if (engineAnalysis.stockfish && moveHistory.length > 1) {
        // Provide basic feedback when analysis is available
        speakEducationalFeedback("Move analyzed. Check the real-time analysis panel for detailed feedback.");
      }
    }
  }, [engineAnalysis, settings.educationalFeedbackEnabled, moveHistory.length]);

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
            {moveHistory.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => undoMove()}
                disabled={isComputerThinking}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Undo
              </Button>
            )}

            <Link href="/settings">
              <Button variant="outline" size="sm" className="flex-1">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Link>

            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={handleNewGame}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              New Game
            </Button>

            {settings.hintsEnabled && !isGameOver() && (
              <Button 
                variant="outline"
                size="sm"
                className="flex-1"
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
        <div className="w-80 flex-shrink-0 space-y-4">
          <EngineAnalysisPanel 
            analysis={engineAnalysis}
            className="sticky top-4"
          />
          <BlunderMeter 
            engineAnalysis={engineAnalysis}
            gameMode={gameMode}
            playerColor={playerColor}
            currentTurn={turn}
            currentMove={currentMove || undefined}
            fenBefore={fenBefore || undefined}
            fenAfter={fenAfter || undefined}
            moveNumber={moveHistory.length}
            className="sticky top-4"
          />
        </div>
      )}

      {/* Blunder Meter - Mobile Only */}
      {!isDesktop && (
        <div className="p-3">
          <BlunderMeter 
            engineAnalysis={engineAnalysis}
            gameMode={gameMode}
            playerColor={playerColor}
            currentTurn={turn}
            currentMove={currentMove || undefined}
            fenBefore={fenBefore || undefined}
            fenAfter={fenAfter || undefined}
            moveNumber={moveHistory.length}
          />
        </div>
      )}

      {/* Pawn Promotion Dialog */}
      <PromotionDialog
        open={!!promotionPending}
        onPromotion={handlePromotion}
        playerColor={playerColor}
      />
      
      {/* Speech Caption for TTS */}
      <SpeechCaption />

      {/* Tutorial Overlay for First-Time Users */}
      {showTutorial && (
        <TutorialOverlay
          onClose={handleTutorialClose}
          onComplete={handleTutorialComplete}
        />
      )}
    </div>
  );
}