import { useState, useCallback, useEffect } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { ChessGameEngine } from '@/lib/chess-game';
import { GameStorageManager, type GameState } from '@/lib/local-storage';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();
  
  const [gameEngine] = useState(() => new ChessGameEngine(initialFen));
  const [, forceUpdate] = useState(0);
  const [isComputerThinking, setIsComputerThinking] = useState(false);
  const [currentGameMode, setCurrentGameMode] = useState(gameMode);
  const [currentDifficulty, setCurrentDifficulty] = useState(difficulty);
  const [currentPlayerColor, setCurrentPlayerColor] = useState(playerColor);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  // Game tracking state for database saving
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);
  const [gameHasStarted, setGameHasStarted] = useState(false);
  const [gameHasEnded, setGameHasEnded] = useState(false);
  // Removed move evaluation state - now handled by Stockfish analysis
  const [promotionPending, setPromotionPending] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  // Force re-render when game state changes
  const triggerUpdate = useCallback(() => {
    console.log('[DEBUG] triggerUpdate called, current FEN:', gameEngine.fen());
    forceUpdate(prev => prev + 1);
  }, [gameEngine]);

  // Auto-save game state
  const saveGameState = useCallback(() => {
    const gameState: GameState = {
      fen: gameEngine.fen(),
      moveHistory: gameEngine.history.map(move => move.san),
      playerColor: 'w' // Default to white for now
    };
    console.log('[DEBUG] saveGameState called, saving FEN:', gameState.fen);
    GameStorageManager.saveGame(gameState);
  }, [gameEngine]);

  // Placeholder useEffect to maintain hook order (previously game loading logic)
  useEffect(() => {
    // Hook order preservation - no functionality needed
  }, []);

  // Update settings when options change
  useEffect(() => {
    setCurrentGameMode(gameMode);
    setCurrentDifficulty(difficulty);
    setCurrentPlayerColor(playerColor);
  }, [gameMode, difficulty, playerColor]);

  // Initialize game start time when first move is made
  useEffect(() => {
    if (gameEngine.history.length > 0 && !gameHasStarted) {
      console.log('[GameHistory] Game started! Setting start time and flags');
      setGameStartTime(new Date());
      setGameHasStarted(true);
      setGameHasEnded(false);
    }
  }, [gameEngine.history.length, gameHasStarted]);

  // Detect game completion and save to database
  useEffect(() => {
    console.log('[GameHistory] Game state check:', {
      gameHasStarted,
      gameHasEnded,
      isGameOver: gameEngine.isGameOver(),
      movesCount: gameEngine.history.length,
      userId: user?.id,
      hasGameStartTime: !!gameStartTime
    });

    if (gameHasStarted && !gameHasEnded && gameEngine.isGameOver()) {
      const saveGameToDatabase = async () => {
        console.log('[GameHistory] Attempting to save game...');
        
        if (!user?.id || !gameStartTime) {
          console.log('[GameHistory] Cannot save game - missing user ID or start time:', { userId: user?.id, hasStartTime: !!gameStartTime });
          return;
        }

        try {
          // Determine result from player's perspective
          let result: 'win' | 'loss' | 'draw' | 'abandoned';
          
          if (gameEngine.isDraw()) {
            result = 'draw';
            console.log('[GameHistory] Game ended in draw');
          } else if (gameEngine.isCheckmate()) {
            // If it's checkmate, determine who won
            const currentTurn = gameEngine.turn;
            const playerIsWhite = currentPlayerColor === 'w';
            const playerWon = (currentTurn === 'b' && playerIsWhite) || (currentTurn === 'w' && !playerIsWhite);
            result = playerWon ? 'win' : 'loss';
            console.log('[GameHistory] Game ended in checkmate:', { result, currentTurn, playerIsWhite });
          } else {
            result = 'draw'; // Other game-ending conditions (stalemate, etc.)
            console.log('[GameHistory] Game ended by other condition (stalemate, etc.)');
          }

          const gameEndTime = new Date();
          const gameDurationSeconds = Math.floor((gameEndTime.getTime() - gameStartTime.getTime()) / 1000);
          
          const gameData = {
            opponent: currentGameMode === 'pvc' ? 'Computer' : 'Human Player',
            result,
            moves: gameEngine.history.map(move => move.san),
            gameMode: currentGameMode,
            difficulty: currentGameMode === 'pvc' ? currentDifficulty : undefined,
            playerColor: currentPlayerColor === 'w' ? 'white' : 'black',
            timeControl: undefined, // Could add time control support later
            gameDurationSeconds
          };

          console.log('[GameHistory] Sending game data to server:', {
            moves: gameData.moves.length,
            result: gameData.result,
            duration: gameData.gameDurationSeconds
          });

          const response = await fetch('/api/games/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gameData)
          });

          if (response.ok) {
            const responseData = await response.json();
            console.log('[GameHistory] Game saved successfully:', responseData);
          } else {
            const errorText = await response.text();
            console.error('[GameHistory] Failed to save game - server error:', response.status, errorText);
          }
        } catch (error) {
          console.error('[GameHistory] Failed to save game - network/client error:', error);
        }
      };

      console.log('[GameHistory] Game over detected! Saving game...');
      setGameHasEnded(true);
      saveGameToDatabase();
    }
  }, [gameHasStarted, gameHasEnded, gameEngine, user?.id, gameStartTime, currentGameMode, currentDifficulty, currentPlayerColor]);

  // Load saved game on mount
  useEffect(() => {
    const savedGame = GameStorageManager.loadGame();
    if (savedGame && !initialFen) {
      console.log('[DEBUG] Loading saved game:', savedGame.fen);
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
        console.log('[DEBUG] Computer move received:', data.move, 'FEN before:', gameEngine.fen());
        const success = gameEngine.makeMove(data.move.from, data.move.to, data.move.promotion);
        if (success) {
          console.log('[DEBUG] Computer move applied successfully, FEN after:', gameEngine.fen());
          // Update last move for highlighting (computer move)
          setLastMove({ from: data.move.from, to: data.move.to });
          triggerUpdate();
          saveGameState();
          return true;
        } else {
          console.log('[DEBUG] Computer move FAILED to apply');
        }
      } else {
        // AI failed to generate move - save game as abandoned
        console.log('[GameHistory] AI failed to generate move, ending game as abandoned');
        handleAIFailure();
      }
    } catch (error) {
      console.error('Failed to get computer move:', error);
      // AI failed to generate move - save game as abandoned
      handleAIFailure();
    } finally {
      setIsComputerThinking(false);
    }
    
    return false;
  }, [gameEngine, triggerUpdate, saveGameState, currentGameMode, currentDifficulty, currentPlayerColor, isComputerThinking]);

  // Handle AI failure by saving the game as abandoned
  const handleAIFailure = useCallback(() => {
    if (!gameHasStarted || gameHasEnded) return;

    console.log('[GameHistory] Handling AI failure - saving game as abandoned');
    const saveAbandonedGame = async () => {
      if (!user?.id || !gameStartTime) {
        console.log('[GameHistory] Cannot save abandoned game - missing user ID or start time');
        return;
      }

      try {
        const gameEndTime = new Date();
        const gameDurationSeconds = Math.floor((gameEndTime.getTime() - gameStartTime.getTime()) / 1000);
        
        const gameData = {
          opponent: 'Computer',
          result: 'abandoned' as const,
          moves: gameEngine.history.map(move => move.san),
          gameMode: currentGameMode,
          difficulty: currentDifficulty,
          playerColor: currentPlayerColor === 'w' ? 'white' : 'black',
          timeControl: undefined,
          gameDurationSeconds
        };

        console.log('[GameHistory] Saving abandoned game due to AI failure:', {
          moves: gameData.moves.length,
          duration: gameData.gameDurationSeconds
        });

        const response = await fetch('/api/games/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gameData)
        });

        if (response.ok) {
          const responseData = await response.json();
          console.log('[GameHistory] Abandoned game saved successfully:', responseData);
        } else {
          const errorText = await response.text();
          console.error('[GameHistory] Failed to save abandoned game:', response.status, errorText);
        }
      } catch (error) {
        console.error('[GameHistory] Error saving abandoned game:', error);
      }
    };

    setGameHasEnded(true);
    saveAbandonedGame();
  }, [gameHasStarted, gameHasEnded, user?.id, gameStartTime, gameEngine, currentGameMode, currentDifficulty, currentPlayerColor]);

  // Auto-make computer move when player chooses black (computer plays first as white)
  useEffect(() => {
    if (currentGameMode === 'pvc' && currentPlayerColor === 'b' && gameEngine.history.length === 0) {
      // Computer should move first when player is black
      setTimeout(() => {
        makeComputerMove();
      }, 500);
    }
  }, [currentGameMode, currentPlayerColor, makeComputerMove]);

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
      
      // Move evaluation is now handled by Stockfish analysis automatically
      
      // Trigger computer move after player move in PvC mode
      if (currentGameMode === 'pvc') {
        setTimeout(() => {
          makeComputerMove();
        }, 800); // Small delay for better UX
      }
    }
    return success;
  }, [gameEngine, triggerUpdate, saveGameState, currentGameMode, currentPlayerColor, isComputerThinking]);

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
    // Reset game tracking state for new game
    setGameStartTime(null);
    setGameHasStarted(false);
    setGameHasEnded(false);
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
    cancelPromotion,
    // Manual game saving function for debugging
    saveGameManually: () => {
      if (gameHasStarted && !gameHasEnded && gameEngine.history.length > 0) {
        console.log('[GameHistory] Manual save triggered');
        handleAIFailure(); // Use the abandonment logic for manual saves
      }
    }
  };
}
