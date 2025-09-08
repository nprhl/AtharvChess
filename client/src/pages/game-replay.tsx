import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import ChessBoard from '@/components/chess-board';
import { ChessGameEngine } from '@/lib/chess-game';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  RotateCw, 
  Download,
  ArrowLeft,
  Calendar,
  Clock,
  Trophy,
  User
} from 'lucide-react';
import { Link } from 'wouter';
import type { Square } from 'chess.js';

interface GameData {
  id: number;
  opponent: string;
  result: 'win' | 'loss' | 'draw' | 'abandoned';
  moves: string[];
  pgn: string;
  startingFen: string;
  finalFen: string;
  openingName?: string;
  openingEco?: string;
  totalMoves: number;
  gameMode: string;
  difficulty?: string;
  playerColor: string;
  timeControl?: string;
  gameDuration?: number;
  createdAt: string;
}

export default function GameReplayPage() {
  const params = useParams();
  const gameId = params.id ? parseInt(params.id) : null;

  const [gameEngine, setGameEngine] = useState<ChessGameEngine | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(1000); // ms between moves
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  const { data: gameData, isLoading, error } = useQuery<GameData>({
    queryKey: ['/api/games', gameId, 'replay'],
    queryFn: async () => {
      const response = await fetch(`/api/games/${gameId}/replay`);
      if (!response.ok) throw new Error('Failed to fetch game data');
      return response.json();
    },
    enabled: !!gameId
  });

  // Initialize game engine when data loads
  useEffect(() => {
    if (gameData && gameData.moves.length > 0) {
      const engine = new ChessGameEngine(gameData.startingFen);
      setGameEngine(engine);
      setCurrentMoveIndex(0);
      
      // Set board orientation based on player color
      setBoardFlipped(gameData.playerColor === 'black');
    }
  }, [gameData]);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || !gameData || currentMoveIndex >= gameData.moves.length) {
      return;
    }

    const timer = setTimeout(() => {
      goToMove(currentMoveIndex + 1);
    }, autoPlaySpeed);

    return () => clearTimeout(timer);
  }, [isAutoPlaying, currentMoveIndex, autoPlaySpeed, gameData]);

  // Stop auto-play when reaching the end
  useEffect(() => {
    if (gameData && currentMoveIndex >= gameData.moves.length) {
      setIsAutoPlaying(false);
    }
  }, [currentMoveIndex, gameData]);

  const goToMove = (moveIndex: number) => {
    if (!gameData || !gameEngine) return;

    const targetIndex = Math.max(0, Math.min(moveIndex, gameData.moves.length));
    
    // Reset game to starting position
    gameEngine.reset();
    if (gameData.startingFen !== "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1") {
      gameEngine.loadGame(gameData.startingFen);
    }

    // Play moves up to target index
    let lastMoveObj = null;
    for (let i = 0; i < targetIndex; i++) {
      const moveStr = gameData.moves[i];
      try {
        const move = gameEngine.game.move(moveStr);
        if (move && i === targetIndex - 1) {
          // Store the last move for highlighting
          lastMoveObj = { from: move.from as Square, to: move.to as Square };
        }
      } catch (error) {
        console.error('Error playing move:', moveStr, error);
        break;
      }
    }
    
    setCurrentMoveIndex(targetIndex);
    setLastMove(lastMoveObj);
  };

  const toggleAutoPlay = () => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
    } else {
      // Don't start auto-play if we're at the end
      if (gameData && currentMoveIndex >= gameData.moves.length) {
        goToMove(0); // Reset to beginning
      }
      setIsAutoPlaying(true);
    }
  };

  const downloadPGN = async () => {
    if (!gameId) return;
    
    try {
      const response = await fetch(`/api/games/${gameId}/pgn`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `game-${gameId}.pgn`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PGN:', error);
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'bg-green-500';
      case 'loss': return 'bg-red-500';
      case 'draw': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'win': return '✓';
      case 'loss': return '✗';
      case 'draw': return '=';
      default: return '?';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCurrentMove = () => {
    if (!gameData || currentMoveIndex === 0) return null;
    return gameData.moves[currentMoveIndex - 1];
  };

  const getMoveNumber = () => {
    if (currentMoveIndex === 0) return 'Start';
    const moveNum = Math.floor((currentMoveIndex - 1) / 2) + 1;
    const isWhite = (currentMoveIndex - 1) % 2 === 0;
    return `${moveNum}${isWhite ? '.' : '...'}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center">Loading game...</div>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center text-red-500 mb-4">
          Error loading game. Please try again later.
        </div>
        <div className="text-center">
          <Link href="/games/history">
            <Button>Back to Game History</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!gameEngine) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center">Initializing game engine...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/games/history">
            <Button variant="outline" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              Back to History
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Game Replay</h1>
        </div>
        
        <Button variant="outline" onClick={downloadPGN}>
          <Download size={16} className="mr-2" />
          Download PGN
        </Button>
      </div>

      {/* Game Info */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <Badge className={`${getResultColor(gameData.result)} text-white`}>
                {getResultIcon(gameData.result)} {gameData.result.toUpperCase()}
              </Badge>
              
              {gameData.gameMode === 'pvc' ? (
                <span className="text-lg">vs Computer ({gameData.difficulty})</span>
              ) : (
                <span className="text-lg">vs {gameData.opponent}</span>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm font-medium">Opening</div>
              <div className="text-sm text-muted-foreground">
                {gameData.openingName || 'Unknown'} 
                {gameData.openingEco && ` (${gameData.openingEco})`}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium">Duration & Moves</div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock size={12} />
                {formatDuration(gameData.gameDuration)} • {gameData.totalMoves} moves
              </div>
            </div>

            <div>
              <div className="text-sm font-medium">Player Color</div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Trophy size={12} />
                {gameData.playerColor === 'white' ? 'White' : 'Black'}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium">Date Played</div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar size={12} />
                {formatDate(gameData.createdAt)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chess Board */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {getMoveNumber()} {getCurrentMove() || ''}
                </CardTitle>
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={() => setBoardFlipped(!boardFlipped)}
                >
                  <RotateCcw size={16} />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className={`${boardFlipped ? 'rotate-180' : ''}`}>
                <ChessBoard
                  game={gameEngine.game}
                  onMove={() => false} // Disable moves in replay mode
                  getValidMoves={() => []} // No valid moves in replay mode
                  lastMove={lastMove}
                  disabled={true}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="space-y-6">
          {/* Playback Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Playback Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Move Slider */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Move: {currentMoveIndex} of {gameData.moves.length}
                </label>
                <Slider
                  value={[currentMoveIndex]}
                  onValueChange={(value) => goToMove(value[0])}
                  max={gameData.moves.length}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Control Buttons */}
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToMove(0)}
                  disabled={currentMoveIndex === 0}
                >
                  <SkipBack size={16} />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToMove(currentMoveIndex - 1)}
                  disabled={currentMoveIndex === 0}
                >
                  <RotateCcw size={16} />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToMove(currentMoveIndex + 1)}
                  disabled={currentMoveIndex >= gameData.moves.length}
                >
                  <RotateCw size={16} />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToMove(gameData.moves.length)}
                  disabled={currentMoveIndex >= gameData.moves.length}
                >
                  <SkipForward size={16} />
                </Button>
              </div>

              {/* Auto-play */}
              <div className="space-y-2">
                <Button
                  onClick={toggleAutoPlay}
                  className="w-full"
                  disabled={currentMoveIndex >= gameData.moves.length && !isAutoPlaying}
                >
                  {isAutoPlaying ? (
                    <>
                      <Pause size={16} className="mr-2" />
                      Pause Auto-play
                    </>
                  ) : (
                    <>
                      <Play size={16} className="mr-2" />
                      Auto-play
                    </>
                  )}
                </Button>

                {/* Speed Control */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Speed: {(1000 / autoPlaySpeed).toFixed(1)}x
                  </label>
                  <Slider
                    value={[autoPlaySpeed]}
                    onValueChange={(value) => setAutoPlaySpeed(value[0])}
                    max={2000}
                    min={250}
                    step={250}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Move List */}
          <Card>
            <CardHeader>
              <CardTitle>Move History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {gameData.moves.map((move, index) => {
                  const moveNumber = Math.floor(index / 2) + 1;
                  const isWhite = index % 2 === 0;
                  const isCurrentMove = index === currentMoveIndex - 1;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => goToMove(index + 1)}
                      className={`text-left w-full px-2 py-1 rounded text-sm hover:bg-muted transition-colors ${
                        isCurrentMove ? 'bg-blue-100 dark:bg-blue-900' : ''
                      }`}
                    >
                      <span className="font-mono">
                        {isWhite ? `${moveNumber}.` : `${moveNumber}...`} {move}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}