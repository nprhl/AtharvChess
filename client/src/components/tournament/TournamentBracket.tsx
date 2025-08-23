import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, User, Clock } from "lucide-react";

interface Round {
  id: number;
  roundNumber: number;
  name: string;
  status: string;
  gamesCount: number;
  completedGames: number;
}

interface TournamentBracketProps {
  tournamentId: number;
  format: string;
  rounds: Round[];
}

interface BracketGame {
  id: number;
  whitePlayer: string;
  blackPlayer: string;
  result?: string;
  status: string;
  boardNumber: number;
}

export function TournamentBracket({ tournamentId, format, rounds }: TournamentBracketProps) {
  // Fetch pairings for each round
  const { data: allPairings } = useQuery({
    queryKey: ['/api/tournaments', tournamentId, 'all-pairings'],
    queryFn: async () => {
      const pairings = await Promise.all(
        rounds.map(async (round) => {
          const response = await fetch(`/api/rounds/${round.id}`);
          if (response.ok) {
            const data = await response.json();
            return { roundId: round.id, roundNumber: round.roundNumber, pairings: data.pairings || [] };
          }
          return { roundId: round.id, roundNumber: round.roundNumber, pairings: [] };
        })
      );
      return pairings;
    },
    enabled: rounds.length > 0,
  });

  if (format === 'single_elimination' || format === 'double_elimination') {
    return <EliminationBracket rounds={rounds} pairings={allPairings || []} />;
  }

  if (format === 'swiss') {
    return <SwissBracket rounds={rounds} pairings={allPairings || []} />;
  }

  if (format === 'round_robin') {
    return <RoundRobinBracket rounds={rounds} pairings={allPairings || []} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tournament Bracket</CardTitle>
        <CardDescription>Bracket view not available for this format</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">This tournament format doesn't support bracket visualization.</p>
      </CardContent>
    </Card>
  );
}

function EliminationBracket({ rounds, pairings }: { rounds: Round[]; pairings: any[] }) {
  const sortedRounds = rounds.sort((a, b) => a.roundNumber - b.roundNumber);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Elimination Bracket
          </CardTitle>
          <CardDescription>Single elimination tournament bracket</CardDescription>
        </CardHeader>
      </Card>

      <div className="overflow-x-auto">
        <div className="flex gap-8 min-w-max p-4">
          {sortedRounds.map((round, roundIndex) => {
            const roundPairings = pairings.find(p => p.roundNumber === round.roundNumber)?.pairings || [];
            
            return (
              <div key={round.id} className="flex flex-col gap-4 min-w-64">
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{round.name}</h3>
                  <Badge variant={round.status === 'completed' ? 'default' : 'secondary'}>
                    {round.status}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {roundPairings.map((pairing: any, index: number) => (
                    <BracketGame
                      key={pairing.id}
                      game={pairing}
                      roundIndex={roundIndex}
                      gameIndex={index}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SwissBracket({ rounds, pairings }: { rounds: Round[]; pairings: any[] }) {
  const sortedRounds = rounds.sort((a, b) => a.roundNumber - b.roundNumber);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Swiss System Rounds
          </CardTitle>
          <CardDescription>Round-by-round pairings and results</CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-6">
        {sortedRounds.map((round) => {
          const roundPairings = pairings.find(p => p.roundNumber === round.roundNumber)?.pairings || [];
          
          return (
            <Card key={round.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{round.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={round.status === 'completed' ? 'default' : 'secondary'}>
                      {round.status}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {round.completedGames}/{round.gamesCount} games completed
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {roundPairings.map((pairing: any) => (
                    <SwissGame key={pairing.id} game={pairing} />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function RoundRobinBracket({ rounds, pairings }: { rounds: Round[]; pairings: any[] }) {
  return <SwissBracket rounds={rounds} pairings={pairings} />;
}

function BracketGame({ game, roundIndex, gameIndex }: { game: any; roundIndex: number; gameIndex: number }) {
  const getResultDisplay = (result: string, isWhite: boolean) => {
    if (!result) return '';
    if (result === '1/2-1/2') return '½';
    if (result === '1-0') return isWhite ? '1' : '0';
    if (result === '0-1') return isWhite ? '0' : '1';
    return '';
  };

  return (
    <Card className="border-2 border-gray-200 hover:border-gray-300 transition-colors">
      <CardContent className="p-4">
        <div className="text-xs text-gray-500 mb-2">Board {game.boardNumber}</div>
        
        <div className="space-y-2">
          {/* White Player */}
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="font-medium">{game.whitePlayerName || 'TBD'}</span>
              <span className="text-xs text-gray-600">({game.whitePlayerElo})</span>
            </div>
            <div className="font-bold text-lg">
              {getResultDisplay(game.gameResult, true)}
            </div>
          </div>
          
          {/* Black Player */}
          <div className="flex items-center justify-between p-2 bg-gray-900 text-white rounded">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="font-medium">{game.blackPlayerName || 'TBD'}</span>
              <span className="text-xs text-gray-300">({game.blackPlayerElo})</span>
            </div>
            <div className="font-bold text-lg">
              {getResultDisplay(game.gameResult, false)}
            </div>
          </div>
        </div>
        
        {game.gameStatus && (
          <div className="mt-2 text-center">
            <Badge variant={game.gameStatus === 'completed' ? 'default' : 'secondary'} className="text-xs">
              {game.gameStatus}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SwissGame({ game }: { game: any }) {
  const getResultIcon = (result: string) => {
    if (!result) return <Clock className="w-4 h-4 text-gray-400" />;
    if (result === '1/2-1/2') return <span className="font-bold text-yellow-600">½-½</span>;
    if (result === '1-0') return <span className="font-bold text-green-600">1-0</span>;
    if (result === '0-1') return <span className="font-bold text-red-600">0-1</span>;
    return null;
  };

  return (
    <Card className="border hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">Board {game.boardNumber}</span>
          {getResultIcon(game.gameResult)}
        </div>
        
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{game.whitePlayerName || 'TBD'}</span>
            <span className="text-xs text-gray-600">({game.whitePlayerElo})</span>
          </div>
          <div className="text-center text-xs text-gray-500">vs</div>
          <div className="flex items-center justify-between">
            <span className="font-medium">{game.blackPlayerName || 'TBD'}</span>
            <span className="text-xs text-gray-600">({game.blackPlayerElo})</span>
          </div>
        </div>
        
        {game.gameStatus && (
          <div className="mt-2">
            <Badge variant={game.gameStatus === 'completed' ? 'default' : 'secondary'} className="text-xs w-full justify-center">
              {game.gameStatus}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}