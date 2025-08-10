import { useState, useCallback, useEffect } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { ChessGameEngine } from '@/lib/chess-game';
import { GameStorageManager, type GameState } from '@/lib/local-storage';

export type GameMode = 'pvp' | 'pvc'; // Player vs Player or Player vs Computer
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

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
    console.log('makeComputerMove called', { 
      currentGameMode, 
      isComputerThinking, 
      currentTurn: gameEngine.turn,
      currentPlayerColor 
    });

    if (currentGameMode !== 'pvc' || isComputerThinking) {
      console.log('Early return - mode or thinking', { currentGameMode, isComputerThinking });
      return false;
    }

    // Only make computer move if it's computer's turn
    const currentTurn = gameEngine.turn;
    const isComputerTurn = (currentPlayerColor === 'w' && currentTurn === 'b') || 
                          (currentPlayerColor === 'b' && currentTurn === 'w');
    
    console.log('Turn check', { currentTurn, currentPlayerColor, isComputerTurn });
    
    if (!isComputerTurn) {
      console.log('Not computer turn');
      return false;
    }

    console.log('Making computer move request with FEN:', gameEngine.fen());
    setIsComputerThinking(true);
    
    try {
      const response = await fetch('/api/ai/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fen: gameEngine.fen(),
          difficulty: currentDifficulty 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('AI move response:', data);
        const success = gameEngine.makeMove(data.move.from, data.move.to, data.move.promotion);
        console.log('Move success:', success);
        if (success) {
          triggerUpdate();
          saveGameState();
          return true;
        }
      } else {
        console.error('AI move request failed:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Failed to get computer move:', error);
    } finally {
      setIsComputerThinking(false);
    }
    
    return false;
  }, [gameEngine, triggerUpdate, saveGameState, currentGameMode, currentDifficulty, currentPlayerColor, isComputerThinking]);

  const makeMove = useCallback((from: Square, to: Square, promotion?: string): boolean => {
    console.log('makeMove called', { from, to, currentGameMode, currentPlayerColor });
    
    // In computer mode, only allow player moves on their turn
    if (currentGameMode === 'pvc') {
      const currentTurn = gameEngine.turn;
      const isPlayerTurn = (currentPlayerColor === 'w' && currentTurn === 'w') || 
                          (currentPlayerColor === 'b' && currentTurn === 'b');
      
      console.log('Player turn check', { currentTurn, isPlayerTurn, isComputerThinking });
      
      if (!isPlayerTurn || isComputerThinking) {
        console.log('Player move blocked');
        return false;
      }
    }

    const success = gameEngine.makeMove(from, to, promotion);
    console.log('Player move success:', success);
    
    if (success) {
      triggerUpdate();
      saveGameState();
      
      // Trigger computer move after player move in PvC mode
      if (currentGameMode === 'pvc') {
        console.log('Scheduling computer move in 800ms');
        setTimeout(() => {
          console.log('Timeout triggered, calling makeComputerMove');
          makeComputerMove();
        }, 800); // Small delay for better UX
      }
    }
    return success;
  }, [gameEngine, triggerUpdate, saveGameState, currentGameMode, currentPlayerColor, isComputerThinking, makeComputerMove]);

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
    playerColor: currentPlayerColor
  };
}
