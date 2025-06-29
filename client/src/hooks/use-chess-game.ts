import { useState, useCallback, useEffect } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { ChessGameEngine } from '@/lib/chess-game';
import { GameStorageManager, type GameState } from '@/lib/local-storage';

export function useChessGame(initialFen?: string) {
  const [gameEngine] = useState(() => new ChessGameEngine(initialFen));
  const [, forceUpdate] = useState(0);

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

  const makeMove = useCallback((from: Square, to: Square, promotion?: string): boolean => {
    const success = gameEngine.makeMove(from, to, promotion);
    if (success) {
      triggerUpdate();
      saveGameState();
    }
    return success;
  }, [gameEngine, triggerUpdate, saveGameState]);

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
    pgn: gameEngine.pgn.bind(gameEngine)
  };
}
