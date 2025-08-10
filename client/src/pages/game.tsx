import { useState } from "react";
import ChessBoard from "@/components/chess-board";
import AIHintCard from "@/components/ai-hint-card";
import { useChessGame } from "@/hooks/use-chess-game";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Button } from "@/components/ui/button";
import { Undo, HelpCircle } from "lucide-react";

export default function GamePage() {
  const [settings] = useLocalStorage('chess-settings', {
    hintsEnabled: true,
    focusMode: false,
    progressTracking: true,
    dailyPlayTime: 30,
    breakReminders: 15,
    difficulty: 'beginner',
    autoAdjustDifficulty: true,
    gameMode: 'pvc' as 'pvp' | 'pvc',
    aiDifficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced'
  });

  const { 
    game, 
    makeMove, 
    undoMove, 
    getValidMoves, 
    isGameOver, 
    turn,
    moveHistory,
    isComputerThinking,
    gameMode,
    playerColor
  } = useChessGame({ 
    gameMode: settings.gameMode,
    difficulty: settings.aiDifficulty,
    playerColor: 'w'
  });
  
  const [showHint, setShowHint] = useState(false);
  const [currentHint, setCurrentHint] = useState<string | null>(null);

  const handleGetHint = async () => {
    try {
      const response = await fetch('/api/ai/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fen: game.fen(),
          difficulty: 'beginner' 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentHint(data.hint);
        setShowHint(true);
      }
    } catch (error) {
      console.error('Failed to get hint:', error);
    }
  };

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
            {isComputerThinking ? 'Computer is thinking...' :
             gameMode === 'pvc' ? 
               (turn === playerColor ? 'Your Turn' : 'Computer\'s Turn') :
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
          disabled={isGameOver() || isComputerThinking || (gameMode === 'pvc' && turn !== playerColor)}
        />
      </div>

      {/* Bottom Section - Fixed */}
      <div className="flex-shrink-0 space-y-3">
        {/* AI Hint Card */}
        {showHint && currentHint && (
          <AIHintCard 
            hint={currentHint}
            onClose={() => setShowHint(false)}
          />
        )}

        {/* Game Controls */}
        <div className="flex space-x-2">
          <Button 
            variant="secondary" 
            className="flex-1 bg-slate-700 hover:bg-slate-600"
            onClick={undoMove}
            disabled={moveHistory.length === 0}
          >
            <Undo className="w-4 h-4 mr-2" />
            Undo
          </Button>
          <Button 
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={handleGetHint}
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Hint
          </Button>
        </div>

        {/* Game Over Message */}
        {isGameOver() && (
          <div className="bg-yellow-600 rounded-lg p-4">
            <h3 className="font-semibold text-center">
              {game.isCheckmate() ? 'Checkmate!' : 
               game.isDraw() ? 'Draw!' : 'Game Over'}
            </h3>
          </div>
        )}
      </div>
    </section>
  );
}
