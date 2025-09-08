import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Trophy, User, Download } from 'lucide-react';

interface Game {
  id: number;
  opponent: string;
  result: 'win' | 'loss' | 'draw' | 'abandoned';
  moves: string[];
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

interface GameHistoryResponse {
  games: Game[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function GameHistoryPage() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    result: 'all',
    gameMode: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const { data: gameHistory, isLoading, error } = useQuery<GameHistoryResponse>({
    queryKey: ['/api/games/history', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value.toString());
      });
      
      const response = await fetch(`/api/games/history?${params}`);
      if (!response.ok) throw new Error('Failed to fetch game history');
      return response.json();
    }
  });

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

  const downloadPGN = async (gameId: number) => {
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">Loading your game history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center text-red-500">
          Error loading game history. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Game History</h1>
        <p className="text-muted-foreground">
          Review and analyze your past games
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filter Games</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select 
              value={filters.result} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, result: value === 'all' ? '' : value, page: 1 }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Results" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="win">Wins</SelectItem>
                <SelectItem value="loss">Losses</SelectItem>
                <SelectItem value="draw">Draws</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.gameMode} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, gameMode: value === 'all' ? '' : value, page: 1 }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Modes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="pvc">vs Computer</SelectItem>
                <SelectItem value="pvp">vs Player</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="From Date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value, page: 1 }))}
            />

            <Input
              type="date"
              placeholder="To Date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value, page: 1 }))}
            />
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              onClick={() => setFilters({
                page: 1, limit: 20, result: 'all', gameMode: 'all', dateFrom: '', dateTo: ''
              })}
            >
              Clear Filters
            </Button>
            
            {gameHistory && (
              <span className="text-sm text-muted-foreground">
                {gameHistory.pagination.total} games found
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Game List */}
      <div className="space-y-4">
        {gameHistory?.games.map((game) => (
          <Card key={game.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={`${getResultColor(game.result)} text-white`}>
                      {getResultIcon(game.result)} {game.result.toUpperCase()}
                    </Badge>
                    
                    {game.gameMode === 'pvc' ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User size={14} />
                        vs Computer ({game.difficulty || 'Unknown'})
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User size={14} />
                        vs {game.opponent || 'Player'}
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Trophy size={14} />
                      {game.playerColor === 'white' ? 'White' : 'Black'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <div className="text-sm font-medium">Opening</div>
                      <div className="text-sm text-muted-foreground">
                        {game.openingName || 'Unknown'} 
                        {game.openingEco && ` (${game.openingEco})`}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium">Duration</div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock size={12} />
                        {formatDuration(game.gameDuration)} • {game.totalMoves} moves
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium">Date</div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar size={12} />
                        {formatDate(game.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/games/${game.id}/replay`}>
                      <Button size="sm" variant="outline">
                        Replay Game
                      </Button>
                    </Link>
                    
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => downloadPGN(game.id)}
                    >
                      <Download size={14} className="mr-1" />
                      PGN
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {gameHistory?.games.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground mb-4">
                No games found matching your filters.
              </div>
              <Link href="/">
                <Button>Play Your First Game</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {gameHistory && gameHistory.pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <Button
            variant="outline"
            disabled={gameHistory.pagination.page === 1}
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </Button>

          <span className="text-sm text-muted-foreground px-4">
            Page {gameHistory.pagination.page} of {gameHistory.pagination.totalPages}
          </span>

          <Button
            variant="outline"
            disabled={gameHistory.pagination.page === gameHistory.pagination.totalPages}
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}