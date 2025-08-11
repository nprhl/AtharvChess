import { useState, useCallback, useEffect } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { ChessGameEngine } from '@/lib/chess-game';
import { GameStorageManager, type GameState } from '@/lib/local-storage';

export type GameMode = 'pvp' | 'pvc'; // Player vs Player or Player vs Computer
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

interface MoveEvaluation {
  message: string;
  moveType: 'brilliant' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  explanation: string;
  tactical: string[];
  strategic: string[];
  rating: number;
}

interface UseChessGameOptions {
  initialFen?: string;
  gameMode?: GameMode;
  difficulty?: Difficulty;
  playerColor?: 'w' | 'b';
}

export function useChessGame(options: UseChessGameOptions = {}) {
  const { initialFen, gameMode = 'pvp', difficulty = 'beginner', playerColor = 'w' } = options;
  
  const [gameEngine] = useState(() => new ChessGameEngine(initialFen));
  const [, forceUpdate] = useState(0);
  const [isComputerThinking, setIsComputerThinking] = useState(false);
  const [currentGameMode] = useState(gameMode);
  const [currentDifficulty] = useState(difficulty);
  const [currentPlayerColor] = useState(playerColor);
  const [lastMoveEvaluation, setLastMoveEvaluation] = useState<{
    evaluation: MoveEvaluation;
    moveSan: string;
  } | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);

  // Force re-render when game state changes
  const triggerUpdate = useCallback(() => {
    forceUpdate(prev => prev + 1);
  }, []);

  // Auto-save game state
  const saveGameState = useCallback(() => {
    const gameState: GameState = {
      fen: gameEngine.fen(),
      moveHistory: gameEngine.history.map(move => move.san),
      playerColor: 'w' // Default to white for now
    };
    GameStorageManager.saveGame(gameState);
  }, [gameEngine]);

  // Load saved game on mount
  useEffect(() => {
    const savedGame = GameStorageManager.loadGame();
    if (savedGame && !initialFen) {
      gameEngine.loadGame(savedGame.fen);
      triggerUpdate();
    }
  }, [gameEngine, initialFen, triggerUpdate]);

  // Computer move function
  const makeComputerMove = useCallback(async (): Promise<boolean> => {
    if (currentGameMode !== 'pvc' || isComputerThinking) {
      return false;
    }

    // Only make computer move if it's computer's turn
    const currentTurn = gameEngine.turn;
    const isComputerTurn = (currentPlayerColor === 'w' && currentTurn === 'b') || 
                          (currentPlayerColor === 'b' && currentTurn === 'w');
    
    if (!isComputerTurn) {
      return false;
    }

    setIsComputerThinking(true);
    
    try {
      const response = await fetch('/api/ai/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fen: gameEngine.fen(),
          difficulty: currentDifficulty,
          useOllama: true
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const success = gameEngine.makeMove(data.move.from, data.move.to, data.move.promotion);
        if (success) {
          triggerUpdate();
          saveGameState();
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to get computer move:', error);
    } finally {
      setIsComputerThinking(false);
    }
    
    return false;
  }, [gameEngine, triggerUpdate, saveGameState, currentGameMode, currentDifficulty, currentPlayerColor, isComputerThinking]);

  // Evaluate player's move with AI feedback
  const evaluatePlayerMove = useCallback(async (moveSan: string, fenBefore: string, fenAfter: string, userElo: number = 1200) => {
    try {
      const gameHistory = gameEngine.history.map(m => m.san).join(' ');
      
      const response = await fetch('/api/ai/evaluate-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moveSan,
          fenBefore,
          fenAfter,
          gameHistory,
          userElo,
          useOllama: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLastMoveEvaluation({
          evaluation: data.evaluation,
          moveSan
        });
        setShowEvaluation(true);
      }
    } catch (error) {
      console.error('Failed to evaluate move:', error);
    }
  }, [gameEngine.history]);

  const dismissEvaluation = useCallback(() => {
    setShowEvaluation(false);
    // Clear after animation
    setTimeout(() => setLastMoveEvaluation(null), 300);
  }, []);

  const makeMove = useCallback((from: Square, to: Square, promotion?: string): boolean => {
    // In computer mode, only allow player moves on their turn
    if (currentGameMode === 'pvc') {
      const currentTurn = gameEngine.turn;
      const isPlayerTurn = (currentPlayerColor === 'w' && currentTurn === 'w') || 
                          (currentPlayerColor === 'b' && currentTurn === 'b');
      
      if (!isPlayerTurn || isComputerThinking) {
        return false;
      }
    }

    // Capture FEN before the move for evaluation
    const fenBefore = gameEngine.fen();
    const success = gameEngine.makeMove(from, to, promotion);
    
    if (success) {
      const fenAfter = gameEngine.fen();
      const lastMove = gameEngine.history[gameEngine.history.length - 1];
      
      triggerUpdate();
      saveGameState();
      
      // Evaluate the player's move with AI feedback
      if (lastMove && lastMove.san) {
        // Get user ELO from some context (you might need to pass this in)
        const userElo = 1200; // Default, could be retrieved from user context
        evaluatePlayerMove(lastMove.san, fenBefore, fenAfter, userElo);
      }
      
      // Trigger computer move after player move in PvC mode
      if (currentGameMode === 'pvc') {
        setTimeout(() => {
          makeComputerMove();
        }, 800); // Small delay for better UX
      }
    }
    return success;
  }, [gameEngine, triggerUpdate, saveGameState, currentGameMode, currentPlayerColor, isComputerThinking, makeComputerMove, evaluatePlayerMove]);

  const undoMove = useCallback((): Move | null => {
    const undone = gameEngine.undoMove();
    if (undone) {
      triggerUpdate();
      saveGameState();
    }
    return undone;
  }, [gameEngine, triggerUpdate, saveGameState]);

  const getValidMoves = useCallback((square?: Square): Square[] => {
    return gameEngine.getValidMoves(square);
  }, [gameEngine]);

  const resetGame = useCallback(() => {
    gameEngine.reset();
    triggerUpdate();
    GameStorageManager.clearGame();
  }, [gameEngine, triggerUpdate]);

  const loadGame = useCallback((fen: string): boolean => {
    const success = gameEngine.loadGame(fen);
    if (success) {
      triggerUpdate();
      saveGameState();
    }
    return success;
  }, [gameEngine, triggerUpdate, saveGameState]);

  return {
    game: gameEngine.game,
    makeMove,
    makeComputerMove,
    undoMove,
    getValidMoves,
    resetGame,
    loadGame,
    isGameOver: gameEngine.isGameOver.bind(gameEngine),
    isCheck: gameEngine.isCheck.bind(gameEngine),
    isCheckmate: gameEngine.isCheckmate.bind(gameEngine),
    isDraw: gameEngine.isDraw.bind(gameEngine),
    turn: gameEngine.turn,
    moveHistory: gameEngine.history,
    fen: gameEngine.fen.bind(gameEngine),
    pgn: gameEngine.pgn.bind(gameEngine),
    isComputerThinking,
    gameMode: currentGameMode,
    difficulty: currentDifficulty,
    playerColor: currentPlayerColor,
    // Move evaluation features
    evaluatePlayerMove,
    lastMoveEvaluation,
    showEvaluation,
    dismissEvaluation
  };
}
