import { useState, useCallback, useEffect } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { ChessGameEngine } from '@/lib/chess-game';
import { GameStorageManager, type GameState } from '@/lib/local-storage';
import { ttsService } from '@/lib/tts';

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
  const [currentGameMode, setCurrentGameMode] = useState(gameMode);
  const [currentDifficulty, setCurrentDifficulty] = useState(difficulty);
  const [currentPlayerColor, setCurrentPlayerColor] = useState(playerColor);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  // Removed move evaluation state - now handled by Stockfish analysis
  const [promotionPending, setPromotionPending] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

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

  // Update settings when options change
  useEffect(() => {
    setCurrentGameMode(gameMode);
    setCurrentDifficulty(difficulty);
    setCurrentPlayerColor(playerColor);
  }, [gameMode, difficulty, playerColor]);

  // Load saved game on mount
  useEffect(() => {
    const savedGame = GameStorageManager.loadGame();
    if (savedGame && !initialFen) {
      gameEngine.loadGame(savedGame.fen);
      // Clear last move when loading a saved game to avoid stale highlights
      setLastMove(null);
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
          // Update last move for highlighting (computer move)
          setLastMove({ from: data.move.from, to: data.move.to });
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

  // Auto-make computer move when player chooses black (computer plays first as white)
  useEffect(() => {
    if (currentGameMode === 'pvc' && currentPlayerColor === 'b' && gameEngine.history.length === 0) {
      // Computer should move first when player is black
      setTimeout(() => {
        makeComputerMove();
      }, 500);
    }
  }, [currentGameMode, currentPlayerColor, gameEngine.history.length, makeComputerMove]);

  // Note: Move evaluation is now handled by Stockfish analysis instead of API calls

  // Removed dismissEvaluation - now handled by Stockfish analysis

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

    // Check if this is a pawn promotion move
    if (!promotion && gameEngine.isPawnPromotion(from, to)) {
      // Store the move for after promotion is selected
      setPromotionPending({ from, to });
      return false; // Don't make the move yet, wait for promotion choice
    }

    // Capture FEN before the move for evaluation
    const fenBefore = gameEngine.fen();
    const success = gameEngine.makeMove(from, to, promotion);
    
    if (success) {
      const fenAfter = gameEngine.fen();
      const lastMoveHistory = gameEngine.history[gameEngine.history.length - 1];
      
      // Update last move for highlighting
      setLastMove({ from, to });
      
      triggerUpdate();
      saveGameState();
      
      // Clear any pending promotion
      setPromotionPending(null);
      
      // Move speech removed - only speak analysis and suggestions
      
      // Move evaluation is now handled by Stockfish analysis automatically
      
      // Trigger computer move after player move in PvC mode
      if (currentGameMode === 'pvc') {
        setTimeout(() => {
          makeComputerMove();
        }, 800); // Small delay for better UX
      }
    }
    return success;
  }, [gameEngine, triggerUpdate, saveGameState, currentGameMode, currentPlayerColor, isComputerThinking, makeComputerMove]);

  const handlePromotion = useCallback((piece: 'q' | 'r' | 'b' | 'n') => {
    if (promotionPending) {
      makeMove(promotionPending.from, promotionPending.to, piece);
    }
  }, [promotionPending, makeMove]);

  const cancelPromotion = useCallback(() => {
    setPromotionPending(null);
  }, []);

  const undoMove = useCallback((): Move | null => {
    const undone = gameEngine.undoMove();
    if (undone) {
      // Update last move to the previous move if it exists
      const history = gameEngine.history;
      if (history.length > 0) {
        const lastHistoryMove = history[history.length - 1];
        setLastMove({ from: lastHistoryMove.from, to: lastHistoryMove.to });
      } else {
        setLastMove(null);
      }
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
    setLastMove(null); // Clear last move highlighting
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
    fen: gameEngine.fen.bind(gameEngine),
    turn: gameEngine.turn,
    moveHistory: gameEngine.history,
    isComputerThinking,
    gameMode: currentGameMode,
    playerColor: currentPlayerColor,
    lastMove,
    // Move evaluation removed - now handled by Stockfish
    promotionPending,
    handlePromotion,
    cancelPromotion
  };
}
